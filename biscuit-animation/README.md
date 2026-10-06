# Biscuit, Graphic Designer

A 15-second animation of Biscuit (a cookie in a beret) designing a poster live in a design app:

| Time | Step | What happens |
| --- | --- | --- |
| 0–2s | Intro | Biscuit hops in and says hi |
| 2–5s | 01 Shape | Ellipse tool (with live W × H readout), then pen tool with bezier handles |
| 5–7.5s | 02 Color | Swatches panel, flood fills for ink, butter, mint and icing |
| 7.5–10s | 03 Type | Headline typed in, tracking tightened from +10 to −2, smart guide snaps it to center |
| 10–12.5s | 04 Polish | Sun rings, stars, grain, corner details, confetti, client says "Love it. No notes." |
| 12.5–15s | Outro | Biscuit takes a bow; title card |

- `biscuit.mp4` is the rendered video (1920×1080, 60 fps, 15.0 s).
- `index.html` is the source, hand-built SVG driven by one `render(t)` function. Open it in a browser to watch it loop live.
- `render.mjs` captures every frame with Playwright and encodes it with ffmpeg.

```sh
npm install
npm run render          # rebuilds biscuit.mp4 (needs ffmpeg on PATH)
npm run stills          # PNG stills into ./out for quick review
```

Fonts: [Fraunces](https://fonts.google.com/specimen/Fraunces) and [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk), both under the SIL Open Font License, bundled in `fonts/`.
