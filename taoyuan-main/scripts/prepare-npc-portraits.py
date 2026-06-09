#!/usr/bin/env python3
import argparse
import json
import os
import re
from collections import defaultdict
from concurrent.futures import ProcessPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageOps


SUPPORTED_SOURCE_SUFFIXES = {".png", ".webp"}
VARIANT_RE = re.compile(r"^(?P<base>.+)_(?P<variant>0[1-5])\.(?:png|webp)$", re.IGNORECASE)


def parse_sizes(raw):
  sizes = []
  for part in str(raw or "").split(","):
    part = part.strip()
    if not part:
      continue
    size = int(part)
    if size <= 0:
      raise ValueError("size must be positive")
    sizes.append(size)
  return sizes or [128, 256]


def parse_names(values):
  names = set()
  for value in values or []:
    for part in str(value).split(","):
      part = part.strip()
      if part:
        names.add(part)
  return names


def read_text(path):
  try:
    return Path(path).read_text(encoding="utf-8")
  except FileNotFoundError:
    return ""


def display_name_for(base):
  value = str(base or "").strip()
  if "\uff08" in value:
    value = value.split("\uff08", 1)[0]
  if "-" in value:
    value = value.split("-", 1)[0]
  return value or str(base or "")


def collect_groups(source_dir):
  groups = defaultdict(dict)
  for file_path in sorted(source_dir.iterdir(), key=lambda item: item.name.lower()):
    if not file_path.is_file() or file_path.suffix.lower() not in SUPPORTED_SOURCE_SUFFIXES:
      continue
    match = VARIANT_RE.match(file_path.name)
    if not match:
      continue
    base = match.group("base")
    variant = match.group("variant")
    previous = groups[base].get(variant)
    if previous and previous.suffix.lower() == ".webp":
      continue
    if previous and file_path.suffix.lower() != ".webp":
      continue
    groups[base][variant] = file_path
  return dict(sorted(groups.items(), key=lambda item: item[0]))


def parse_regular_npcs(frontend_root):
  text = read_text(Path(frontend_root) / "src" / "data" / "npcs.ts")
  pattern = re.compile(
    r"\bid:\s*'(?P<id>[^']+)'\s*,\s*"
    r"name:\s*'(?P<name>[^']+)'\s*,\s*"
    r"gender:\s*'(?P<gender>[^']+)'\s*,\s*"
    r"role:\s*'(?P<role>[^']+)'",
    re.S,
  )
  return [
    {
      "id": match.group("id"),
      "name": match.group("name"),
      "gender": match.group("gender"),
      "role": match.group("role"),
    }
    for match in pattern.finditer(text)
  ]


def parse_hidden_npcs(frontend_root):
  text = read_text(Path(frontend_root) / "src" / "data" / "hiddenNpcs.ts")
  pattern = re.compile(
    r"\{\s*id:\s*'(?P<id>[^']+)'\s*,\s*"
    r"name:\s*'(?P<name>[^']+)'\s*,\s*"
    r"trueName:\s*'(?P<trueName>[^']+)'\s*,\s*"
    r"gender:\s*'(?P<gender>[^']+)'\s*,\s*"
    r"title:\s*'(?P<title>[^']+)'",
    re.S,
  )
  return [
    {
      "id": match.group("id"),
      "name": match.group("name"),
      "trueName": match.group("trueName"),
      "gender": match.group("gender"),
      "title": match.group("title"),
      "assetBase": f"{match.group('name')}-{match.group('trueName')}",
    }
    for match in pattern.finditer(text)
  ]


def parse_seed_names(raw):
  return re.findall(r"'([^']+)'", raw or "")


def parse_random_npc_templates(frontend_root):
  text = read_text(Path(frontend_root) / "src" / "data" / "randomNpcs.ts")
  pattern = re.compile(
    r"\{\s*id:\s*'(?P<id>[^']+)'\s*,\s*"
    r"nameSeeds:\s*\[(?P<nameSeeds>[^\]]*)\]\s*,\s*"
    r"ageBand:\s*'(?P<ageBand>[^']+)'\s*,\s*"
    r"gender:\s*'(?P<gender>[^']+)'\s*,\s*"
    r"occupation:\s*'(?P<occupation>[^']+)'",
    re.S,
  )
  templates = []
  for match in pattern.finditer(text):
    seeds = parse_seed_names(match.group("nameSeeds"))
    occupation = match.group("occupation")
    templates.append({
      "id": match.group("id"),
      "nameSeeds": seeds,
      "ageBand": match.group("ageBand"),
      "gender": match.group("gender"),
      "occupation": occupation,
      "assetBase": f"{occupation}\uff08{'-'.join(seeds)}\uff09" if seeds else occupation,
    })
  return templates


def convert_variant_task(task):
  source_file, targets, quality, force = task
  source_file = Path(source_file)
  targets = [(int(size), Path(target_file)) for size, target_file in targets]
  pending = [
    (size, target_file)
    for size, target_file in targets
    if force or not target_file.exists()
  ]
  skipped = len(targets) - len(pending)
  written = 0
  if not pending:
    return {"written": written, "skipped": skipped, "source": str(source_file)}

  with Image.open(source_file) as image:
    image = ImageOps.exif_transpose(image).convert("RGBA")
    for size, target_file in pending:
      target_file.parent.mkdir(parents=True, exist_ok=True)
      resized = ImageOps.contain(image, (size, size), Image.Resampling.LANCZOS)
      canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
      left = (size - resized.width) // 2
      top = (size - resized.height) // 2
      canvas.alpha_composite(resized, (left, top))
      canvas.save(target_file, "WEBP", quality=quality, method=6)
      written += 1

  return {"written": written, "skipped": skipped, "source": str(source_file)}


def clone_entry(entry, extra=None):
  cloned = json.loads(json.dumps(entry, ensure_ascii=False))
  if extra:
    cloned.update(extra)
  return cloned


def assign(target, key, entry, extra=None):
  if not key:
    return
  target[str(key)] = clone_entry(entry, extra)


def add_display_candidate(display_entries, display_name, entry, extra=None):
  if not display_name:
    return
  display_entries[str(display_name)].append(clone_entry(entry, extra))


def build_mappings(manifest, frontend_root):
  entries = manifest["byAssetBase"]
  display_entries = defaultdict(list)
  mapped = {
    "regular": 0,
    "hidden": 0,
    "random": 0,
  }
  unmapped = {
    "regular": [],
    "hidden": [],
    "random": [],
  }

  for asset_base, entry in entries.items():
    assign(manifest["byName"], asset_base, entry)
    add_display_candidate(display_entries, entry.get("displayName") or display_name_for(asset_base), entry)

  for npc in parse_regular_npcs(frontend_root):
    entry = entries.get(npc["name"])
    if not entry:
      unmapped["regular"].append(npc)
      continue
    extra = {
      "kind": "regular",
      "npcId": npc["id"],
      "role": npc["role"],
      "gender": npc["gender"],
    }
    assign(manifest["byId"], npc["id"], entry, extra)
    assign(manifest["byName"], npc["name"], entry, extra)
    add_display_candidate(display_entries, npc["name"], entry, extra)
    mapped["regular"] += 1

  for npc in parse_hidden_npcs(frontend_root):
    entry = entries.get(npc["assetBase"])
    if not entry:
      unmapped["hidden"].append(npc)
      continue
    extra = {
      "kind": "hidden",
      "npcId": npc["id"],
      "trueName": npc["trueName"],
      "title": npc["title"],
      "gender": npc["gender"],
    }
    assign(manifest["byId"], npc["id"], entry, extra)
    assign(manifest["byName"], npc["name"], entry, extra)
    assign(manifest["byName"], npc["trueName"], entry, extra)
    add_display_candidate(display_entries, npc["name"], entry, extra)
    mapped["hidden"] += 1

  for template in parse_random_npc_templates(frontend_root):
    entry = entries.get(template["assetBase"])
    if not entry:
      unmapped["random"].append(template)
      continue
    extra = {
      "kind": "random",
      "templateId": template["id"],
      "occupation": template["occupation"],
      "gender": template["gender"],
      "ageBand": template["ageBand"],
      "nameSeeds": template["nameSeeds"],
    }
    assign(manifest["byTemplateId"], template["id"], entry, extra)
    assign(manifest["byName"], template["occupation"], entry, extra)
    add_display_candidate(display_entries, template["occupation"], entry, extra)
    for seed in template["nameSeeds"]:
      assign(manifest["byName"], seed, entry, extra)
    mapped["random"] += 1

  for display_name, candidates in sorted(display_entries.items()):
    unique = {}
    for candidate in candidates:
      unique[candidate["assetBase"]] = candidate
    values = list(unique.values())
    if len(values) == 1:
      manifest["byDisplayName"][display_name] = values[0]
    else:
      manifest["ambiguousDisplayNames"].append({
        "displayName": display_name,
        "assetBases": [entry["assetBase"] for entry in values],
      })

  return {
    "mapped": mapped,
    "unmapped": unmapped,
  }


def main():
  repo_root = Path(__file__).resolve().parents[2]
  frontend_root = Path(__file__).resolve().parents[1]
  parser = argparse.ArgumentParser(description="Prepare Taoyuan NPC portraits for runtime use.")
  parser.add_argument("--source", default=str(repo_root / "images" / "npc"))
  parser.add_argument("--out", default=str(frontend_root / "public" / "npc"))
  parser.add_argument("--sizes", default="128,256")
  parser.add_argument("--quality", type=int, default=84)
  parser.add_argument("--names", action="append", default=[])
  parser.add_argument("--limit", type=int, default=0)
  parser.add_argument("--workers", type=int, default=max(1, min(8, (os.cpu_count() or 2) - 1)))
  parser.add_argument("--force", action="store_true")
  args = parser.parse_args()

  source_dir = Path(args.source).resolve()
  output_dir = Path(args.out).resolve()
  sizes = parse_sizes(args.sizes)
  selected_names = parse_names(args.names)

  if not source_dir.exists():
    raise SystemExit(f"source directory not found: {source_dir}")

  groups = collect_groups(source_dir)
  if selected_names:
    groups = {
      base: variants
      for base, variants in groups.items()
      if base in selected_names or display_name_for(base) in selected_names
    }
  if args.limit and args.limit > 0:
    groups = dict(list(groups.items())[:args.limit])

  version = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
  manifest = {
    "version": version,
    "generatedAt": datetime.now(timezone.utc).isoformat(),
    "basePath": "/npc",
    "defaultVariant": "01",
    "sizes": sizes,
    "byId": {},
    "byTemplateId": {},
    "byAssetBase": {},
    "byName": {},
    "byDisplayName": {},
    "ambiguousDisplayNames": [],
  }
  missing_variants = {}
  tasks = []

  for base, variants in groups.items():
    entry = {
      "assetBase": base,
      "displayName": display_name_for(base),
      "kind": "asset",
      "variants": {},
    }
    missing = [variant for variant in ("01", "02", "03", "04", "05") if variant not in variants]
    if missing:
      missing_variants[base] = missing

    for variant, source_file in sorted(variants.items()):
      entry["variants"][variant] = {}
      targets = []
      for size in sizes:
        target_name = f"{base}_{variant}.webp"
        target_file = output_dir / str(size) / target_name
        entry["variants"][variant][str(size)] = f"{size}/{target_name}"
        targets.append((size, target_file))
      tasks.append((source_file, targets, args.quality, args.force))

    manifest["byAssetBase"][base] = entry

  mapping_report = build_mappings(manifest, frontend_root)
  manifest["stats"] = {
    "groups": len(groups),
    "variantSourceFiles": len(tasks),
    "runtimeSizes": sizes,
    "mappedRegularNpcIds": mapping_report["mapped"]["regular"],
    "mappedHiddenNpcIds": mapping_report["mapped"]["hidden"],
    "mappedRandomNpcTemplateIds": mapping_report["mapped"]["random"],
    "ambiguousDisplayNames": len(manifest["ambiguousDisplayNames"]),
    "missingVariantGroups": len(missing_variants),
  }

  output_dir.mkdir(parents=True, exist_ok=True)
  converted = 0
  if tasks:
    completed = 0
    written = 0
    skipped = 0
    workers = max(1, int(args.workers or 1))
    print(json.dumps({
      "phase": "convert",
      "groups": len(groups),
      "variantTasks": len(tasks),
      "sizes": sizes,
      "workers": workers,
      "force": bool(args.force),
    }, ensure_ascii=False), flush=True)

    with ProcessPoolExecutor(max_workers=workers) as executor:
      futures = [executor.submit(convert_variant_task, task) for task in tasks]
      for future in as_completed(futures):
        result = future.result()
        completed += 1
        written += int(result.get("written", 0))
        skipped += int(result.get("skipped", 0))
        if completed == len(tasks) or completed % 50 == 0:
          print(json.dumps({
            "phase": "convert-progress",
            "completed": completed,
            "total": len(tasks),
            "written": written,
            "skipped": skipped,
          }, ensure_ascii=False), flush=True)
    converted = written + skipped

  manifest_path = output_dir / "npc-portrait-manifest.json"
  manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

  qa_report = {
    "version": version,
    "generatedAt": manifest["generatedAt"],
    "source": str(source_dir),
    "out": str(output_dir),
    "groups": len(groups),
    "variantSourceFiles": len(tasks),
    "runtimeFilesExpected": len(tasks) * len(sizes),
    "sizes": sizes,
    "missingVariants": missing_variants,
    "ambiguousDisplayNames": manifest["ambiguousDisplayNames"],
    "idMapping": mapping_report,
  }
  qa_report_path = output_dir / "npc-portrait-qa-report.json"
  qa_report_path.write_text(json.dumps(qa_report, ensure_ascii=False, indent=2), encoding="utf-8")

  summary = {
    "source": str(source_dir),
    "out": str(output_dir),
    "groups": len(groups),
    "convertedFiles": converted,
    "manifest": str(manifest_path),
    "qaReport": str(qa_report_path),
    "missingVariantGroups": len(missing_variants),
    "ambiguousDisplayNames": len(manifest["ambiguousDisplayNames"]),
    "mappedRegularNpcIds": mapping_report["mapped"]["regular"],
    "mappedHiddenNpcIds": mapping_report["mapped"]["hidden"],
    "mappedRandomNpcTemplateIds": mapping_report["mapped"]["random"],
  }
  print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
  main()
