# Agent handoff: Mert Özdoğan's photography sites

You are taking over curation and publishing for two photography websites. This
file is the complete brief. An identical copy lives in both repos, so reading
either one is enough.

Both repos are **public**, and so is this file. Never write anything private here
or in a commit message (see rule 2).

## 1. The two sites

| | Main portfolio | Travels |
|---|---|---|
| Repo | `MrtOzdgn/portfolio` (formerly `mertozdogan.github.io-`) | `MrtOzdgn/travels` |
| Live | https://mrtozdgn.github.io/portfolio/ | https://mrtozdgn.github.io/travels/ |
| Purpose | Flagship. Mert gets jobs from this page. | A visual record of places he has been. |
| Bar | Ruthless. Most photos fail. | Moderate. Good, sharp, shows the place. |
| Size | 19 photos | 61 place photos + 8 cars |
| Layout | One flat gallery, best first, no categories | One gallery, filtered by city, plus a separate Cars button |

Both are plain static HTML/CSS/JS on GitHub Pages, deployed from `main` at the repo
root. There is no build step: a push to `main` is a publish, usually live within a
minute or two.

## 2. Hard rules

1. **Nothing is published without Mert's explicit approval.** Propose first, then
   wait. Skip the wait only when he says so for that batch ("your picks are fine,
   just push them"). That permission does not carry over to the next batch.
2. **Never put private material in these repos**, not even briefly. Git history is
   public and effectively permanent. That covers original files, unreviewed photos,
   client or event work, and personal details. Only finished web-size images of
   approved photos go in.
3. **No family photos, on either site, however good they are.** Mert gives the
   specifics of this rule privately in chat. They are deliberately not written here.
   If someone in a photo could be a relative, reject the frame and ask him.
4. **No posed photos of friends or family, on either site.** Candid strangers are
   fine. If you can't tell a stranger from someone he knows, ask.
5. **A photo lives on one site only.** If a Travels photo is promoted to the main
   portfolio, remove it from Travels in the same piece of work.
6. **Removed means removed.** Never restore a photo from git history, and don't
   re-add anything listed in section 5 under "Mert's explicit decisions".
7. **Client and event work never goes on either site.** It is handled separately
   and is out of scope for you.
8. **Don't rewrite git history or force-push** unless Mert explicitly asks.

## 3. What you can and can't do from GitHub

You don't have Mert's computer. These local things are not in the repos:

- `incoming/` (new photos), `archive/` (reviewed batches) and `currently-live/`
  (originals of published photos, with `MANIFEST.csv`)
- `portfolio_intake.py`, the main-site intake script. It isn't in the repo. Travels
  has `tools/travel_intake.py`, but it needs those local folders, so treat it as a
  reference for the exact behaviour rather than something you can run.
- All other projects. Don't ask for them.

**How photos reach you.** Mert has to give them to you, normally as attachments in
chat. Never ask him to commit unreviewed photos to these repos as a way of sharing
them, because that breaks rule 2.

**If you can't write to the repo,** do the judging, then give Mert the exact changes
to apply. **If you can't process images,** ask him to run the resize himself and send
you the `large` and `thumbs` files plus their dimensions.

## 4. Choosing the site for a photo

Ask these in order:

1. Family, or a posed friend? **Reject.**
2. Client or event work? **Out of scope.**
3. A car? **Travels, Cars category.** Cars are not judged on merit: every car photo
   Mert supplies goes in, unless it's a duplicate.
4. Genuinely portfolio-tier? Propose it for the **main portfolio** (section 5).
5. Shows what a place looks like, and is sharp and well composed? **Travels** (section 6).
6. Otherwise, **pass**. Passing on a whole batch is a normal, useful result.

## 5. Main portfolio: judging merit

**The bar.** Would a stranger stop on this photo? Judge story, moment, light and a
human or emotional anchor, not technical cleanliness. An unrepeatable moment beats a
pleasant, well-exposed shot. "Nice photo" is a rejection.

- Adding one strong frame to the gallery is a good outcome. Five from one batch
  almost certainly means you're over-promoting.
- Mert's strongest genre is street and documentary. Landscape and equestrian action
  are his secondary strengths.
- The gallery should show range. A new photo that only repeats a mood already
  present needs to beat the existing one, not just match it.
- Be blunt. He asks for honest, ruthless feedback and will push back with "is it
  really on par?". Answer by comparing against the specific live frames it would sit
  next to, and change your verdict if the comparison doesn't hold up.

**Current order.** The first rows matter most:

```
01 man-on-bench-bw                  08 night-motorcyclist        15 cappadocia-valley-road
02 tuxedo-man-crowd-bruges-bw       09 highway-sunset-overpass   16 fishermen-galata-bridge
03 boat-silhouette-bw               10 stormy-beach-mountains    17 golden-sunset-rocks
04 abbey-doorway-canon-bw           11 cappadocia-blue-rock      18 ginger-cat-istanbul
05 pipe-smoking-cyclist-bruges      12 bluehour-highway-skyline  19 accordion-player-ghent
06 hand-reaching-horse-bridle-bw    13 grey-racehorse-hood
07 racehorse-red-jockey             14 cappadocia-ridge-hiker
```

**Benchmarks.** The strongest frames are the man on the bench, the pipe-smoking
cyclist and the accordion player: each has one clear human anchor you can read at a
glance. The weaker end is the fishermen, the ginger cat and the night motorcyclist.
Slot numbers don't track this exactly, because the order also balances genre. Use
these frames as the comparison when you judge whether something is "on par".

**Mert's explicit decisions:**

- The page leads with black-and-white street and documentary work. He rejected a
  pure merit order that put the motorcycle and racehorse at the top.
- He picks the final order. Propose a slot, but expect him to move it.

**Worked examples:**

| Photo | Verdict | Why |
|---|---|---|
| Elderly cyclist smoking a pipe, Bruges | Promoted | Strong character, single clear subject |
| Hand reaching for a horse's bridle, B&W | Promoted | A real, quiet moment. Moved here from Travels. |
| Man in tuxedo in a crowd, Bruges, B&W | Promoted | Tension between subject and crowd. Best of a burst. |
| Two strangers walking through a gate at night, seen from behind | Passed | Good light, but atmosphere carries it, there's no face or gesture, and it repeats the night motorcyclist's mood. Bottom-third at best. |
| Bike taillight glowing against a mural | Passed | Beautiful but an object, with no human or moment |
| Posed portraits at a mural | Passed | Competent, but posed. Not decisive moments. |
| Used-car listing shoot | Passed | Commercial snapshots with no story |

## 6. Travels: rules and order

**The bar.** Place-driven: "this is what Ghent looks like", rather than a standalone
art photo that happens to have been shot there. Landmarks, streets, canals,
architecture, local colour. Prefer sharp, well-composed frames that represent the
city well over adequate snapshots. Candid strangers are fine, personal photos are not.

**Current counts:** Ghent 23, Brugge 18, Antwerp 14, Leuven 5, Brussels 1, Cars 8.

**Order.** Each city's best and most representative photo comes first. The "All"
view follows page order, which runs in city blocks: Ghent, Leuven, cars 1-5, Brussels,
Brugge, Antwerp, cars 6-8. Add a new city as a new block before the
`<!-- INTAKE:gallery -->` marker.

**Mert's explicit decisions:**

- Ghent: `man-in-yellow-blazer` stays last, because it blocks the scenic photos.
- Antwerp: `chinatown-gate-tram` leads, followed by the central station frames.
- Brussels: only `equestrian-statue-blue`. He deleted the two Grand Place photos.
- Bruges: the beer-sign gable was removed.

**Cars are a special case:**

- Files go in `images/car/`, singular, but the tag is `data-city="cars"`, plural. This
  mismatch is intentional in the current site, so keep it.
- Cars appear only under the separate Cars button. They're excluded from "All" and
  from every city filter. `app.js` handles this from the tag.
- The `.citytag` label shows the real city where the car was shot, such as `Brugge`.
  Don't guess it. Ask Mert if you don't know.

**City pills generate automatically** from `data-city` values, so a new city needs no
filter code.

## 7. The review routine

1. Look at the whole batch first, then inspect finalists at full size for sharpness,
   edges, distractions and heavy editing.
2. Reply with a shortlist: each finalist gets **promote / hold / pass** with a one-line
   reason, plus the site, proposed slug and proposed position. Refer to photos by their
   filename (for example `_DSC1234`). Keep it short.
3. **Stop and wait for approval.**
4. Publish approved photos (section 8), then verify (section 9).
5. Report exactly what changed, with the commit and final photo count.

## 8. Publishing mechanics

**Image processing.** Apply the camera's rotation, convert to RGB, resize with Lanczos
keeping the aspect ratio, and save as JPEG:

| Output | Longest edge | JPEG quality |
|---|---|---|
| `large` (lightbox) | 2200 px | 82 |
| `thumbs` (grid) | 1100 px | 80 |

```python
from PIL import Image, ImageOps

def optimize(src, dest, edge, quality):
    im = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
    im.thumbnail((edge, edge), Image.LANCZOS)
    im.save(dest, "JPEG", quality=quality)
    return im.size  # the large image's size goes in width/height
```

**Naming.** `NN-short-descriptive-slug.jpg`, lowercase with hyphens. `NN` is the
two-digit rank. Main portfolio paths are `images/{large,thumbs}/`. Travels paths are
`images/<city>/{large,thumbs}/`, with `NN` counted within that city.

**Main portfolio figure.** One line, inserted in the right position inside
`<div class="masonry" id="masonry">`:

```html
<figure class="print"><img class="shot" src="images/thumbs/NN-slug.jpg" data-full="images/large/NN-slug.jpg" width="W" height="H" loading="lazy" alt="DESCRIPTION" /><div class="exif">ƒ/5 &nbsp;·&nbsp; 1/160 &nbsp;·&nbsp; ISO 800 &nbsp;·&nbsp; 30mm</div></figure>
```

**Travels figure:**

```html
<figure class="print" data-city="ghent"><img class="shot" src="images/ghent/thumbs/NN-slug.jpg" data-full="images/ghent/large/NN-slug.jpg" width="W" height="H" loading="lazy" alt="DESCRIPTION" /><div class="meta"><span class="citytag">Ghent</span><span class="exif">ƒ/5.6 &nbsp;·&nbsp; 1/1000 &nbsp;·&nbsp; ISO 100 &nbsp;·&nbsp; 36mm</span></div></figure>
```

**Details that are easy to get wrong:**

- `width` and `height` are the **large** image's real pixel size.
- `alt` must be a real descriptive sentence. Screen readers and search engines read it.
- **EXIF strip:** the order is ƒ-stop, shutter, ISO, focal length, read from the
  **original** file. Resized web files lose this data. Never invent values. If you
  can't read them, ask Mert. Unknown fields render as `ƒ/—`, `—`, `ISO —`, `—`.
- **Never remove `<!-- INTAKE:gallery -->`** from either `index.html`. Mert's local
  scripts need it to insert photos.
- A `.gif` is allowed (`ghent/14-tower-lamppost-animation.gif`). Its figure simply
  references that filename.

**Reordering.** Display order comes from the order of `<figure>` lines in `index.html`.
On the main portfolio the `NN` prefix must match that order, so moving a photo means
renumbering it and everything between its old and new positions:

1. Rename in **two phases** so names don't collide: every affected file to a temporary
   name, then to its final name. Do this in both `large/` and `thumbs/`.
2. Update every reference in `index.html` (`src` and `data-full`), and `og:image` if
   that file is affected.
3. Reorder the `<figure>` lines to match.

**Layout: do not switch to CSS columns.** `app.js` deals the figures into columns
round-robin (1 column up to 560px, 2 up to 900px, otherwise 3), so the gallery reads
**left to right**. CSS `column-count` fills top to bottom, which scrambled the merit
order and was deliberately replaced. The lightbox follows the same master order.

**Commit.** Stage specific files and write a plain message such as `Add Antwerp night
street to Travels`. Keep private details out of commit messages. Never commit
`.DS_Store`.

## 9. Verify before saying it's done

Run this from the repo root after any change. It works on both sites:

```python
import os, re
from PIL import Image

html = open("index.html", encoding="utf-8").read()
figs = re.findall(r'<figure class="print".*?</figure>', html, re.S)
refs, problems = set(), []
for f in figs:
    src = re.search(r'src="([^"]+)"', f).group(1)
    full = re.search(r'data-full="([^"]+)"', f).group(1)
    w, h = (int(re.search(rf'{k}="(\d+)"', f).group(1)) for k in ("width", "height"))
    refs |= {src, full}
    for p in (src, full):
        if not os.path.exists(p):
            problems.append(f"missing file: {p}")
    if os.path.exists(full) and Image.open(full).size != (w, h):
        problems.append(f"wrong width/height: {full}")
    if re.search(r'alt="[a-z0-9 ]*"', f):
        problems.append(f"placeholder alt text? {full}")
on_disk = {os.path.join(r, n) for r, _, fs in os.walk("images") for n in fs if n != ".DS_Store"}
problems += [f"orphan file: {p}" for p in sorted(on_disk - refs)]
print(len(figs), "figures,", len(on_disk), "files")
print("\n".join(problems) or "OK")
```

Expected result: `OK` on the main portfolio. On Travels, one `wrong width/height`
warning for `14-tower-lamppost-animation.gif` is known and harmless (section 11).

After pushing, also confirm:

- The live page shows the new photo and the expected count.
- `git status` is clean, and only the files you meant to change were committed.
- The gallery still reads left to right, and on Travels the Cars and city filters still
  behave as section 6 describes.
- If a page looks out of date, it may be browser cache. Hard-refresh before debugging.

## 10. How Mert works

- Keep replies short and direct, and lead with the verdict.
- He wants honest judgment, including when it contradicts what he hoped for. Don't
  flatter, and don't defend an earlier call when a comparison shows it was wrong.
- He makes the final taste decisions. Give a clear recommendation, then follow his call.
- Say plainly what you did and didn't verify.

## 11. Known issues

Don't fix these without Mert's OK:

1. **Broken link on Travels:** the `Portfolio ↗` link in `index.html` still points to
   the old `mertozdogan.github.io-` address, which returns 404. It should be
   `https://mrtozdgn.github.io/portfolio/`.
2. **Broken link preview on the main portfolio:** `og:image` points to
   `images/large/01-ginger-cat-istanbul.jpg`, which no longer exists. The file is now
   `18-ginger-cat-istanbul.jpg`. Open Graph images also generally need an absolute URL.
3. **GIF dimensions:** `14-tower-lamppost-animation.gif` declares its thumbnail size
   (600x900) rather than its large size (1067x1600). The ratio is the same, so it
   displays correctly.
4. **Stale README sections:** the main `README.md` still describes the old sectioned
   gallery and `<figure class="shot">`. Trust this file over that README.
