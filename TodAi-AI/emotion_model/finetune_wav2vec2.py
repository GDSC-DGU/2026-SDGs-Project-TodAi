"""음성 감정 인식 파인튜닝 (kresnik/wav2vec2-large-xlsr-korean → 6-class).

학습 데이터: AI Hub 한국어 감정 음성 (60대+ 화자 중심). STT(방언) 데이터와는 별개 코퍼스로,
EMO_DATA_ROOT 아래 processed/ CSV(utterance 인덱스 + 감정 라벨)를 가정한다.

검증: SVM 베이스라인(GroupKFold 0.4146)과 동일하게 train 코퍼스 안에서 화자 분리
(GroupShuffleSplit) 홀드아웃으로 평가 → 화자 누수 없는 6-class macro F1 직접 비교.
외부 val 세트는 분포가 달라(OOD) 모델 선택엔 쓰지 않고 마지막 참고 평가로만 사용.

최종 모델은 HF Hub(HyukII/todai-emotion-wav2vec2)에 업로드된다 (upload_to_hf.py).
"""
import os, random
from tqdm import tqdm
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from torch.optim import AdamW
from torch.amp import GradScaler, autocast
import pandas as pd
# pandas 3.0은 문자열 컬럼을 PyArrow 백엔드로 기본 처리하는데,
# 일부 pyarrow 빌드가 read_csv 중 native access violation(exit 139)으로 죽는다.
# 순수 파이썬 문자열 저장으로 강제해 pyarrow 경로를 우회한다.
pd.set_option("mode.string_storage", "python")
import soundfile as sf
import resampy
from transformers import (
    Wav2Vec2FeatureExtractor,
    Wav2Vec2ForSequenceClassification,
    get_linear_schedule_with_warmup,
)
from sklearn.metrics import classification_report, f1_score, confusion_matrix
from sklearn.model_selection import GroupShuffleSplit
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns

# 감정 코퍼스/출력 경로 (환경변수로 재정의 가능)
EMO_DATA_ROOT = os.environ.get("EMO_DATA_ROOT", "data/emotion")
TRAIN_CSV     = os.path.join(EMO_DATA_ROOT, "processed", "train_selected.csv")
VAL_CSV       = os.path.join(EMO_DATA_ROOT, "processed", "val_utterances.csv")
OUT_DIR       = os.environ.get("EMO_OUT_DIR", "outputs/wav2vec2")
os.makedirs(OUT_DIR, exist_ok=True)

MODEL_NAME   = "kresnik/wav2vec2-large-xlsr-korean"
SR           = 16000
MAX_SEC      = 8
MAX_SAMPLES  = MAX_SEC * SR
BATCH_SIZE   = 8
GRAD_ACCUM   = 4
NUM_EPOCHS   = 10
LR           = 1e-4
WARMUP_RATIO = 0.1
RANDOM_SEED  = 42

LABEL_MAP_KO   = {"기쁨":"Joy","놀라움":"Surprise","두려움":"Fear",
                  "사랑스러움":"Lovely","슬픔":"Sadness","화남":"Anger"}
TRAIN_EMOTIONS = ["기쁨","놀라움","두려움","사랑스러움","슬픔","화남"]
VAL_EMOTIONS   = ["기쁨","놀라움","사랑스러움","슬픔","화남"]
LABEL2ID = {e:i for i,e in enumerate(TRAIN_EMOTIONS)}
ID2LABEL = {i:e for e,i in LABEL2ID.items()}

def set_seed(s):
    random.seed(s); np.random.seed(s)
    torch.manual_seed(s); torch.cuda.manual_seed_all(s)

set_seed(RANDOM_SEED)
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Device: {DEVICE}", flush=True)

def load_filtered_df(csv_path, exclude_emotions=None, max_per_class=None, min_dur=0.5):
    """CSV 로드 + '없음' 제외 + 감정 제외 + 길이 필터 (+ 클래스별 샘플링)."""
    df = pd.read_csv(csv_path)
    df = df[df["emotion"] != "없음"].reset_index(drop=True)
    if exclude_emotions:
        df = df[~df["emotion"].isin(exclude_emotions)].reset_index(drop=True)
    df = df[(df["duration"] >= min_dur) &
            (df["duration"] <= MAX_SEC)].reset_index(drop=True)
    if max_per_class:
        # pandas 3.0의 groupby.apply는 그룹핑 컬럼(emotion)을 결과에서
        # 누락시키므로, 그룹별 샘플링을 명시적으로 수행한다.
        parts = [g.sample(min(len(g), max_per_class), random_state=42)
                 for _, g in df.groupby("emotion")]
        df = pd.concat(parts).reset_index(drop=True)
    return df

class EmotionDataset(Dataset):
    def __init__(self, df, name=""):
        self.df = df.reset_index(drop=True)
        print(f"  [{name}] {len(self.df)}개 / "
              f"{self.df['emotion'].value_counts().to_dict()}", flush=True)

    def __len__(self):
        return len(self.df)

    def __getitem__(self, idx):
        row = self.df.iloc[idx]
        info     = sf.info(row["wav_path"])
        file_sr  = info.samplerate
        start_fr = int(row["start"] * file_sr)
        end_fr   = int(min(row["end"], row["start"] + MAX_SEC) * file_sr)
        audio, _ = sf.read(row["wav_path"], start=start_fr,
                           frames=end_fr - start_fr,
                           dtype="float32", always_2d=False)
        if audio.ndim == 2:
            audio = audio.mean(axis=1)
        if file_sr != SR:
            audio = resampy.resample(audio, file_sr, SR)
        if len(audio) > MAX_SAMPLES:
            audio = audio[:MAX_SAMPLES]
        # 라벨 start 시각이 실제 wav 길이를 넘어가면 sf.read가 빈/극단적으로 짧은
        # 배열을 반환한다. 이 경우 FeatureExtractor 정규화에서 length==0 →
        # mean/var of empty slice → nan 이 발생해 배치를 오염시킨다.
        # 최소 0.1초 길이를 보장해 nan을 차단한다.
        min_len = SR // 10
        if len(audio) < min_len:
            audio = np.pad(audio, (0, min_len - len(audio)))
        return {"audio": audio.astype(np.float32),
                "label": LABEL2ID[row["emotion"]]}

print("\ntrain 코퍼스 로드 + 화자 분리 홀드아웃 분할 중...", flush=True)
full_df = load_filtered_df(TRAIN_CSV)   # 6-class, 이미 균형 다운샘플된 train

gss = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=RANDOM_SEED)
tr_idx, ho_idx = next(gss.split(full_df, groups=full_df["speaker_id"]))
train_df   = full_df.iloc[tr_idx]
holdout_df = full_df.iloc[ho_idx]

# 화자 누수 검증
tr_spk, ho_spk = set(train_df["speaker_id"]), set(holdout_df["speaker_id"])
assert tr_spk.isdisjoint(ho_spk), "화자 누수 발생!"
print(f"  화자 분리: train {len(tr_spk)}명 / holdout {len(ho_spk)}명 (겹침 0 확인)", flush=True)

train_ds = EmotionDataset(train_df,   name="train")
val_ds   = EmotionDataset(holdout_df, name="holdout(화자분리)")

# 외부 val (OOD 참고용, 5-class)
ext_df  = load_filtered_df(VAL_CSV, exclude_emotions={"두려움"}, max_per_class=1000)
val_ext_ds = EmotionDataset(ext_df, name="external-val(OOD)")
print(f"train: {len(train_ds)} / holdout: {len(val_ds)} / ext-val: {len(val_ext_ds)}", flush=True)

print(f"\nFeatureExtractor 로드 중...", flush=True)
feature_extractor = Wav2Vec2FeatureExtractor.from_pretrained(MODEL_NAME)

def make_collate_fn(fe):
    def collate_fn(batch):
        audios = [b["audio"] for b in batch]
        labels = torch.tensor([b["label"] for b in batch], dtype=torch.long)
        inp = fe(audios, sampling_rate=SR, return_tensors="pt",
                 padding=True, return_attention_mask=True)
        return {"input_values": inp["input_values"],
                "attention_mask": inp["attention_mask"],
                "labels": labels}
    return collate_fn

collate_fn = make_collate_fn(feature_extractor)
train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True,
                          collate_fn=collate_fn, num_workers=0, pin_memory=True)
val_loader   = DataLoader(val_ds,   batch_size=BATCH_SIZE, shuffle=False,
                          collate_fn=collate_fn, num_workers=0, pin_memory=True)
val_ext_loader = DataLoader(val_ext_ds, batch_size=BATCH_SIZE, shuffle=False,
                            collate_fn=collate_fn, num_workers=0, pin_memory=True)

print(f"\n모델 로드 중...", flush=True)
model = Wav2Vec2ForSequenceClassification.from_pretrained(
    MODEL_NAME, num_labels=len(TRAIN_EMOTIONS),
    label2id=LABEL2ID, id2label=ID2LABEL,
    ignore_mismatched_sizes=True)
# CNN feature encoder를 동결한다. wav2vec2 다운스트림의 표준이며,
# 사전학습된 음향 표현을 보존하고 학습을 안정화한다.
model.freeze_feature_encoder()
model = model.to(DEVICE)
n_train = sum(p.numel() for p in model.parameters() if p.requires_grad)
print(f"파라미터: {sum(p.numel() for p in model.parameters())/1e6:.1f}M "
      f"(학습 대상 {n_train/1e6:.1f}M)", flush=True)

optimizer    = AdamW(model.parameters(), lr=LR, weight_decay=0.01)
total_steps  = (len(train_loader) // GRAD_ACCUM) * NUM_EPOCHS
warmup_steps = int(total_steps * WARMUP_RATIO)
scheduler    = get_linear_schedule_with_warmup(optimizer, warmup_steps, total_steps)
scaler       = GradScaler(device="cuda")
print(f"총 스텝: {total_steps} / 워밍업: {warmup_steps}", flush=True)

def train_epoch(model, loader, optimizer, scheduler, scaler, epoch):
    model.train()
    total_loss, n_correct, n_total = 0.0, 0, 0
    optimizer.zero_grad()
    pbar = tqdm(loader, desc=f"Train Ep{epoch}", ncols=100, leave=True)
    for step, batch in enumerate(pbar):
        iv  = batch["input_values"].to(DEVICE)
        am  = batch["attention_mask"].to(DEVICE)
        lbl = batch["labels"].to(DEVICE)
        with autocast(device_type="cuda"):
            out  = model(input_values=iv, attention_mask=am, labels=lbl)
            loss = out.loss / GRAD_ACCUM
        scaler.scale(loss).backward()
        if (step + 1) % GRAD_ACCUM == 0:
            scaler.unscale_(optimizer)
            nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            scaler.step(optimizer); scaler.update()
            scheduler.step(); optimizer.zero_grad()
        total_loss += out.loss.item()
        n_correct  += (out.logits.argmax(-1) == lbl).sum().item()
        n_total    += lbl.size(0)
        pbar.set_postfix(loss=f"{total_loss/(step+1):.4f}",
                         acc=f"{n_correct/n_total:.4f}",
                         lr=f"{scheduler.get_last_lr()[0]:.1e}")
    return total_loss / len(loader), n_correct / n_total

def eval_epoch(model, loader, eval_emotions, desc="Eval"):
    model.eval()
    total_loss, all_preds, all_labels = 0.0, [], []
    with torch.no_grad():
        for batch in tqdm(loader, desc=desc, ncols=100, leave=True):
            iv  = batch["input_values"].to(DEVICE)
            am  = batch["attention_mask"].to(DEVICE)
            lbl = batch["labels"].to(DEVICE)
            with autocast(device_type="cuda"):
                out = model(input_values=iv, attention_mask=am, labels=lbl)
            total_loss += out.loss.item()
            all_preds.extend(out.logits.argmax(-1).cpu().numpy())
            all_labels.extend(lbl.cpu().numpy())
    ids = [LABEL2ID[e] for e in eval_emotions]
    f1 = f1_score(all_labels, all_preds,
                  labels=ids, average="macro", zero_division=0)
    return total_loss / len(loader), f1, all_preds, all_labels

print("\n" + "="*60 + "\n학습 시작\n" + "="*60, flush=True)
best_f1, best_epoch = 0.0, 0
history = {"train_loss":[], "val_loss":[], "val_f1":[]}

for epoch in range(1, NUM_EPOCHS + 1):
    print(f"\n[Epoch {epoch}/{NUM_EPOCHS}]", flush=True)
    tr_loss, tr_acc = train_epoch(model, train_loader, optimizer,
                                  scheduler, scaler, epoch)
    # 모델 선택은 화자 분리 홀드아웃(6-class)으로 — SVM 0.4146과 동일 잣대
    val_loss, val_f1, _, _ = eval_epoch(model, val_loader, TRAIN_EMOTIONS, desc="Holdout")
    history["train_loss"].append(tr_loss)
    history["val_loss"].append(val_loss)
    history["val_f1"].append(val_f1)
    print(f"  train         loss={tr_loss:.4f} acc={tr_acc:.4f}", flush=True)
    print(f"  holdout(6cls) loss={val_loss:.4f} f1={val_f1:.4f}  (vs SVM 0.4146)", flush=True)
    if val_f1 > best_f1:
        best_f1, best_epoch = val_f1, epoch
        model.save_pretrained(os.path.join(OUT_DIR, "best_model"))
        feature_extractor.save_pretrained(os.path.join(OUT_DIR, "best_model"))
        print(f"  ★ Best model 저장 (holdout F1={best_f1:.4f})", flush=True)

print(f"\n학습 완료. Best F1={best_f1:.4f} @ Epoch {best_epoch}", flush=True)

print("\nBest model 로드...", flush=True)
best_model = Wav2Vec2ForSequenceClassification.from_pretrained(
    os.path.join(OUT_DIR, "best_model")).to(DEVICE)

# ── (1) 화자 분리 홀드아웃 6-class — SVM 0.4146과 직접 비교 ──
print("\n[최종 평가 1] 화자 분리 홀드아웃 (6-class, vs SVM 0.4146)", flush=True)
_, ho_f1, ho_preds, ho_labels = eval_epoch(best_model, val_loader, TRAIN_EMOTIONS, desc="Holdout")
ho_ids   = [LABEL2ID[e] for e in TRAIN_EMOTIONS]
ho_names = [LABEL_MAP_KO[e] for e in TRAIN_EMOTIONS]
ho_report = classification_report(ho_labels, ho_preds, labels=ho_ids,
                                  target_names=ho_names, digits=4, zero_division=0)
print(ho_report)
print(f"holdout macro F1 (6-class) = {ho_f1:.4f}   |  SVM GroupKFold = 0.4146", flush=True)

# ── (2) 외부 val 5-class — OOD 참고용 ──
print("\n[최종 평가 2] 외부 val (5-class, OOD 참고용)", flush=True)
_, ext_f1, ext_preds, ext_labels = eval_epoch(best_model, val_ext_loader, VAL_EMOTIONS, desc="ExtVal")
ext_ids   = [LABEL2ID[e] for e in VAL_EMOTIONS]
ext_names = [LABEL_MAP_KO[e] for e in VAL_EMOTIONS]
ext_report = classification_report(ext_labels, ext_preds, labels=ext_ids,
                                   target_names=ext_names, digits=4, zero_division=0)
print(ext_report)
print(f"external-val macro F1 (5-class) = {ext_f1:.4f}   |  SVM@val = 0.1631", flush=True)

with open(os.path.join(OUT_DIR, "classification_report.txt"), "w", encoding="utf-8") as f:
    f.write("=== 화자 분리 홀드아웃 (6-class, vs SVM GroupKFold 0.4146) ===\n")
    f.write(ho_report); f.write(f"\nholdout macro F1 = {ho_f1:.4f}\n\n")
    f.write("=== 외부 val (5-class, OOD 참고용, vs SVM@val 0.1631) ===\n")
    f.write(ext_report); f.write(f"\nexternal-val macro F1 = {ext_f1:.4f}\n")

# 혼동행렬: 주 평가인 홀드아웃(6-class) 기준
cm      = confusion_matrix(ho_labels, ho_preds, labels=ho_ids)
cm_norm = cm.astype(float) / np.clip(cm.sum(axis=1, keepdims=True), 1, None)
fig, axes = plt.subplots(1, 2, figsize=(15, 6))
sns.heatmap(cm,      annot=True, fmt="d",   cmap="Blues",
            xticklabels=ho_names, yticklabels=ho_names, ax=axes[0])
axes[0].set_title("Holdout Confusion (Count)")
axes[0].set_xlabel("Predicted"); axes[0].set_ylabel("Actual")
sns.heatmap(cm_norm, annot=True, fmt=".2f", cmap="Blues",
            xticklabels=ho_names, yticklabels=ho_names, vmin=0, vmax=1, ax=axes[1])
axes[1].set_title("Holdout Confusion (Rate)")
axes[1].set_xlabel("Predicted"); axes[1].set_ylabel("Actual")
plt.suptitle(f"Wav2Vec2 — speaker-disjoint holdout, Epoch {best_epoch} "
             f"(F1={ho_f1:.4f} vs SVM 0.4146)")
plt.tight_layout()
plt.savefig(os.path.join(OUT_DIR, "confusion_matrix.png"), dpi=150, bbox_inches="tight")

fig, axes = plt.subplots(1, 2, figsize=(12, 4))
axes[0].plot(history["train_loss"], label="train")
axes[0].plot(history["val_loss"],   label="holdout")
axes[0].set_title("Loss"); axes[0].legend()
axes[1].plot(history["val_f1"], marker="o", label="holdout(6cls)")
axes[1].axhline(0.4146, color="red", linestyle="--", label="SVM GroupKFold")
axes[1].set_title("Holdout Macro F1"); axes[1].legend()
plt.tight_layout()
plt.savefig(os.path.join(OUT_DIR, "learning_curve.png"), dpi=150, bbox_inches="tight")
print(f"\n결과 저장: {OUT_DIR}", flush=True)
