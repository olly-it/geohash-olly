# geohash-olly

Geohash viewer on a map (HTML + JS, no build step). Select a geohash and move across its neighbours of the same precision, even when the parent changes.

## Running

It uses ES modules, so it must be served over HTTP:

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000. On startup `u0n` (precision 3) is selected and the map is zoomed to fit the cell; you can pass another geohash in the URL, e.g. `http://localhost:8000/#u0nd9`.

It can also be published as-is with GitHub Pages (Settings → Pages → Deploy from branch `main`, folder `/`).

## Features

- Selection: click the map (at the current precision) or type the code.
- Precision 1–12 via the slider or the `+` / `-` keys.
- The 8 neighbours are drawn on the map and in a 3×3 grid in the side panel:
  - red: selected
  - blue: neighbour with the same parent
  - orange: neighbour with a different parent (the changing part of the code is highlighted in the panel)
  - dashed: parent
- Navigation: arrows / WASD, `Q` `E` `Z` `C` for diagonals, or click a neighbour.
- "Grid in view" option to show every cell of the current precision.
- Antimeridian handling (longitude wraps); there are no neighbours beyond the poles.

## Files

- [index.html](index.html): layout, loads Leaflet from CDN
- [app.js](app.js): map, rendering, interaction
- [geohash.js](geohash.js): encode / decode / bounds / neighbours
- [style.css](style.css): styles

by Olly
