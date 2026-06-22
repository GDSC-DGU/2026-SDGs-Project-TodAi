"""Build full train/val/test manifests from chunk wavs already on disk.

Walks every chunk-dir under data/processed/chunks/ and matches each chunk wav
to its source JSON to recover the dialect text. Skips JSONs whose chunks weren't
fully written (e.g. due to an interrupted prep run).
"""
from __future__ import annotations

import json
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import soundfile as sf

from prepare_data import (
    CHUNKS_DIR, EXTRACTED, MANIFEST_DIR, SEED,
    chunk_segments, split_rows, write_jsonl,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("full_manifest")


def process_label_dir(label_dir: Path, chunk_dir: Path) -> list[dict]:
    """Match chunks in chunk_dir to JSONs in label_dir. Return manifest rows."""
    if not chunk_dir.exists():
        return []

    existing_chunks = {p.name for p in chunk_dir.glob("*.wav")}
    if not existing_chunks:
        return []

    rows: list[dict] = []
    for json_path in label_dir.glob("*.json"):
        try:
            with open(json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception:
            continue

        file_id = data.get("fileName", json_path.stem)
        segments = data.get("transcription", {}).get("segments") or []
        chunks = chunk_segments(segments)
        if not chunks:
            continue

        for i, ch in enumerate(chunks):
            wav_name = f"{file_id}_chunk{i:04d}.wav"
            if wav_name not in existing_chunks:
                continue
            wav_path = chunk_dir / wav_name
            try:
                info = sf.info(str(wav_path))
                duration = info.frames / info.samplerate
            except Exception:
                continue
            rows.append({
                "audio": str(wav_path),
                "transcription": ch.text,
                "standard": ch.standard_text,
                "duration": duration,
                "file_id": file_id,
            })
    return rows


def gather_dirs() -> list[tuple[Path, Path]]:
    """List (label_dir, chunk_dir) pairs for every category present on disk."""
    pairs = []
    for split_dir in ("Training", "Validation"):
        chunks_root = CHUNKS_DIR / split_dir
        labels_root = EXTRACTED / split_dir / "labels"
        if not chunks_root.exists():
            continue
        for chunk_subdir in sorted(chunks_root.iterdir()):
            if not chunk_subdir.is_dir():
                continue
            label_subdir = labels_root / chunk_subdir.name  # same dir name
            if not label_subdir.exists():
                log.warning("label dir missing for %s", chunk_subdir.name)
                continue
            pairs.append((label_subdir, chunk_subdir))
    return pairs


def main():
    pairs = gather_dirs()
    log.info("Found %d (labels, chunks) pairs", len(pairs))

    all_rows: list[dict] = []
    with ThreadPoolExecutor(max_workers=8) as ex:
        futures = {ex.submit(process_label_dir, ld, cd): (ld, cd) for ld, cd in pairs}
        for i, fut in enumerate(as_completed(futures), 1):
            ld, cd = futures[fut]
            rows = fut.result()
            all_rows.extend(rows)
            log.info("[%d/%d] %s -> %d chunks (running total %d)",
                     i, len(pairs), cd.name, len(rows), len(all_rows))

    log.info("Total chunks: %d", len(all_rows))

    train, val, test, counts = split_rows(all_rows, train_pct=0.8, val_pct=0.1, seed=SEED)
    log.info("Speaker-level split:")
    log.info("  groups: %s", counts["groups"])
    log.info("  files:  %s", counts["files"])
    log.info("  chunks: %s", counts["chunks"])

    MANIFEST_DIR.mkdir(parents=True, exist_ok=True)
    write_jsonl(train, MANIFEST_DIR / "train.jsonl")
    write_jsonl(val, MANIFEST_DIR / "val.jsonl")
    write_jsonl(test, MANIFEST_DIR / "test.jsonl")
    log.info("Wrote manifests to %s", MANIFEST_DIR)


if __name__ == "__main__":
    main()
