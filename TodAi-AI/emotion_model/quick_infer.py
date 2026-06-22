"""감정 모델 빠른 추론 확인 (CLI).

사용:
    # 폴더 안 모든 오디오 (하위 폴더 재귀)
    python emotion_model/quick_infer.py --audio_dir demo/clips

    # 단일 파일
    python emotion_model/quick_infer.py --audio sample.wav

    # 다른 모델 경로/HF ID 지정
    python emotion_model/quick_infer.py --audio sample.wav --model_id HyukII/todai-emotion-wav2vec2

폴더명이 '영화_감정'(예: 국제시장_슬픔)이거나 파일명에 감정 토큰이 있으면
의도 감정과 비교해 정확도를 출력한다. private repo면 HF_TOKEN 환경변수 필요.
"""
import os
import sys
import glob
import argparse

try:
    sys.stdout.reconfigure(encoding="utf-8")   # cp949 콘솔에서 한글/기호 보존
except Exception:
    pass

from emotion_model.infer import EmotionRecognizer, LABELS, KO2EN, DEFAULT_MODEL_ID

# 파일명/폴더명 → 의도 감정 (한국어/영어 토큰)
NAME2KO = {}
for ko, en in KO2EN.items():
    NAME2KO[ko] = ko
    NAME2KO[en.lower()] = ko


def parse_intended(stem: str):
    low = stem.lower()
    for token, ko in NAME2KO.items():
        if token.lower() in low:
            return ko
    return None


def collect(path: str) -> list[str]:
    if os.path.isdir(path):
        exts = ("wav", "mp3", "flac", "ogg", "aiff")
        return sorted(f for e in exts
                      for f in glob.glob(os.path.join(path, "**", f"*.{e}"), recursive=True))
    return [path]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--audio", help="단일 오디오 파일")
    ap.add_argument("--audio_dir", help="오디오 폴더 (재귀)")
    ap.add_argument("--model_id", default=DEFAULT_MODEL_ID, help="로컬 경로 또는 HF Hub ID")
    args = ap.parse_args()

    target = args.audio or args.audio_dir
    if not target:
        ap.error("--audio 또는 --audio_dir 중 하나는 필요합니다.")
    files = collect(target)
    if not files:
        print(f"오디오 파일을 찾지 못했습니다: {target}")
        sys.exit(1)

    print(f"모델 로드: {args.model_id}", flush=True)
    rec = EmotionRecognizer(model_id=args.model_id)
    print(f"device={rec.device} / 총 {len(files)}개 예측\n" + "=" * 72, flush=True)

    n_correct, n_labeled = 0, 0
    for path in files:
        stem = os.path.splitext(os.path.basename(path))[0]
        try:
            r = rec.predict(path)
        except Exception as e:
            print(f"  [실패] {stem}: {e}")
            continue
        intended = parse_intended(stem) or parse_intended(os.path.basename(os.path.dirname(path)))
        mark = ""
        if intended is not None:
            n_labeled += 1
            ok = (intended == r["emotion"])
            n_correct += int(ok)
            mark = f"  [의도={intended} {'O' if ok else 'X'}]"
        print(f"{stem:<30} -> {r['emotion']}({r['emotion_en']})  conf={r['confidence']:.2f}{mark}",
              flush=True)

    print("=" * 72, flush=True)
    if n_labeled:
        print(f"라벨된 {n_labeled}개 중 정답 {n_correct}개 -> 정확도 {n_correct / n_labeled:.3f}",
              flush=True)


if __name__ == "__main__":
    main()
