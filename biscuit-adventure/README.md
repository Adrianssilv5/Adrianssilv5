# Biscuit's Big Adventure

A one-minute film starring Biscuit. Biscuit walks through seven worlds, each drawn in a different art style. A new dog friend shows up in every world, and every scene change morphs the style in place around Biscuit. At the end, everyone poses for a group photo.

| Time | Style | Place | Friend | Transition into the next world |
| --- | --- | --- | --- | --- |
| 0:00 | Pencil sketch | The Sketchbook | (Biscuit is drawn live) | ink iris |
| 0:07 | Flat vector | Sunny Park | Pepper the Dalmatian | pixelation |
| 0:15 | Pixel art | 8-Bit City | Mochi the Pug | signal glitch |
| 0:22 | Neon synthwave | Night Drive | Disco the Poodle | torn paper |
| 0:30 | Paper cut | Mountain Sunset | Juniper the Husky | watercolor bleed |
| 0:37 | Watercolor | The Seaside | Noodle the Dachshund | halftone dots |
| 0:45 | Pop art | Comic City | Waffles the Corgi | clock wipe |
| 0:52 | Soft 3D | The Group Photo | everyone | camera flash, then a polaroid wall |

Everything is drawn and composed in code. There are no stock images, no AI image or video generators, and no audio samples.

- `biscuit-adventure.mp4` is the finished film (1920×1080, 60 fps, 60 s, AAC stereo).
- `index.html` plays the film live in a browser.
- `js/dog.js` holds one parametric dog rig. Biscuit and all six friends come from the same parts with different settings (ears, tail, snout, legs, spots, mask and so on).
- `js/styles.js` has eight renderers that draw those same parts as pencil, flat vector, neon, paper cut, watercolor, pop art and soft 3D. Pixel art is made by rendering flat vectors at 1/8 resolution and snapping them to a palette.
- `js/scenes.js` builds the seven worlds and the finale. `js/main.js` runs the style-morph transitions.
- `js/timeline.js` sets the timing. Walking distance is integrated ahead of time, so the paws never slide against the scrolling ground.
- `music.mjs` synthesizes the soundtrack, sound effects included. It runs at 128 BPM, so each world is exactly four bars, and each world has its own instruments: music box, ukulele, chiptune, synthwave, marimba, Rhodes, brass, and the whole band for the finale.
- `render.mjs` captures every frame with Playwright and muxes the video with the soundtrack using ffmpeg.

```sh
npm install
npm run render    # writes soundtrack.wav, then biscuit-adventure.mp4 (needs ffmpeg)
npm run stills    # quick PNG stills into ./out
```

Fonts (all SIL Open Font License, bundled in `fonts/`): Fraunces, Space Grotesk, Caveat, Press Start 2P and Bangers.
