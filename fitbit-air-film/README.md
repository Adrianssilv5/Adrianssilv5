# Fitbit Air, a concept film

A 60-second, fan-made, Apple-style product film for the **Google Fitbit Air** (the screenless tracker launched in May 2026). Everything in it is real-time 3D (three.js) with a type layer on top and a synthesized soundtrack. It uses no stock footage, no photos and no AI video. *Not affiliated with Google.*

| Time | Shot | Feature shown |
| --- | --- | --- |
| 0:00 | First light | No screen, no buttons; a double-tap lights the status LED |
| 0:04 | Hero | "Fitbit Air. All signal. No screen." |
| 0:08 | Scale | 5.2 g; 34.9 × 17 × 8.3 mm; 12 g with the band; half the size of Inspire 3 (per Google) |
| 0:12 | Exploded view | Recycled PC + PBT housing, vibration motor, Li-Po battery, Bluetooth 5.0 |
| 0:16 | Sensors light up | Optical heart rate, red + infrared, then the camera dives into the sensor |
| 0:20 | Rhythm | Background AFib alerts* |
| 0:22 | Pulse ocean | 24/7 heart rate, resting heart rate, HRV |
| 0:26 | Night falls | SpO2 overnight* |
| 0:30 | Constellations | Sleep stages, Sleep Score, breathing rate, skin temperature variation |
| 0:34 | Smart Wake | Silent haptic alarm in lighter sleep, up to 30 min early; double-tap to stop |
| 0:38 | Readiness → Ask Coach | Daily Readiness (free); Google Health Coach, built with Gemini (Premium) |
| 0:42 | Move | Steps, calories, Active Zone Minutes; auto-detected walk/run/ride/row/elliptical; Cardio Load ring |
| 0:46 | Seven days | Up to 7 days per charge; rain; 50 m water resistance; red low-battery LED |
| 0:50 | Charge | 5 min ≈ 1 day; full in about 90 min; magnetic charger |
| 0:52 | Bands | Obsidian, Fog, Lavender, Berry; Performance Loop, Active, Elevated Modern |
| 0:56 | End card | $99.99 in the US, requirements, disclaimer |

\* Not available in all regions.

## How it was made
- **Research:** Four research agents swept the launch coverage. Skeptical verifier agents then re-checked every claim, and 104 unverifiable claims were dropped. A second pass, with two independent checkers per claim, confirmed Ask Coach, adaptive plans, the Google Health app and band swapping. The on-screen copy uses only verified facts, with their qualifiers.
- **Review:** Four specialist reviewers critiqued 38 stills: facts, Apple-style art direction, product accuracy and pacing. A final pass verified the fixes.
- **Models (`js/models.js`):** The pod is a superellipsoid at the official 34.9 × 17 × 8.3 mm proportions. It has a sensor window, a side status LED, exploded internals, woven band loops in the launch colourways with matching buckle finishes, and the magnetic charger.
- **Shots (`js/shots.js`):** 16 scenes, cut on the bar lines of a 120 BPM score. `js/stage.js` holds the renderer, the studio environments and the type system (Inter / Inter Tight, the closest open match to San Francisco).
- **Music (`music.mjs`):** A synthesized score in D minor: felt piano, a heartbeat sub, two drops, a low-passed night section and silent haptic pulses.
- **Rendering (`render.mjs`):** Headless Chromium with SwiftShader WebGL captures every frame at 60 fps, and ffmpeg muxes in the soundtrack.

```sh
npm install
npm run render     # soundtrack.wav, then fitbit-air-film.mp4 (needs ffmpeg)
npm run stills     # PNG stills in ./out
```
Open `index.html` through any static server (for example `npx serve .`) to watch it live in a browser.

Licences: three.js (MIT, `vendor/three/LICENSE`); Inter and Inter Tight (SIL OFL). Product names are used for identification only.
