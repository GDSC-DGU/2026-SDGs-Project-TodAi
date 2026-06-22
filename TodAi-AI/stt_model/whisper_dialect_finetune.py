"""
Whisper Korean dialect fine-tuning (speech -> dialect text).

Subcommands:
  train       Fine-tune Whisper-large-v3-turbo on dialect ASR with LoRA + 8bit.
  preprocess  Split long-form audio (>30s) into <=30s chunks via VAD for inference.

Notes:
  - This script trains an ASR model that transcribes dialect speech into dialect text.
    The dialect-text -> standard-text normalization step is intentionally out of scope.
  - Training data must be utterance-level (<=30s per sample). Samples >30s are filtered.
    For long recordings with paired transcripts, run forced alignment beforehand to
    produce utterance-level segments.
"""

from __future__ import annotations

import argparse
import dataclasses
import json
import logging
import math
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

import numpy as np
import torch

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("whisper_dialect")


# --------------------------------------------------------------------------- #
# Configuration
# --------------------------------------------------------------------------- #


@dataclass
class Cfg:
    # Model
    model_name: str = "openai/whisper-large-v3-turbo"  # MIT license, open source
    language: str = "korean"
    task: str = "transcribe"

    # Data
    train_files: List[str] = field(default_factory=list)  # csv/jsonl with audio/transcription
    eval_files: List[str] = field(default_factory=list)
    audio_column: str = "audio"
    text_column: str = "standard"
    sampling_rate: int = 16000
    max_duration_s: float = 30.0
    min_duration_s: float = 0.1
    max_label_length: int = 448  # Whisper hard limit

    # LoRA
    use_lora: bool = True
    use_8bit: bool = True
    lora_r: int = 32
    lora_alpha: int = 64
    lora_dropout: float = 0.05
    lora_target_modules: List[str] = field(default_factory=lambda: ["q_proj", "v_proj"])

    # Training
    output_dir: str = "./outputs/whisper-dialect"
    num_train_epochs: float = 3.0
    max_steps: int = -1  # -1 means use num_train_epochs
    per_device_train_batch_size: int = 8
    per_device_eval_batch_size: int = 8
    gradient_accumulation_steps: int = 1
    learning_rate: float = 1e-3
    warmup_ratio: float = 0.1
    weight_decay: float = 0.0
    fp16: bool = True
    bf16: bool = False
    gradient_checkpointing: bool = True
    eval_strategy: str = "steps"
    eval_steps: int = 500
    save_strategy: str = "steps"
    save_steps: int = 500
    save_total_limit: int = 3
    logging_steps: int = 25
    predict_with_generate: bool = True
    generation_max_length: int = 225
    seed: int = 42

    # Resume
    resume: bool = False  # auto-detect latest ckpt in output_dir when True

    # Merge: after training, save standalone (adapter merged into base) weights
    save_merged: bool = True

    @classmethod
    def from_args(cls, args: argparse.Namespace) -> "Cfg":
        cfg = cls()
        for f in dataclasses.fields(cls):
            if hasattr(args, f.name) and getattr(args, f.name) is not None:
                setattr(cfg, f.name, getattr(args, f.name))
        return cfg


# --------------------------------------------------------------------------- #
# Dataset: reads audio on-the-fly, no HF datasets pre-processing overhead
# --------------------------------------------------------------------------- #


class DialectDataset(torch.utils.data.Dataset):
    """Reads JSONL manifest, decodes audio and extracts features per sample.

    Filters on load (text + manifest duration) — no separate filter step.
    Works with Seq2SeqTrainer's DataLoader (supports __len__ and __getitem__).
    """

    def __init__(self, manifest_paths: List[str], processor, cfg: "Cfg"):
        self.processor = processor
        self.cfg = cfg

        rows: list[dict] = []
        dropped = 0
        for path in manifest_paths:
            with open(path, "r", encoding="utf-8") as f:
                for line in f:
                    r = json.loads(line)
                    text = r.get(cfg.text_column, "")
                    if not text or not str(text).strip():
                        dropped += 1
                        continue
                    dur = r.get("duration")
                    if dur is not None and (dur < cfg.min_duration_s or dur > cfg.max_duration_s):
                        dropped += 1
                        continue
                    rows.append(r)
        self.rows = rows
        logger.info(
            "DialectDataset: %d valid rows (dropped %d) from %s",
            len(rows), dropped, manifest_paths,
        )

    def __len__(self) -> int:
        return len(self.rows)

    def __getitem__(self, idx: int) -> Dict[str, Any]:
        import soundfile as sf

        row = self.rows[idx]
        try:
            audio, sr = sf.read(row[self.cfg.audio_column], dtype="float32")
            if audio.ndim > 1:
                audio = audio.mean(axis=1)
        except Exception:
            audio = np.zeros(self.cfg.sampling_rate, dtype=np.float32)
            sr = self.cfg.sampling_rate

        feats = self.processor.feature_extractor(audio, sampling_rate=sr)
        labels = self.processor.tokenizer(
            str(row[self.cfg.text_column]),
            truncation=True,
            max_length=self.cfg.max_label_length,
        ).input_ids
        return {"input_features": feats.input_features[0], "labels": labels}


# --------------------------------------------------------------------------- #
# Data collator
# --------------------------------------------------------------------------- #


@dataclass
class WhisperDataCollator:
    processor: Any
    decoder_start_token_id: int

    def __call__(self, features: List[Dict[str, Any]]) -> Dict[str, torch.Tensor]:
        input_features = [{"input_features": f["input_features"]} for f in features]
        batch = self.processor.feature_extractor.pad(input_features, return_tensors="pt")

        label_features = [{"input_ids": f["labels"]} for f in features]
        labels_batch = self.processor.tokenizer.pad(label_features, return_tensors="pt")
        labels = labels_batch["input_ids"].masked_fill(
            labels_batch.attention_mask.ne(1), -100
        )
        # Whisper auto-prepends decoder_start_token_id, so strip it from labels if present
        if (labels[:, 0] == self.decoder_start_token_id).all().cpu().item():
            labels = labels[:, 1:]
        batch["labels"] = labels
        return batch


# --------------------------------------------------------------------------- #
# Metrics
# --------------------------------------------------------------------------- #


def build_metrics(processor):
    import evaluate
    cer = evaluate.load("cer")
    wer = evaluate.load("wer")

    def compute(pred):
        pred_ids = pred.predictions
        label_ids = pred.label_ids
        label_ids = np.where(label_ids != -100, label_ids, processor.tokenizer.pad_token_id)
        pred_str = processor.tokenizer.batch_decode(pred_ids, skip_special_tokens=True)
        label_str = processor.tokenizer.batch_decode(label_ids, skip_special_tokens=True)
        return {
            "cer": 100.0 * cer.compute(predictions=pred_str, references=label_str),
            "wer": 100.0 * wer.compute(predictions=pred_str, references=label_str),
        }

    return compute


# --------------------------------------------------------------------------- #
# Model setup (LoRA + 8bit)
# --------------------------------------------------------------------------- #


def build_model(cfg: Cfg):
    from transformers import WhisperForConditionalGeneration

    load_kwargs: Dict[str, Any] = {}
    if cfg.use_8bit:
        from transformers import BitsAndBytesConfig
        load_kwargs["quantization_config"] = BitsAndBytesConfig(load_in_8bit=True)
        load_kwargs["device_map"] = "auto"

    model = WhisperForConditionalGeneration.from_pretrained(cfg.model_name, **load_kwargs)
    model.config.forced_decoder_ids = None
    model.config.suppress_tokens = []
    model.generation_config.forced_decoder_ids = None
    model.generation_config.suppress_tokens = []

    if cfg.gradient_checkpointing:
        model.config.use_cache = False

    if cfg.use_lora:
        from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
        if cfg.use_8bit:
            model = prepare_model_for_kbit_training(model)
        # Note: do NOT set task_type for Whisper. PeftModelForSeq2SeqLM assumes
        # text-token inputs (input_ids); Whisper takes input_features (audio mel).
        # Letting PEFT use the generic PeftModel keeps the original forward signature.
        lora_cfg = LoraConfig(
            r=cfg.lora_r,
            lora_alpha=cfg.lora_alpha,
            target_modules=cfg.lora_target_modules,
            lora_dropout=cfg.lora_dropout,
            bias="none",
        )
        model = get_peft_model(model, lora_cfg)
        model.print_trainable_parameters()

    return model


# --------------------------------------------------------------------------- #
# Train
# --------------------------------------------------------------------------- #


def cmd_train(cfg: Cfg):
    from transformers import (
        Seq2SeqTrainer,
        Seq2SeqTrainingArguments,
        WhisperProcessor,
    )

    if not cfg.train_files:
        raise SystemExit("train: --train_files is required")

    logger.info("Loading processor: %s", cfg.model_name)
    processor = WhisperProcessor.from_pretrained(
        cfg.model_name, language=cfg.language, task=cfg.task
    )

    logger.info("Loading datasets")
    train_ds = DialectDataset(cfg.train_files, processor, cfg)
    eval_ds = DialectDataset(cfg.eval_files, processor, cfg) if cfg.eval_files else None

    logger.info("Building model")
    model = build_model(cfg)

    collator = WhisperDataCollator(
        processor=processor,
        decoder_start_token_id=model.config.decoder_start_token_id,
    )

    do_eval = eval_ds is not None
    training_args = Seq2SeqTrainingArguments(
        output_dir=cfg.output_dir,
        max_steps=cfg.max_steps,
        num_train_epochs=cfg.num_train_epochs,
        per_device_train_batch_size=cfg.per_device_train_batch_size,
        per_device_eval_batch_size=cfg.per_device_eval_batch_size,
        gradient_accumulation_steps=cfg.gradient_accumulation_steps,
        learning_rate=cfg.learning_rate,
        warmup_ratio=cfg.warmup_ratio,
        weight_decay=cfg.weight_decay,
        fp16=cfg.fp16 and not cfg.bf16,
        bf16=cfg.bf16,
        gradient_checkpointing=cfg.gradient_checkpointing,
        eval_strategy=cfg.eval_strategy if do_eval else "no",
        eval_steps=cfg.eval_steps if do_eval else None,
        save_strategy=cfg.save_strategy,
        save_steps=cfg.save_steps,
        save_total_limit=cfg.save_total_limit,
        logging_steps=cfg.logging_steps,
        predict_with_generate=cfg.predict_with_generate,
        generation_max_length=cfg.generation_max_length,
        load_best_model_at_end=do_eval,
        metric_for_best_model="cer" if do_eval else None,
        greater_is_better=False,
        report_to=["tensorboard"],
        remove_unused_columns=False,  # required for PEFT
        label_names=["labels"],       # required for PEFT
        dataloader_num_workers=2,     # 2 workers for parallel audio decode
        seed=cfg.seed,
    )

    trainer = Seq2SeqTrainer(
        model=model,
        args=training_args,
        train_dataset=train_ds,
        eval_dataset=eval_ds,
        data_collator=collator,
        compute_metrics=build_metrics(processor) if do_eval else None,
        processing_class=processor,
    )

    resume_path: Optional[Union[str, bool]] = None
    if cfg.resume:
        from transformers.trainer_utils import get_last_checkpoint
        last = get_last_checkpoint(cfg.output_dir) if os.path.isdir(cfg.output_dir) else None
        if last:
            logger.info("Resuming from checkpoint: %s", last)
            resume_path = last
        else:
            logger.info("No checkpoint found in %s; starting fresh.", cfg.output_dir)

    trainer.train(resume_from_checkpoint=resume_path)

    save_dir = Path(cfg.output_dir) / "final"
    save_dir.mkdir(parents=True, exist_ok=True)
    trainer.save_model(str(save_dir))
    processor.save_pretrained(str(save_dir))
    logger.info("Saved adapter + processor to %s", save_dir)

    if cfg.use_lora and cfg.save_merged:
        merge_and_save(cfg, processor, adapter_dir=save_dir)


def merge_and_save(cfg: Cfg, processor, adapter_dir: Path):
    """Reload base model in fp16, merge LoRA adapter, save standalone weights."""
    from peft import PeftModel
    from transformers import WhisperForConditionalGeneration

    merged_dir = Path(cfg.output_dir) / "merged"
    merged_dir.mkdir(parents=True, exist_ok=True)
    logger.info("Merging adapter into base weights -> %s", merged_dir)

    # 8bit base can't be merged directly; reload in fp16.
    base = WhisperForConditionalGeneration.from_pretrained(
        cfg.model_name, dtype=torch.float16
    )
    peft_model = PeftModel.from_pretrained(base, str(adapter_dir))
    merged = peft_model.merge_and_unload()
    merged.save_pretrained(str(merged_dir), safe_serialization=True)
    processor.save_pretrained(str(merged_dir))
    logger.info("Saved merged standalone model to %s (fp16, ~1.6GB)", merged_dir)


# --------------------------------------------------------------------------- #
# Preprocess: VAD-based long audio splitting (inference-time)
# --------------------------------------------------------------------------- #


def cmd_preprocess(args: argparse.Namespace):
    """Split long audio files into <=30s chunks using silence-based VAD."""
    import librosa
    import soundfile as sf

    in_path = Path(args.input)
    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    if in_path.is_dir():
        files = [p for p in in_path.rglob("*") if p.suffix.lower() in {".wav", ".mp3", ".flac", ".m4a"}]
    else:
        files = [in_path]

    if not files:
        raise SystemExit(f"No audio files found at {in_path}")

    sr = args.sampling_rate
    max_s = args.max_duration_s
    top_db = args.top_db
    manifest = []

    for f in files:
        logger.info("Processing %s", f)
        audio, _ = librosa.load(str(f), sr=sr, mono=True)
        if len(audio) / sr <= max_s:
            chunks = [(0, len(audio))]
        else:
            intervals = librosa.effects.split(audio, top_db=top_db)
            chunks = _pack_intervals(intervals, sr=sr, max_s=max_s)

        stem = f.stem
        for i, (s, e) in enumerate(chunks):
            seg = audio[s:e]
            if len(seg) / sr < args.min_duration_s:
                continue
            out_path = out_dir / f"{stem}_chunk{i:04d}.wav"
            sf.write(str(out_path), seg, sr)
            manifest.append({
                "audio": str(out_path),
                "source": str(f),
                "start": float(s / sr),
                "end": float(e / sr),
                "duration": float((e - s) / sr),
            })

    manifest_path = out_dir / "manifest.jsonl"
    with manifest_path.open("w", encoding="utf-8") as fh:
        for row in manifest:
            fh.write(json.dumps(row, ensure_ascii=False) + "\n")
    logger.info("Wrote %d chunks; manifest: %s", len(manifest), manifest_path)


def _pack_intervals(intervals: np.ndarray, sr: int, max_s: float) -> List[tuple]:
    """Greedily merge silence-bounded intervals into <=max_s chunks."""
    max_samples = int(max_s * sr)
    chunks: List[tuple] = []
    cur_start: Optional[int] = None
    cur_end: Optional[int] = None
    for s, e in intervals:
        seg_len = e - s
        if seg_len > max_samples:
            # Single utterance exceeds max — hard split into windows
            if cur_start is not None:
                chunks.append((cur_start, cur_end))
                cur_start, cur_end = None, None
            n = math.ceil(seg_len / max_samples)
            window = math.ceil(seg_len / n)
            for i in range(n):
                ws = s + i * window
                we = min(s + (i + 1) * window, e)
                chunks.append((int(ws), int(we)))
            continue
        if cur_start is None:
            cur_start, cur_end = int(s), int(e)
        elif e - cur_start <= max_samples:
            cur_end = int(e)
        else:
            chunks.append((cur_start, cur_end))
            cur_start, cur_end = int(s), int(e)
    if cur_start is not None:
        chunks.append((cur_start, cur_end))
    return chunks


# --------------------------------------------------------------------------- #
# CLI
# --------------------------------------------------------------------------- #


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Whisper Korean dialect fine-tuning")
    sub = p.add_subparsers(dest="cmd", required=True)

    # train
    t = sub.add_parser("train", help="Fine-tune Whisper with LoRA")
    t.add_argument("--model_name", type=str)
    t.add_argument("--train_files", nargs="+", required=True)
    t.add_argument("--eval_files", nargs="+")
    t.add_argument("--audio_column", type=str)
    t.add_argument("--text_column", type=str)
    t.add_argument("--output_dir", type=str)
    t.add_argument("--num_train_epochs", type=float)
    t.add_argument("--per_device_train_batch_size", type=int)
    t.add_argument("--per_device_eval_batch_size", type=int)
    t.add_argument("--gradient_accumulation_steps", type=int)
    t.add_argument("--learning_rate", type=float)
    t.add_argument("--lora_r", type=int)
    t.add_argument("--lora_alpha", type=int)
    t.add_argument("--use_8bit", action="store_true", default=None)
    t.add_argument("--no_8bit", dest="use_8bit", action="store_false")
    t.add_argument("--use_lora", action="store_true", default=None)
    t.add_argument("--no_lora", dest="use_lora", action="store_false")
    t.add_argument("--bf16", action="store_true", default=None)
    t.add_argument("--fp16", action="store_true", default=None)
    t.add_argument("--eval_steps", type=int)
    t.add_argument("--save_steps", type=int)
    t.add_argument("--logging_steps", type=int)
    t.add_argument("--save_total_limit", type=int)
    t.add_argument("--max_steps", type=int)
    t.add_argument("--save_strategy", type=str)
    t.add_argument("--eval_strategy", type=str)
    t.add_argument("--resume", action="store_true", default=None)
    t.add_argument("--save_merged", action="store_true", default=None,
                   help="After training, merge LoRA into base and save standalone fp16 weights (default on)")
    t.add_argument("--no_save_merged", dest="save_merged", action="store_false")

    # preprocess
    pp = sub.add_parser("preprocess", help="VAD-split long audio for inference")
    pp.add_argument("--input", required=True, help="audio file or directory")
    pp.add_argument("--output_dir", required=True)
    pp.add_argument("--sampling_rate", type=int, default=16000)
    pp.add_argument("--max_duration_s", type=float, default=30.0)
    pp.add_argument("--min_duration_s", type=float, default=0.5)
    pp.add_argument("--top_db", type=float, default=30.0, help="silence threshold (dB)")

    return p


def main():
    args = build_parser().parse_args()
    if args.cmd == "train":
        cfg = Cfg.from_args(args)
        cmd_train(cfg)
    elif args.cmd == "preprocess":
        cmd_preprocess(args)
    else:
        raise SystemExit(f"Unknown command: {args.cmd}")


if __name__ == "__main__":
    main()
