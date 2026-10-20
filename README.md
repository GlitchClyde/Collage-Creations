# Collage Creations

Combine 3 to 9 photos and/or videos into a single picture or a single video.

## Features
- Add 3-9 photos and videos (mix them freely). Reorder or remove them from the media list.
- Four layouts that adapt to the number of items and the canvas shape: Grid, Feature, Duo, Mosaic (cells of different sizes)
- Canvas sizes: 1:1, 4:5, 9:16, 16:9
- Editable frame: gap between cells, outer padding, corner radius, border width and color
- Any background color (color picker plus quick swatches)
- Download as PNG. If any item is a video, export the collage as a video (WebM, or MP4 on browsers that record it). Length matches the longest clip, up to 60 seconds. Shorter clips loop. Audio is not included.

Everything runs in your browser. Files are never uploaded.

## Run it
```bash
python3 -m http.server 8000
# open http://localhost:8000
```
Or enable GitHub Pages on the repo (Settings > Pages).

## Customize
- Add or change layouts: `getRects()` in `app.js` (each cell is `[x, y, width, height]` from 0 to 1)
- Canvas sizes: the `ASPECTS` list at the top of `app.js`

## New in v2
- **Edit each photo, Canva style:** click a photo in the preview, then drag to move it, scroll to zoom, or use the sliders (zoom, left/right, up/down, rotate) and Flip/Reset
- **Pattern backgrounds:** leopard, giraffe, panda, dalmatian, zebra and tiger prints (generated in `patterns.js`), alongside solid colors
- Cells glide smoothly when you change layout, canvas size, gap or padding (respects reduced-motion settings)
- Font: Inter (loaded from Google Fonts; falls back to the system font offline)
