from __future__ import annotations

import json
from pathlib import Path


PROJECT = Path(__file__).resolve().parents[1]
manifest_path = PROJECT / "data" / "photo-manifest.json"
catalog_path = PROJECT / "data" / "catalog.json"

manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
sequences = {row["filename"]: row["sequence"] for row in manifest["photos"]}

missing: list[str] = []
for item in catalog.get("gallery", []):
    file = item["file"]
    if file not in sequences:
        missing.append(file)
    else:
        item["sequence"] = sequences[file]

if missing:
    raise SystemExit(f"catalog files not found in manifest: {', '.join(missing)}")

catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"updated": len(catalog.get("gallery", [])), "missing": missing}, ensure_ascii=False))
