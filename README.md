# Travels

City and landscape photography from Mert Özdoğan's travels around Europe.
A separate site from the main portfolio (different GitHub repo, different
GitHub Pages URL), reusing the same visual language — but a different bar:
technically sharp, place-driven shots, filterable by city. No personal or
people-focused photos; that's what the main portfolio's Street/Documentary
work already covers.

## Adding a new city or new photos

```
python3 tools/travel_intake.py scan
```
Finds new batches (folders) in `incoming/`, builds contact sheets in `.travel/sheets/`.

Review each sheet for keepers — sharp, well-composed, no people/personal shots —
then for each one:
```
python3 tools/travel_intake.py promote <batch> <NAME> <slug> <city>
```
`<city>` is a lowercase slug (e.g. `ghent`, `brussels`) — it becomes the photo's
filter tag and the city label shown on its card. New cities need no HTML changes;
the filter pills are generated automatically from whatever cities are present.

Zoom in on a candidate before deciding:
```
python3 tools/travel_intake.py zoom <batch> <NAME> [<NAME> ...]
```

Close out a batch once it's fully reviewed:
```
python3 tools/travel_intake.py done <batch>
```

## Folder layout

```
travels/
├── index.html / styles.css / app.js   the site
├── images/<city>/{large,thumbs}/      published photos, per city
├── currently-live/                    originals of published photos + MANIFEST.csv
├── incoming/                          drop new batches here (one folder per shoot)
├── archive/                           reviewed batches (never scanned again)
└── tools/travel_intake.py             the intake engine (see above)
```

## Publishing

Nothing here pushes automatically. Promotion only edits local files; review the
site locally, then `git add -A && git commit && git push` when happy.
