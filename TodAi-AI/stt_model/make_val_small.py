import json, random
rng = random.Random(42)
rows = [json.loads(l) for l in open('data/processed/manifests/val.jsonl', encoding='utf-8')]
rng.shuffle(rows)
keep = rows[:2000]
with open('data/processed/manifests/val_small.jsonl', 'w', encoding='utf-8') as f:
    for r in keep:
        f.write(json.dumps(r, ensure_ascii=False) + '\n')
print(f"done: {len(keep)} rows")
print(f"keys: {list(keep[0].keys())}")
print(f"standard sample: {str(keep[0].get('standard','MISSING'))[:40]}")
