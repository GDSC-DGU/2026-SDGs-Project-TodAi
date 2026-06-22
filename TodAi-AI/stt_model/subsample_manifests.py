"""Subsample existing train/val/test manifests to a smaller size.

Sampling unit: speaker group (file_id stem before chunk index). Keeping all chunks
of the same recording together preserves the speaker-disjoint property.

Output goes to a sibling directory <manifest_dir>/sub<fraction*100>/
e.g. with --fraction 0.1, output dir is .../manifests/sub10/
"""
from __future__ import annotations

import argparse
import json
import logging
import random
import re
from collections import defaultdict
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("subsample")

CHUNK_RE = re.compile(r"_chunk\d+$")


def file_id_of(audio_path: str) -> str:
    stem = Path(audio_path).stem
    return CHUNK_RE.sub("", stem)


def subsample_jsonl(src: Path, dst: Path, fraction: float, seed: int):
    by_file: dict[str, list[dict]] = defaultdict(list)
    with src.open("r", encoding="utf-8") as f:
        for line in f:
            row = json.loads(line)
            fid = file_id_of(row["audio"])
            by_file[fid].append(row)

    fids = sorted(by_file.keys())
    rng = random.Random(seed)
    rng.shuffle(fids)
    n_keep = max(1, int(round(len(fids) * fraction)))
    kept_fids = set(fids[:n_keep])

    rows_kept = 0
    with dst.open("w", encoding="utf-8") as f:
        for fid in fids:
            if fid not in kept_fids:
                continue
            for row in by_file[fid]:
                f.write(json.dumps(row, ensure_ascii=False) + "\n")
                rows_kept += 1

    log.info("%-12s recordings %d -> %d  (chunks: ? -> %d)",
             src.name, len(fids), n_keep, rows_kept)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--manifest_dir", type=str, default="data/processed/manifests")
    p.add_argument("--fraction", type=float, default=0.1)
    p.add_argument("--seed", type=int, default=42)
    args = p.parse_args()

    src_dir = Path(args.manifest_dir)
    dst_dir = src_dir / f"sub{int(args.fraction * 100)}"
    dst_dir.mkdir(parents=True, exist_ok=True)

    for name in ("train.jsonl", "val.jsonl", "test.jsonl"):
        src = src_dir / name
        dst = dst_dir / name
        if not src.exists():
            log.warning("missing %s", src)
            continue
        subsample_jsonl(src, dst, args.fraction, args.seed)
    log.info("Wrote subsampled manifests to %s", dst_dir)


if __name__ == "__main__":
    main()
