"""
모델 결과 빠르게 확인하는 스크립트.

Usage:
    python quick_infer.py                    # test.jsonl에서 5개 샘플
    python quick_infer.py --n 10             # 10개 샘플
    python quick_infer.py --audio path.wav   # 특정 파일 하나
"""

import argparse
import json
import random

import numpy as np
import soundfile as sf
import torch
from transformers import WhisperForConditionalGeneration, WhisperProcessor


def load_audio(path: str, target_sr: int = 16000) -> np.ndarray:
    audio, sr = sf.read(path, dtype="float32")
    if audio.ndim > 1:
        audio = audio.mean(axis=1)
    if sr != target_sr:
        import librosa
        audio = librosa.resample(audio, orig_sr=sr, target_sr=target_sr)
    return audio


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--model_dir", default="outputs/whisper-dialect-epoch10/merged-epoch10")
    p.add_argument("--manifest", default="data/processed/manifests/test.jsonl")
    p.add_argument("--n", type=int, default=5, help="샘플 수")
    p.add_argument("--audio", default=None, help="특정 wav 파일 경로 (지정 시 manifest 무시)")
    p.add_argument("--seed", type=int, default=42)
    args = p.parse_args()

    print(f"모델 로딩: {args.model_dir}")
    processor = WhisperProcessor.from_pretrained(args.model_dir)
    model = WhisperForConditionalGeneration.from_pretrained(
        args.model_dir,
        dtype=torch.float16,
        device_map="auto",
    )
    model.eval()
    forced_ids = processor.get_decoder_prompt_ids(language="korean", task="transcribe")
    model.generation_config.forced_decoder_ids = forced_ids
    print("로딩 완료\n")

    if args.audio:
        samples = [{"audio": args.audio, "transcription": None, "standard": None}]
    else:
        with open(args.manifest, encoding="utf-8") as f:
            rows = [json.loads(l) for l in f if l.strip()]
        random.seed(args.seed)
        samples = random.sample(rows, min(args.n, len(rows)))

    for i, row in enumerate(samples):
        audio = load_audio(row["audio"])
        inputs = processor.feature_extractor(
            [audio], sampling_rate=16000, return_tensors="pt"
        ).to(model.device, dtype=torch.float16)

        with torch.no_grad():
            generated = model.generate(**inputs, max_new_tokens=225)
        pred = processor.tokenizer.batch_decode(generated, skip_special_tokens=True)[0]

        filename = row['audio'].replace('\\', '/').split('/')[-1][:50]
        print(f"[{i+1}] {filename}")
        if row.get("transcription"):
            print(f"  방언 원문: {row['transcription']}")
        if row.get("standard"):
            print(f"  정답(표준): {row['standard']}")
        print(f"  모델 출력: {pred}")
        print()


if __name__ == "__main__":
    main()
