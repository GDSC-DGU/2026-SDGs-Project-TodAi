"""
Evaluate merged Whisper model on test.jsonl.

Usage:
    python evaluate_test.py
    python evaluate_test.py --model_dir siyeonsung/whisper-korean-dialect
    python evaluate_test.py --max_samples 1000   # quick sanity check
    python evaluate_test.py --resume             # continue from last checkpoint
"""

import argparse
import json
import logging
import time
from pathlib import Path

import numpy as np
import soundfile as sf
import torch

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
log = logging.getLogger(__name__)


def load_rows(manifest: str, text_column: str, max_samples: int | None) -> list[dict]:
    rows = []
    with open(manifest, encoding="utf-8") as f:
        for line in f:
            r = json.loads(line)
            if not str(r.get(text_column, "")).strip():
                continue
            rows.append(r)
    if max_samples:
        rows = rows[:max_samples]
    log.info("Loaded %d test rows", len(rows))
    return rows


def read_audio(path: str, target_sr: int = 16000) -> np.ndarray:
    try:
        audio, sr = sf.read(path, dtype="float32")
        if audio.ndim > 1:
            audio = audio.mean(axis=1)
        if sr != target_sr:
            import librosa
            audio = librosa.resample(audio, orig_sr=sr, target_sr=target_sr)
        return audio
    except Exception:
        return np.zeros(target_sr, dtype=np.float32)


def run_eval(args):
    from transformers import WhisperForConditionalGeneration, WhisperProcessor
    import evaluate

    ckpt_path = Path(args.output_dir) / "eval_checkpoint.jsonl"
    results_path = Path(args.output_dir) / "eval_results.json"
    Path(args.output_dir).mkdir(parents=True, exist_ok=True)

    # Resume: load already-processed indices
    done_indices: set[int] = set()
    saved_preds: list[str] = []
    saved_refs: list[str] = []
    if args.resume and ckpt_path.exists():
        with open(ckpt_path, encoding="utf-8") as f:
            for line in f:
                rec = json.loads(line)
                done_indices.add(rec["idx"])
                saved_preds.append(rec["pred"])
                saved_refs.append(rec["ref"])
        log.info("Resumed: %d samples already done", len(done_indices))

    log.info("Loading processor + model from %s", args.model_dir)
    processor = WhisperProcessor.from_pretrained(args.model_dir)
    model = WhisperForConditionalGeneration.from_pretrained(
        args.model_dir,
        dtype=torch.float16,
        device_map="auto",
    )
    model.eval()

    forced_ids = processor.get_decoder_prompt_ids(language="korean", task="transcribe")
    model.generation_config.forced_decoder_ids = forced_ids

    rows = load_rows(args.manifest, args.text_column, args.max_samples)

    ckpt_file = open(ckpt_path, "a", encoding="utf-8") if args.resume else open(ckpt_path, "w", encoding="utf-8")

    all_preds = list(saved_preds)
    all_refs = list(saved_refs)
    t0 = time.time()

    pending = [(i, r) for i, r in enumerate(rows) if i not in done_indices]
    total = len(rows)

    for batch_start in range(0, len(pending), args.batch_size):
        batch_items = pending[batch_start: batch_start + args.batch_size]
        indices = [item[0] for item in batch_items]
        batch_rows = [item[1] for item in batch_items]

        audios = [read_audio(r["audio"]) for r in batch_rows]
        refs = [str(r[args.text_column]) for r in batch_rows]

        inputs = processor.feature_extractor(
            audios, sampling_rate=16000, return_tensors="pt", padding=True
        ).to(model.device, dtype=torch.float16)

        with torch.no_grad():
            generated = model.generate(
                **inputs,
                max_new_tokens=args.max_new_tokens,
            )

        preds = processor.tokenizer.batch_decode(generated, skip_special_tokens=True)

        for idx, pred, ref in zip(indices, preds, refs):
            all_preds.append(pred)
            all_refs.append(ref)
            ckpt_file.write(json.dumps({"idx": idx, "pred": pred, "ref": ref}, ensure_ascii=False) + "\n")

        done_so_far = len(done_indices) + batch_start + len(batch_items)
        elapsed = time.time() - t0
        speed = (batch_start + len(batch_items)) / elapsed if elapsed > 0 else 0
        eta = (len(pending) - batch_start - len(batch_items)) / speed if speed > 0 else 0
        log.info(
            "[%d/%d] speed=%.1f samp/s  ETA=%.0fm",
            done_so_far, total, speed, eta / 60,
        )

        ckpt_file.flush()

    ckpt_file.close()

    log.info("Computing CER / WER on %d samples...", len(all_preds))
    cer_metric = evaluate.load("cer")
    wer_metric = evaluate.load("wer")
    cer = 100.0 * cer_metric.compute(predictions=all_preds, references=all_refs)
    wer = 100.0 * wer_metric.compute(predictions=all_preds, references=all_refs)

    results = {"n_samples": len(all_preds), "cer": round(cer, 4), "wer": round(wer, 4)}
    results_path.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")

    log.info("=" * 40)
    log.info("CER: %.2f%%", cer)
    log.info("WER: %.2f%%", wer)
    log.info("Saved to %s", results_path)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--model_dir", default="siyeonsung/whisper-korean-dialect")
    p.add_argument("--manifest", default="data/processed/manifests/test.jsonl")
    p.add_argument("--text_column", default="standard")
    p.add_argument("--batch_size", type=int, default=16)
    p.add_argument("--max_new_tokens", type=int, default=225)
    p.add_argument("--max_samples", type=int, default=None, help="limit for quick test")
    p.add_argument("--output_dir", default="outputs/eval_epoch10")
    p.add_argument("--resume", action="store_true", help="resume from checkpoint")
    args = p.parse_args()
    run_eval(args)


if __name__ == "__main__":
    main()
