"""Merge LoRA adapter into base model for each epoch checkpoint.

Usage:
    python stt_model/merge_epochs.py --output_root outputs/whisper-dialect-epoch20
"""
import argparse
import logging
from pathlib import Path
import torch
from peft import PeftModel
from transformers import WhisperForConditionalGeneration, WhisperProcessor

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

BASE_MODEL = "openai/whisper-large-v3-turbo"
STEPS_PER_EPOCH = 44413


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--output_root", required=True, help="e.g. outputs/whisper-dialect-epoch20")
    p.add_argument("--steps_per_epoch", type=int, default=STEPS_PER_EPOCH)
    args = p.parse_args()

    output_root = Path(args.output_root)
    checkpoints = sorted(
        [d for d in output_root.iterdir() if d.is_dir() and d.name.startswith("checkpoint-")],
        key=lambda d: int(d.name.split("-")[1]),
    )

    if not checkpoints:
        logger.warning("No checkpoints found in %s", output_root)
        raise SystemExit(1)

    processor = WhisperProcessor.from_pretrained(BASE_MODEL, language="korean", task="transcribe")

    for ckpt in checkpoints:
        step = int(ckpt.name.split("-")[1])
        epoch = round(step / args.steps_per_epoch)
        merged_dir = output_root / f"merged-epoch{epoch}"
        if merged_dir.exists():
            logger.info("Skipping epoch %d (already merged)", epoch)
            continue
        logger.info("Merging epoch %d (step %d) -> %s", epoch, step, merged_dir)
        merged_dir.mkdir(parents=True, exist_ok=True)
        base = WhisperForConditionalGeneration.from_pretrained(BASE_MODEL, dtype=torch.float16)
        peft_model = PeftModel.from_pretrained(base, str(ckpt))
        merged = peft_model.merge_and_unload()
        merged.save_pretrained(str(merged_dir), safe_serialization=True)
        processor.save_pretrained(str(merged_dir))
        logger.info("Saved merged-epoch%d", epoch)
        del base, peft_model, merged
        torch.cuda.empty_cache()

    logger.info("All epochs merged.")


if __name__ == "__main__":
    main()
