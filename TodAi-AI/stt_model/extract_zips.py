"""Extract all AI Hub 139-1 zips into data/extracted/ in parallel."""
from __future__ import annotations

import argparse
import logging
import shutil
import sys
import zipfile
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("extract")

DATA = Path(__file__).parent / "data"
OUT = DATA / "extracted"


def extract_one(zip_path: Path, dest: Path) -> tuple[str, int]:
    """Extract a single zip into dest. Returns (zip_name, file_count)."""
    dest.mkdir(parents=True, exist_ok=True)
    n = 0
    with zipfile.ZipFile(zip_path) as zf:
        for entry in zf.infolist():
            # The AI Hub zips have leading "/" in entry names; strip it.
            target_rel = entry.filename.lstrip("/").lstrip("\\")
            if not target_rel:
                continue
            target = dest / target_rel
            if entry.is_dir():
                target.mkdir(parents=True, exist_ok=True)
                continue
            target.parent.mkdir(parents=True, exist_ok=True)
            with zf.open(entry) as src, open(target, "wb") as dst:
                shutil.copyfileobj(src, dst, length=1024 * 1024)
            n += 1
    return zip_path.name, n


def plan_jobs() -> list[tuple[Path, Path]]:
    """Build (zip_path, dest_dir) jobs for every zip."""
    jobs = []
    mapping = [
        # (zip_subdir,                    out_subdir)
        (("Training", "01.원천데이터"),    ("Training", "audio")),
        (("Training", "02.라벨링데이터"),  ("Training", "labels")),
        (("Validation", "01.원천데이터"),  ("Validation", "audio")),
        (("Validation", "02.라벨링데이터"),("Validation", "labels")),
    ]
    for src_parts, dst_parts in mapping:
        src_dir = DATA.joinpath(*src_parts)
        dst_dir = OUT.joinpath(*dst_parts)
        for z in sorted(src_dir.glob("*.zip")):
            stem = z.stem
            jobs.append((z, dst_dir / stem))
    return jobs


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--workers", type=int, default=4,
                   help="parallel workers (audio zips are I/O heavy; 4 is usually a good tradeoff)")
    p.add_argument("--only", choices=["all", "labels", "audio"], default="all",
                   help="extract only labels (fast) or audio (slow)")
    args = p.parse_args()

    jobs = plan_jobs()
    if args.only == "labels":
        jobs = [j for j in jobs if "labels" in str(j[1])]
    elif args.only == "audio":
        jobs = [j for j in jobs if "audio" in str(j[1])]

    log.info("planned %d zips to extract -> %s", len(jobs), OUT)
    for z, dst in jobs:
        log.info("  %s -> %s", z.name, dst.relative_to(DATA))

    OUT.mkdir(parents=True, exist_ok=True)

    failures = []
    completed = 0
    with ProcessPoolExecutor(max_workers=args.workers) as ex:
        futures = {ex.submit(extract_one, z, dst): z for z, dst in jobs}
        for fut in as_completed(futures):
            zsrc = futures[fut]
            try:
                name, n = fut.result()
                completed += 1
                log.info("[%d/%d] DONE %s (%d files)", completed, len(jobs), name, n)
            except Exception as e:
                failures.append((zsrc.name, str(e)))
                log.error("FAILED %s: %s", zsrc.name, e)

    if failures:
        log.error("=" * 60)
        log.error("Failures: %d", len(failures))
        for n, e in failures:
            log.error("  %s: %s", n, e)
        sys.exit(1)
    log.info("All %d zips extracted successfully", len(jobs))


if __name__ == "__main__":
    main()
