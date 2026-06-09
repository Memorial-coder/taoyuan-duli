#!/usr/bin/env python3
import argparse
import json
import os
import re
import zipfile
from collections import defaultdict
from concurrent.futures import ProcessPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageOps


VARIANT_RE = re.compile(r"^(?P<base>.+)__(?P<variant>0[1-3])\.png$", re.IGNORECASE)

CATEGORY_ICON_SUFFIX = {
  "animal_product": "畜产品",
  "artifact": "古物",
  "bait": "鱼饵",
  "bomb": "炸弹",
  "crop": "作物",
  "elixir": "丹药",
  "fertilizer": "肥料",
  "fish": "鱼类",
  "food": "料理",
  "fossil": "化石",
  "fruit": "水果",
  "gem": "宝石",
  "gift": "礼物",
  "hat": "帽子",
  "machine": "机器",
  "material": "材料",
  "misc": "杂项",
  "ore": "矿石",
  "processed": "加工品",
  "ring": "戒指",
  "sapling": "树苗",
  "seed": "种子",
  "shoe": "鞋子",
  "sprinkler": "洒水器",
  "tackle": "渔具",
  "weapon": "武器",
}

ITEM_ICON_NAME_OVERRIDES = {
  "silk_cloth": "丝绸__材料",
  "hanhai_silk": "丝绸__材料__2",
  "processed_osmanthus_tea": "桂花茶__加工品",
  "spirit_dragon_pearl": "龙珠__杂项",
  "tree_lychee": "荔枝__水果",
  "wild_mulberry": "桑葚",
}

RUNTIME_FILTERED_CROP_SEED_IDS = {"ancient_seed", "hanhai_cactus_seed", "hanhai_date_seed"}


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


def display_name_for(base):
  return base.split("__", 1)[0]


def read_text(path):
  try:
    return Path(path).read_text(encoding="utf-8")
  except FileNotFoundError:
    return ""


def export_region(text, export_name):
  marker = re.search(rf"\bexport\s+const\s+{re.escape(export_name)}\b", text)
  if not marker:
    return ""
  start = marker.start()
  rest = text[start:]
  match = re.search(r"\nexport const\s+", rest[marker.end() - start:])
  if not match:
    return rest
  return rest[(0):marker.end() - start + match.start()]


def add_item_candidate(candidates, item_id, name, category, source):
  item_id = str(item_id or "").strip()
  name = str(name or "").strip()
  category = str(category or "").strip()
  if not item_id or not name:
    return
  candidates.append({
    "id": item_id,
    "name": name,
    "category": category,
    "source": source,
  })


def parse_id_name_pairs(text, category, source, prefix="", max_gap=180):
  candidates = []
  pattern = re.compile(
    rf"\bid:\s*'(?P<id>[^']+)'\s*,\s*name:\s*'(?P<name>[^']+)'",
    re.S,
  )
  for match in pattern.finditer(text):
    if match.end("name") - match.start("id") > max_gap:
      continue
    add_item_candidate(candidates, f"{prefix}{match.group('id')}", match.group("name"), category, source)
  return candidates


def parse_literal_item_defs(text):
  candidates = []
  pattern = re.compile(
    r"\bid:\s*'(?P<id>[^']+)'\s*,\s*"
    r"name:\s*'(?P<name>[^']+)'\s*,\s*"
    r"category:\s*'(?P<category>[^']+)'",
    re.S,
  )
  for match in pattern.finditer(text):
    if match.end("category") - match.start("id") > 360:
      continue
    add_item_candidate(candidates, match.group("id"), match.group("name"), match.group("category"), "items.ts")
  return candidates


def parse_crops(text):
  candidates = []
  pattern = re.compile(
    r"\{\s*id:\s*'(?P<id>[^']+)'\s*,\s*"
    r"name:\s*'(?P<name>[^']+)'\s*,\s*"
    r"seedId:\s*'(?P<seed>[^']+)'",
    re.S,
  )
  for match in pattern.finditer(text):
    add_item_candidate(candidates, match.group("id"), match.group("name"), "crop", "crops.ts")
    add_item_candidate(candidates, match.group("seed"), f"{match.group('name')}种子", "seed", "crops.ts")
  return candidates


def parse_fruit_trees(text):
  candidates = []
  pattern = re.compile(
    r"\{\s*type:\s*'(?P<type>[^']+)'\s*,\s*"
    r"name:\s*'(?P<name>[^']+)'.*?"
    r"saplingId:\s*'(?P<sapling>[^']+)'.*?"
    r"fruitId:\s*'(?P<fruit>[^']+)'.*?"
    r"fruitName:\s*'(?P<fruit_name>[^']+)'",
    re.S,
  )
  for match in pattern.finditer(text):
    add_item_candidate(candidates, match.group("fruit"), match.group("fruit_name"), "fruit", "fruitTrees.ts")
    add_item_candidate(candidates, match.group("sapling"), f"{match.group('name')}苗", "sapling", "fruitTrees.ts")
  return candidates


def collect_item_candidates(frontend_root):
  data_dir = Path(frontend_root) / "src" / "data"
  candidates = []

  candidates.extend(parse_crops(read_text(data_dir / "crops.ts")))
  candidates.extend(parse_literal_item_defs(read_text(data_dir / "items.ts")))
  candidates.extend(parse_id_name_pairs(read_text(data_dir / "recipes.ts"), "food", "recipes.ts", prefix="food_"))
  candidates.extend(parse_fruit_trees(read_text(data_dir / "fruitTrees.ts")))
  candidates.extend(parse_id_name_pairs(export_region(read_text(data_dir / "fish.ts"), "FISH"), "fish", "fish.ts"))
  candidates.extend(parse_id_name_pairs(export_region(read_text(data_dir / "weapons.ts"), "WEAPONS"), "weapon", "weapons.ts"))
  candidates.extend(parse_id_name_pairs(read_text(data_dir / "rings.ts"), "ring", "rings.ts"))
  candidates.extend(parse_id_name_pairs(read_text(data_dir / "hats.ts"), "hat", "hats.ts"))
  candidates.extend(parse_id_name_pairs(read_text(data_dir / "shoes.ts"), "shoe", "shoes.ts"))

  processing_text = read_text(data_dir / "processing.ts")
  candidates.extend(parse_id_name_pairs(export_region(processing_text, "PROCESSING_MACHINES"), "machine", "processing.ts", prefix="machine_"))
  candidates.extend(parse_id_name_pairs(export_region(processing_text, "SPRINKLERS"), "sprinkler", "processing.ts"))
  candidates.extend(parse_id_name_pairs(export_region(processing_text, "FERTILIZERS"), "fertilizer", "processing.ts"))
  candidates.extend(parse_id_name_pairs(export_region(processing_text, "BAITS"), "bait", "processing.ts"))
  candidates.extend(parse_id_name_pairs(export_region(processing_text, "TACKLES"), "tackle", "processing.ts"))
  candidates.extend(parse_id_name_pairs(export_region(processing_text, "BOMBS"), "bomb", "processing.ts"))

  return candidates


def resolve_icon_base_for_candidate(candidate, asset_bases, display_to_bases):
  item_id = candidate["id"]
  name = candidate["name"]
  category = candidate.get("category") or ""

  override = ITEM_ICON_NAME_OVERRIDES.get(item_id)
  if override and override in asset_bases:
    return override

  if name in asset_bases:
    return name

  suffix = CATEGORY_ICON_SUFFIX.get(category)
  if suffix:
    suffixed = f"{name}__{suffix}"
    if suffixed in asset_bases:
      return suffixed
    suffixed_matches = [base for base in display_to_bases.get(name, []) if base == suffixed or base.startswith(f"{suffixed}__")]
    if len(suffixed_matches) == 1:
      return suffixed_matches[0]

  display_matches = display_to_bases.get(name, [])
  if len(display_matches) == 1:
    return display_matches[0]
  return None


def build_by_id_entries(manifest, frontend_root):
  asset_bases = set(manifest["byName"].keys())
  display_to_bases = defaultdict(list)
  for base, entry in manifest["byName"].items():
    display_to_bases[entry.get("displayName") or display_name_for(base)].append(base)

  by_id = {}
  unmapped_attempts = []
  duplicate_ids = defaultdict(list)
  candidates = collect_item_candidates(frontend_root)
  runtime_duplicate_ids = defaultdict(list)
  for candidate in candidates:
    duplicate_ids[candidate["id"]].append(candidate)
    if not (
      candidate["source"] == "crops.ts"
      and candidate["category"] == "seed"
      and candidate["id"] in RUNTIME_FILTERED_CROP_SEED_IDS
    ):
      runtime_duplicate_ids[candidate["id"]].append(candidate)
    if candidate["id"] in by_id:
      continue
    base = resolve_icon_base_for_candidate(candidate, asset_bases, display_to_bases)
    if not base:
      unmapped_attempts.append(candidate)
      continue
    entry = dict(manifest["byName"][base])
    entry["itemId"] = candidate["id"]
    entry["category"] = candidate.get("category") or ""
    entry["source"] = candidate.get("source") or ""
    by_id[candidate["id"]] = entry

  duplicates = [
    {
      "id": item_id,
      "candidates": candidates_for_id,
    }
    for item_id, candidates_for_id in sorted(duplicate_ids.items())
    if len(candidates_for_id) > 1
  ]
  runtime_duplicates = [
    {
      "id": item_id,
      "candidates": candidates_for_id,
    }
    for item_id, candidates_for_id in sorted(runtime_duplicate_ids.items())
    if len(candidates_for_id) > 1
  ]
  unmapped = [candidate for candidate in unmapped_attempts if candidate["id"] not in by_id]

  return by_id, {
    "candidateIds": len({candidate["id"] for candidate in candidates}),
    "candidateRows": len(candidates),
    "mappedIds": len(by_id),
    "unmappedIds": unmapped,
    "duplicateIds": duplicates,
    "runtimeDuplicateIds": runtime_duplicates,
  }


def collect_groups(source_dir):
  groups = defaultdict(dict)
  for file_path in source_dir.glob("*.png"):
    match = VARIANT_RE.match(file_path.name)
    if not match:
      continue
    groups[match.group("base")][match.group("variant")] = file_path
  return dict(sorted(groups.items(), key=lambda item: item[0]))


def resize_to_webp(source_file, target_file, size, quality):
  target_file.parent.mkdir(parents=True, exist_ok=True)
  with Image.open(source_file) as image:
    image = ImageOps.exif_transpose(image).convert("RGBA")
    image = ImageOps.contain(image, (size, size), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    left = (size - image.width) // 2
    top = (size - image.height) // 2
    canvas.alpha_composite(image, (left, top))
    canvas.save(target_file, "WEBP", quality=quality, method=6)


def convert_variant_task(task):
  source_file, targets, quality, force = task
  written = 0
  skipped = 0
  source_file = Path(source_file)
  targets = [(int(size), Path(target_file)) for size, target_file in targets]

  pending = [
    (size, target_file)
    for size, target_file in targets
    if force or not target_file.exists()
  ]
  skipped = len(targets) - len(pending)
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


def build_zip(output_dir, zip_path):
  if zip_path.exists():
    zip_path.unlink()
  with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
    for file_path in sorted(output_dir.rglob("*")):
      if file_path.is_file():
        archive.write(file_path, Path("item") / file_path.relative_to(output_dir))


def main():
  repo_root = Path(__file__).resolve().parents[2]
  frontend_root = Path(__file__).resolve().parents[1]
  parser = argparse.ArgumentParser(description="Prepare Taoyuan item icons for runtime use.")
  parser.add_argument("--source", default=str(repo_root / "images" / "item"))
  parser.add_argument("--out", default=str(frontend_root / "public" / "item"))
  parser.add_argument("--sizes", default="128,256")
  parser.add_argument("--quality", type=int, default=82)
  parser.add_argument("--names", action="append", default=[])
  parser.add_argument("--limit", type=int, default=0)
  parser.add_argument("--workers", type=int, default=max(1, min(8, (os.cpu_count() or 2) - 1)))
  parser.add_argument("--force", action="store_true")
  parser.add_argument("--zip", action="store_true")
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
    "basePath": "/item",
    "defaultVariant": "01",
    "sizes": sizes,
    "byId": {},
    "byName": {},
    "byDisplayName": {},
    "ambiguousDisplayNames": [],
  }
  display_entries = defaultdict(list)
  converted = 0
  missing_variants = {}
  tasks = []

  for base, variants in groups.items():
    entry = {
      "name": base,
      "displayName": display_name_for(base),
      "variants": {},
    }
    missing = [variant for variant in ("01", "02", "03") if variant not in variants]
    if missing:
      missing_variants[base] = missing

    for variant, source_file in sorted(variants.items()):
      entry["variants"][variant] = {}
      targets = []
      for size in sizes:
        target_name = f"{base}__{variant}.webp"
        target_file = output_dir / str(size) / target_name
        entry["variants"][variant][str(size)] = f"{size}/{target_name}"
        targets.append((size, target_file))
      tasks.append((source_file, targets, args.quality, args.force))

    manifest["byName"][base] = entry
    display_entries[entry["displayName"]].append(entry)

  for display_name, entries in sorted(display_entries.items()):
    if len(entries) == 1:
      manifest["byDisplayName"][display_name] = entries[0]
    else:
      manifest["ambiguousDisplayNames"].append({
        "displayName": display_name,
        "names": [entry["name"] for entry in entries],
      })

  by_id_entries, id_mapping_report = build_by_id_entries(manifest, frontend_root)
  manifest["byId"] = by_id_entries
  manifest["stats"] = {
    "groups": len(groups),
    "variantSourceFiles": len(tasks),
    "runtimeSizes": sizes,
    "mappedItemIds": id_mapping_report["mappedIds"],
    "candidateItemIds": id_mapping_report["candidateIds"],
    "ambiguousDisplayNames": len(manifest["ambiguousDisplayNames"]),
    "missingVariantGroups": len(missing_variants),
  }

  output_dir.mkdir(parents=True, exist_ok=True)
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

  manifest_path = output_dir / "item-icon-manifest.json"
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
    "idMapping": id_mapping_report,
  }
  qa_report_path = output_dir / "item-icon-qa-report.json"
  qa_report_path.write_text(json.dumps(qa_report, ensure_ascii=False, indent=2), encoding="utf-8")

  zip_path = None
  if args.zip:
    zip_path = output_dir.parent / f"item-icons-{version}.zip"
    build_zip(output_dir, zip_path)

  summary = {
    "source": str(source_dir),
    "out": str(output_dir),
    "groups": len(groups),
    "convertedFiles": converted,
    "manifest": str(manifest_path),
    "qaReport": str(qa_report_path),
    "zip": str(zip_path) if zip_path else None,
    "missingVariantGroups": len(missing_variants),
    "ambiguousDisplayNames": len(manifest["ambiguousDisplayNames"]),
    "mappedItemIds": id_mapping_report["mappedIds"],
    "candidateItemIds": id_mapping_report["candidateIds"],
    "runtimeDuplicateIds": len(id_mapping_report["runtimeDuplicateIds"]),
  }
  print(json.dumps(summary, ensure_ascii=False, indent=2))
  if id_mapping_report["runtimeDuplicateIds"]:
    raise SystemExit("runtime duplicate item ids found; see item-icon-qa-report.json")


if __name__ == "__main__":
  main()
