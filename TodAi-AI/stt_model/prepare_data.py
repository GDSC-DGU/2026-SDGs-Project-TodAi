"""
Prepare AI Hub 139-1 data for Whisper fine-tuning.

Steps:
  1. Walk extracted JSON labels.
  2. For each (json, matching wav), group word-level segments into utterance chunks
     (silence gap >= 0.5s OR cumulative duration > 25s starts a new chunk).
  3. Slice the wav for each chunk and write to data/processed/chunks/.
  4. Combine all chunks across Training+Validation, split 80/10/10 (train/val/test)
     by *recording* (so chunks from the same source wav stay in one split).
  5. Emit data/processed/manifests/{train,val,test}.jsonl.

Manifest schema: {"audio": "<abs path>", "transcription": "<dialect text>"}
"""
from __future__ import annotations

import argparse
import json
import logging
import multiprocessing as mp
import random
from concurrent.futures import ProcessPoolExecutor, as_completed
from dataclasses import dataclass
from pathlib import Path

import soundfile as sf

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("prepare")

ROOT = Path(__file__).parent
EXTRACTED = ROOT / "data" / "extracted"
PROCESSED = ROOT / "data" / "processed"
CHUNKS_DIR = PROCESSED / "chunks"
MANIFEST_DIR = PROCESSED / "manifests"

# Chunking parameters
GAP_THRESHOLD = 0.5      # silence between segments that triggers new chunk
MAX_CHUNK_DUR = 25.0     # hard cap so we stay well under Whisper's 30s limit
MIN_CHUNK_DUR = 0.3      # drop chunks shorter than this
PAD_S = 0.05             # tiny pad around chunk to avoid clipping word edges
SEED = 42


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #


def hms_to_sec(s: str) -> float:
    h, m, sec = s.split(":")
    return int(h) * 3600 + int(m) * 60 + float(sec)


@dataclass
class Chunk:
    start: float
    end: float
    text: str
    standard_text: str = ""


def chunk_segments(segments: list[dict]) -> list[Chunk]:
    """Group voice_speech segments into utterance chunks."""
    chunks: list[Chunk] = []
    cur: list[tuple[float, float, str, str]] = []

    for seg in segments:
        if seg.get("voiceType") != "voice_speech":
            continue
        text = (seg.get("dialect") or "").strip()
        if not text:
            continue
        if not seg.get("startTime") or not seg.get("endTime"):
            continue
        standard = (seg.get("standard") or text).strip()
        s = hms_to_sec(seg["startTime"])
        e = hms_to_sec(seg["endTime"])
        if e <= s:
            continue

        if not cur:
            cur.append((s, e, text, standard))
            continue

        prev_e = cur[-1][1]
        chunk_start = cur[0][0]
        gap = s - prev_e
        new_dur_if_added = e - chunk_start

        if gap >= GAP_THRESHOLD or new_dur_if_added > MAX_CHUNK_DUR:
            # finalize current chunk, start new
            chunks.append(_finalize(cur))
            cur = [(s, e, text, standard)]
        else:
            cur.append((s, e, text, standard))

    if cur:
        chunks.append(_finalize(cur))
    return [c for c in chunks if (c.end - c.start) >= MIN_CHUNK_DUR]


def _finalize(cur: list[tuple[float, float, str, str]]) -> Chunk:
    return Chunk(
        start=cur[0][0],
        end=cur[-1][1],
        text=" ".join(t for _, _, t, _ in cur),
        standard_text=" ".join(st for _, _, _, st in cur),
    )


# --------------------------------------------------------------------------- #
# Per-recording processing
# --------------------------------------------------------------------------- #


@dataclass
class ManifestRow:
    audio: str
    transcription: str
    file_id: str  # source recording stem (used for split grouping)


def process_one_recording(args: tuple[Path, Path, Path]) -> tuple[list[dict], int, str]:
    """Process one (json, audio_dir, out_dir) -> manifest rows + drop count.

    Idempotent: if all expected chunk wavs already exist on disk (from a prior run),
    only metadata is recorded (no source-wav re-read, no chunk re-write).
    """
    json_path, audio_root, out_dir = args
    out_dir.mkdir(parents=True, exist_ok=True)

    try:
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        return [], 0, f"json_read_fail:{json_path.name}:{e}"

    file_id = data.get("fileName", json_path.stem)
    segments = data.get("transcription", {}).get("segments") or []
    chunks = chunk_segments(segments)
    if not chunks:
        return [], 0, ""

    expected_paths = [out_dir / f"{file_id}_chunk{i:04d}.wav" for i in range(len(chunks))]
    all_exist = all(p.exists() for p in expected_paths)

    # Fast path: all chunks already on disk
    if all_exist:
        rows: list[dict] = []
        for ch, out_path in zip(chunks, expected_paths):
            try:
                ex_info = sf.info(str(out_path))
                duration = ex_info.frames / ex_info.samplerate
            except Exception:
                continue
            if duration <= 0:
                continue
            rows.append({
                "audio": str(out_path),
                "transcription": ch.text,
                "duration": duration,
                "file_id": file_id,
            })
        return rows, 0, ""

    # Slow path: need to slice source wav
    wav_path = audio_root / f"{file_id}.wav"
    if not wav_path.exists():
        return [], 0, f"wav_missing:{file_id}"

    try:
        info = sf.info(str(wav_path))
        sr = info.samplerate
        total_frames = info.frames
    except Exception as e:
        return [], 0, f"wav_info_fail:{file_id}:{e}"

    rows = []
    drops = 0
    for ch, out_path in zip(chunks, expected_paths):
        start_f = max(0, int((ch.start - PAD_S) * sr))
        end_f = min(total_frames, int((ch.end + PAD_S) * sr))
        if end_f - start_f <= 0:
            drops += 1
            continue

        if out_path.exists():
            # Partial prior run: this chunk already written
            try:
                ex_info = sf.info(str(out_path))
                duration = ex_info.frames / ex_info.samplerate
            except Exception:
                drops += 1
                continue
            rows.append({
                "audio": str(out_path),
                "transcription": ch.text,
                "duration": duration,
                "file_id": file_id,
            })
            continue

        try:
            audio, _ = sf.read(str(wav_path), start=start_f, stop=end_f, dtype="int16")
        except Exception:
            drops += 1
            continue
        if audio.ndim > 1:
            audio = audio.mean(axis=1).astype("int16")
        try:
            sf.write(str(out_path), audio, sr, subtype="PCM_16")
        except Exception:
            drops += 1
            continue

        rows.append({
            "audio": str(out_path),
            "transcription": ch.text,
            "duration": (end_f - start_f) / sr,
            "file_id": file_id,
        })

    return rows, drops, ""


# --------------------------------------------------------------------------- #
# Walk + dispatch
# --------------------------------------------------------------------------- #


def gather_jobs(include_substring: str | None = None) -> list[tuple[Path, Path, Path]]:
    """Find every JSON, pair with its audio directory and output directory.

    include_substring: if set, only label dirs whose name contains this substring
                       are considered (useful for smoke tests on subset).
    """
    jobs: list[tuple[Path, Path, Path]] = []
    for split_dir in ("Training", "Validation"):
        labels_root = EXTRACTED / split_dir / "labels"
        audio_root = EXTRACTED / split_dir / "audio"
        if not labels_root.exists():
            log.warning("Labels missing: %s", labels_root)
            continue

        # labels/<zip-stem>/<file>.json  ↔  audio/<zip-stem-twin>/<file>.wav
        # but stem prefix differs (TL vs TS, VL vs VS). Map stems.
        twin = {"TL_": "TS_", "VL_": "VS_"}

        for label_zip_dir in sorted(labels_root.iterdir()):
            if not label_zip_dir.is_dir():
                continue
            if include_substring and include_substring not in label_zip_dir.name:
                continue
            audio_zip_stem = label_zip_dir.name
            for prefix, replacement in twin.items():
                if audio_zip_stem.startswith(prefix):
                    audio_zip_stem = replacement + audio_zip_stem[len(prefix):]
                    break
            audio_dir = audio_root / audio_zip_stem
            out_dir = CHUNKS_DIR / split_dir / label_zip_dir.name

            for json_file in label_zip_dir.glob("*.json"):
                jobs.append((json_file, audio_dir, out_dir))
    return jobs


# --------------------------------------------------------------------------- #
# Split — speaker-level (union-find: 2인발화로 연결된 화자들은 같은 그룹)
# --------------------------------------------------------------------------- #


def extract_speakers(file_id: str) -> list[str]:
    """Pull speaker tokens like 'speakergw1744' from filename.

    AI Hub 139-1 filename format:
      st_set2_collectorgw185_speakergw1744_87_5         (1인)
      say_set2_collectorgw115_speakergw1245_0_0_9       (1인)
      talk_set2_collectorgw95_speakergw2440_speakergw2441_5_0_121  (2인)
    """
    return [
        p for p in file_id.split("_")
        if p.startswith("speaker") and len(p) > len("speaker")
    ]


def build_speaker_groups(rows: list[dict]) -> dict[str, str]:
    """Map each file_id to a speaker-group id.

    Union-find: speakers co-occurring in any 2인발화 are merged into one group.
    All recordings of any speaker in a group go to the same split, so no
    speaker can appear in both train and test.
    """
    parent: dict[str, str] = {}

    def find(x: str) -> str:
        while parent[x] != x:
            parent[x] = parent[parent[x]]  # path compression
            x = parent[x]
        return x

    def union(a: str, b: str):
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[ra] = rb

    # Pass 1: register all speakers, union speakers co-occurring in 2인발화
    file_speakers: dict[str, list[str]] = {}
    for r in rows:
        fid = r["file_id"]
        if fid in file_speakers:
            continue
        speakers = extract_speakers(fid)
        file_speakers[fid] = speakers
        if not speakers:
            # No speaker info — treat the recording itself as its own "group"
            parent.setdefault(fid, fid)
            continue
        for s in speakers:
            parent.setdefault(s, s)
        for s in speakers[1:]:
            union(speakers[0], s)

    # Pass 2: file_id -> group root
    file_to_group: dict[str, str] = {}
    for fid, speakers in file_speakers.items():
        anchor = speakers[0] if speakers else fid
        file_to_group[fid] = find(anchor)
    return file_to_group


def split_rows(rows: list[dict], train_pct: float, val_pct: float, seed: int):
    """Speaker-level split: every group's recordings go to the same split."""
    file_to_group = build_speaker_groups(rows)

    by_group: dict[str, list[dict]] = {}
    for r in rows:
        g = file_to_group[r["file_id"]]
        by_group.setdefault(g, []).append(r)

    group_ids = sorted(by_group.keys())
    rng = random.Random(seed)
    rng.shuffle(group_ids)

    n = len(group_ids)
    n_train = int(n * train_pct)
    n_val = int(n * val_pct)
    train_g = set(group_ids[:n_train])
    val_g = set(group_ids[n_train:n_train + n_val])
    test_g = set(group_ids[n_train + n_val:])

    train, val, test = [], [], []
    for g, rs in by_group.items():
        if g in train_g:
            train.extend(rs)
        elif g in val_g:
            val.extend(rs)
        else:
            test.extend(rs)

    files = lambda lst: len({r["file_id"] for r in lst})
    counts = {
        "groups": (len(train_g), len(val_g), len(test_g)),
        "files":  (files(train),  files(val),  files(test)),
        "chunks": (len(train),    len(val),    len(test)),
    }
    return train, val, test, counts


def write_jsonl(rows: list[dict], path: Path):
    with open(path, "w", encoding="utf-8") as f:
        for r in rows:
            # drop file_id from manifest (it's only used for splitting)
            obj = {
                "audio": r["audio"],
                "transcription": r["transcription"],
                "standard": r.get("standard", r["transcription"]),
                "duration": r["duration"],
            }
            f.write(json.dumps(obj, ensure_ascii=False) + "\n")


# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--workers", type=int, default=max(2, mp.cpu_count() // 2))
    p.add_argument("--train_pct", type=float, default=0.80)
    p.add_argument("--val_pct", type=float, default=0.10)
    p.add_argument("--limit", type=int, default=0,
                   help="process only first N recordings (smoke test)")
    p.add_argument("--include", type=str, default=None,
                   help="only label dirs whose name contains this substring (smoke test)")
    args = p.parse_args()

    CHUNKS_DIR.mkdir(parents=True, exist_ok=True)
    MANIFEST_DIR.mkdir(parents=True, exist_ok=True)

    log.info("Gathering jobs...")
    jobs = gather_jobs(include_substring=args.include)
    log.info("Found %d JSON labels to process", len(jobs))
    if args.limit:
        jobs = jobs[:args.limit]
        log.info("LIMIT: processing only %d", len(jobs))

    all_rows: list[dict] = []
    total_drops = 0
    errors = []
    completed = 0
    LOG_EVERY = max(1, len(jobs) // 100)

    with ProcessPoolExecutor(max_workers=args.workers) as ex:
        futures = {ex.submit(process_one_recording, j): j for j in jobs}
        for fut in as_completed(futures):
            j = futures[fut]
            completed += 1
            try:
                rows, drops, err = fut.result()
                all_rows.extend(rows)
                total_drops += drops
                if err:
                    errors.append(err)
            except Exception as e:
                errors.append(f"crash:{j[0].name}:{e}")

            if completed % LOG_EVERY == 0 or completed == len(jobs):
                log.info("[%d/%d] rows=%d drops=%d errors=%d",
                         completed, len(jobs), len(all_rows), total_drops, len(errors))

    log.info("Total chunks produced: %d", len(all_rows))
    log.info("Total chunk drops: %d", total_drops)
    if errors:
        log.warning("Errors (showing first 20 of %d):", len(errors))
        for e in errors[:20]:
            log.warning("  %s", e)

    train, val, test, counts = split_rows(
        all_rows, args.train_pct, args.val_pct, SEED
    )
    g_tr, g_v, g_te = counts["groups"]
    f_tr, f_v, f_te = counts["files"]
    c_tr, c_v, c_te = counts["chunks"]
    log.info("Speaker-level split (no speaker overlap across splits):")
    log.info("  speaker groups: train=%d / val=%d / test=%d", g_tr, g_v, g_te)
    log.info("  recordings:     train=%d / val=%d / test=%d", f_tr, f_v, f_te)
    log.info("  chunks:         train=%d / val=%d / test=%d", c_tr, c_v, c_te)

    write_jsonl(train, MANIFEST_DIR / "train.jsonl")
    write_jsonl(val, MANIFEST_DIR / "val.jsonl")
    write_jsonl(test, MANIFEST_DIR / "test.jsonl")
    log.info("Wrote manifests to %s", MANIFEST_DIR)


if __name__ == "__main__":
    main()
