#!/usr/bin/env python3
"""
travel_intake.py — the mechanical half of the travels-site "add new city photos"
workflow. Sibling of tools/portfolio_intake.py in the main portfolio, same shape,
adapted for a separate site: a flat, city-filterable gallery of technically sharp
landscape/cityscape shots, no people-focused or personal photos.

BIG PICTURE
-----------
  1. scan       — find NEW batches in incoming/ and build a labeled contact sheet
                  so a human/Claude can eyeball the whole batch at a glance.
  2. zoom       — render full-size previews of chosen frames for a closer look.
  3. promote    — optimize a chosen original into the site, append it to the
                  flat gallery tagged with its city (EXIF baked into an
                  instax-style strip), and copy the original into currently-live/.
  4. done       — mark a batch processed (move it to archive/, log it).

Nothing here pushes to GitHub. Promotion only edits local files; publishing stays a
deliberate, reviewed step (git push) that a human approves.

The site is one flat gallery, filterable by city (pill buttons in the page, driven
by each photo's data-city attribute) — there's no fixed city list, just whatever
string you pass to `promote`. Curation bar: technically sharp, well-composed,
place-driven shots. No personal/people-focused photos — that's what the main
portfolio and its Street/Documentary work already covers.

USAGE
-----
  python3 tools/travel_intake.py scan
  python3 tools/travel_intake.py zoom <batch> <NAME> [<NAME> ...]
  python3 tools/travel_intake.py promote <batch> <NAME> <slug> <city>
  python3 tools/travel_intake.py done <batch>

  <batch>  = a folder name inside incoming/
  <NAME>   = a photo's filename stem (e.g. _DSC8367) or full filename
  <city>   = lowercase city slug, e.g. ghent, brussels — becomes data-city and
             the filter pill label (capitalized automatically)

Dependencies: Pillow.
"""

import csv
import glob
import os
import re
import sys
from datetime import date

try:
    from PIL import Image, ImageOps, ImageDraw, ExifTags
except ImportError:
    sys.exit("This script needs Pillow.  Install it with:  pip3 install Pillow")

# ---------------------------------------------------------------------------
# Paths (everything is derived from this file's location: tools/ -> travels/ root)
# ---------------------------------------------------------------------------
BASE      = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INCOMING  = os.path.join(BASE, "incoming")
ARCHIVE   = os.path.join(BASE, "archive")
LIVE      = os.path.join(BASE, "currently-live")
IMAGES    = os.path.join(BASE, "images")
INDEX     = os.path.join(BASE, "index.html")
STATE     = os.path.join(BASE, ".travel")
PROCESSED = os.path.join(STATE, "processed.log")
SHEETS    = os.path.join(STATE, "sheets")     # generated contact sheets / zooms

IMAGE_EXTS = (".jpg", ".jpeg", ".png", ".tif", ".tiff", ".webp")

# Output sizes — match the main portfolio's convention.
LARGE_EDGE, LARGE_Q = 2200, 82
THUMB_EDGE, THUMB_Q = 1100, 80


# ---------------------------------------------------------------------------
# Small helpers
# ---------------------------------------------------------------------------
def _load_processed():
    if not os.path.exists(PROCESSED):
        return set()
    with open(PROCESSED) as f:
        return {line.strip() for line in f if line.strip()}


def _images_in(folder):
    out = []
    for ext in IMAGE_EXTS:
        out += glob.glob(os.path.join(folder, f"*{ext}"))
        out += glob.glob(os.path.join(folder, f"*{ext.upper()}"))
    return sorted({os.path.normpath(p) for p in out})


def _find_one(batch_dir, name):
    """Resolve a photo by filename stem or full name inside a batch."""
    for p in _images_in(batch_dir):
        b = os.path.basename(p)
        if b == name or os.path.splitext(b)[0] == name:
            return p
    return None


def _next_rank(city):
    """Next NN prefix for this city, based on the highest already in images/<city>/large."""
    mx = 0
    large_dir = os.path.join(IMAGES, city, "large")
    for p in glob.glob(os.path.join(large_dir, "*.jpg")):
        m = re.match(r"(\d+)-", os.path.basename(p))
        if m:
            mx = max(mx, int(m.group(1)))
    return mx + 1


def _optimize(src, dest, edge, quality):
    im = Image.open(src)
    im = ImageOps.exif_transpose(im)          # respect camera rotation
    im = im.convert("RGB")
    im.thumbnail((edge, edge), Image.LANCZOS)
    im.save(dest, "JPEG", quality=quality)
    return im.size                            # (w, h) of the saved file


_EXIF_TAGS = {v: k for k, v in ExifTags.TAGS.items()}


def _exif_strip(src):
    """ƒ/stop · shutter · ISO · focal length, read from the file's real EXIF."""
    def ratio(x):
        try:
            return x[0] / x[1]
        except TypeError:
            return float(x)

    try:
        tags = Image.open(src)._getexif() or {}
    except Exception:
        tags = {}
    get = lambda name: tags.get(_EXIF_TAGS.get(name, -1))

    fnum, iso, exp, focal = get("FNumber"), get("ISOSpeedRatings"), get("ExposureTime"), get("FocalLength")
    parts = []
    parts.append(f"ƒ/{ratio(fnum):g}" if fnum else "ƒ/—")
    if exp:
        v = ratio(exp)
        parts.append(f"1/{round(1 / v)}" if v < 1 else f"{v:g}\"")
    else:
        parts.append("—")
    parts.append(f"ISO {iso}" if iso else "ISO —")
    parts.append(f"{round(ratio(focal))}mm" if focal else "—")
    return " &nbsp;·&nbsp; ".join(parts)


# ---------------------------------------------------------------------------
# Command: scan
# ---------------------------------------------------------------------------
def cmd_scan():
    if not os.path.isdir(INCOMING):
        sys.exit(f"No incoming/ folder at {INCOMING}")
    processed = _load_processed()
    batches = sorted(
        d for d in os.listdir(INCOMING)
        if os.path.isdir(os.path.join(INCOMING, d)) and not d.startswith(".")
    )
    new = [b for b in batches if b not in processed]

    if not batches:
        print("incoming/ is empty. Drop a folder of new photos in there, then re-run.")
        return
    if not new:
        print("No NEW batches. Already-processed:", ", ".join(sorted(processed)) or "(none)")
        return

    os.makedirs(SHEETS, exist_ok=True)
    for batch in new:
        bdir = os.path.join(INCOMING, batch)
        imgs = _images_in(bdir)
        print(f"\nNEW BATCH: {batch}  ({len(imgs)} photos)")
        if not imgs:
            print("  (no images found)")
            continue
        sheets = _contact_sheets(batch, imgs)
        for s in sheets:
            print("  contact sheet:", s)
    print("\nNext: a Claude review should open the contact sheet(s), pick the keeper(s) —")
    print("technically sharp, place-driven, no personal/people photos — then run:")
    print("  promote <batch> <NAME> <slug> <city>   and finally   done <batch>")


def _contact_sheets(batch, imgs, cols=5, thumb=380, per_sheet=20):
    pad, label = 14, 22
    out_paths = []
    chunks = [imgs[i:i + per_sheet] for i in range(0, len(imgs), per_sheet)]
    for si, chunk in enumerate(chunks, 1):
        rows = (len(chunk) + cols - 1) // cols
        cw, ch = thumb + pad, thumb + pad + label
        W, H = cols * cw + pad, rows * ch + pad
        sheet = Image.new("RGB", (W, H), (18, 18, 20))
        d = ImageDraw.Draw(sheet)
        for idx, fn in enumerate(chunk):
            r, c = divmod(idx, cols)
            x, y = pad + c * cw, pad + r * ch
            try:
                im = Image.open(fn)
                im = ImageOps.exif_transpose(im).convert("RGB")
                im.thumbnail((thumb, thumb), Image.LANCZOS)
            except Exception:
                continue
            sheet.paste(im, (x + (thumb - im.width) // 2, y + (thumb - im.height) // 2))
            stem = os.path.splitext(os.path.basename(fn))[0]
            d.text((x, y + thumb + 4), stem, fill=(220, 220, 220))
        out = os.path.join(SHEETS, f"{batch}_sheet{si}.jpg")
        sheet.save(out, quality=85)
        out_paths.append(out)
    return out_paths


# ---------------------------------------------------------------------------
# Command: zoom
# ---------------------------------------------------------------------------
def cmd_zoom(batch, names):
    bdir = os.path.join(INCOMING, batch)
    if not os.path.isdir(bdir):
        sys.exit(f"No such batch: incoming/{batch}")
    os.makedirs(SHEETS, exist_ok=True)
    for name in names:
        src = _find_one(bdir, name)
        if not src:
            print(f"  ! not found in batch: {name}")
            continue
        dest = os.path.join(SHEETS, f"{batch}__{os.path.splitext(os.path.basename(src))[0]}_zoom.jpg")
        _optimize(src, dest, 1500, 88)
        print("zoom:", dest)


# ---------------------------------------------------------------------------
# Command: promote
# ---------------------------------------------------------------------------
def cmd_promote(batch, name, slug, city):
    slug = re.sub(r"[^a-z0-9-]", "", slug.lower())
    if not slug:
        sys.exit("slug came out empty after cleaning; use lowercase-with-hyphens")
    city = re.sub(r"[^a-z0-9-]", "", city.lower())
    if not city:
        sys.exit("city came out empty after cleaning; use a lowercase slug, e.g. ghent")

    bdir = os.path.join(INCOMING, batch)
    src = _find_one(bdir, name)
    if not src:
        sys.exit(f"'{name}' not found in incoming/{batch}")

    rank = _next_rank(city)
    stem = f"{rank:02d}-{slug}"
    large_dir = os.path.join(IMAGES, city, "large")
    thumb_dir = os.path.join(IMAGES, city, "thumbs")
    os.makedirs(large_dir, exist_ok=True)
    os.makedirs(thumb_dir, exist_ok=True)
    large_path = os.path.join(large_dir, f"{stem}.jpg")
    thumb_path = os.path.join(thumb_dir, f"{stem}.jpg")
    if os.path.exists(large_path):
        sys.exit(f"{large_path} already exists — pick a different slug")

    w, h = _optimize(src, large_path, LARGE_EDGE, LARGE_Q)
    _optimize(src, thumb_path, THUMB_EDGE, THUMB_Q)
    exif = _exif_strip(src)

    with open(INDEX, encoding="utf-8") as f:
        html = f.read()
    marker = "<!-- INTAKE:gallery -->"
    if marker not in html:
        sys.exit(f"marker {marker} not found in index.html — cannot place the photo")
    alt = f"{slug.replace('-', ' ')}"
    city_label = city.replace("-", " ").title()
    figure = (f'<figure class="print" data-city="{city}">'
              f'<img class="shot" src="images/{city}/thumbs/{stem}.jpg" '
              f'data-full="images/{city}/large/{stem}.jpg" width="{w}" height="{h}" '
              f'loading="lazy" alt="{alt}" />'
              f'<div class="meta"><span class="citytag">{city_label}</span>'
              f'<span class="exif">{exif}</span></div></figure>\n        ')
    html = html.replace(marker, figure + marker, 1)
    with open(INDEX, "w", encoding="utf-8") as f:
        f.write(html)

    os.makedirs(LIVE, exist_ok=True)
    orig = os.path.basename(src)
    live_copy = os.path.join(LIVE, f"{city}__{stem}__{orig}")
    if not os.path.exists(live_copy):
        with open(src, "rb") as a, open(live_copy, "wb") as b:
            b.write(a.read())
    man = os.path.join(LIVE, "MANIFEST.csv")
    new_file = not os.path.exists(man)
    with open(man, "a", newline="") as f:
        w_ = csv.writer(f)
        if new_file:
            w_.writerow(["slug", "city", "original_filename"])
        w_.writerow([stem, city, orig])

    print(f"promoted {orig}  ->  {city}/{stem}.jpg  ({w}x{h})")
    print("  wrote:", os.path.relpath(large_path, BASE))
    print("        ", os.path.relpath(thumb_path, BASE))
    print("  exif strip:", exif.replace("&nbsp;", " "))
    print("  edited: index.html   (alt text is a placeholder — improve it!)")
    print("  Review the site locally, refine the alt text, then commit & push to publish.")


# ---------------------------------------------------------------------------
# Command: done
# ---------------------------------------------------------------------------
def cmd_done(batch):
    bdir = os.path.join(INCOMING, batch)
    if not os.path.isdir(bdir):
        sys.exit(f"No such batch: incoming/{batch}")
    os.makedirs(ARCHIVE, exist_ok=True)
    dest = os.path.join(ARCHIVE, batch)
    if os.path.exists(dest):
        dest = os.path.join(ARCHIVE, f"{batch}-{date.today().isoformat()}")
    os.rename(bdir, dest)
    os.makedirs(STATE, exist_ok=True)
    with open(PROCESSED, "a") as f:
        f.write(batch + "\n")
    print(f"batch '{batch}' marked done -> moved to {os.path.relpath(dest, BASE)}")


# ---------------------------------------------------------------------------
def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    cmd = sys.argv[1]
    if cmd == "scan":
        cmd_scan()
    elif cmd == "zoom":
        if len(sys.argv) < 4:
            sys.exit("usage: zoom <batch> <NAME> [<NAME> ...]")
        cmd_zoom(sys.argv[2], sys.argv[3:])
    elif cmd == "promote":
        if len(sys.argv) != 6:
            sys.exit("usage: promote <batch> <NAME> <slug> <city>")
        cmd_promote(sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5])
    elif cmd == "done":
        if len(sys.argv) != 3:
            sys.exit("usage: done <batch>")
        cmd_done(sys.argv[2])
    else:
        print(__doc__)
        sys.exit(1)


if __name__ == "__main__":
    main()
