# RYRA-439 — Launch intro timings

## Asset analysis (source of truth for the cut)

| | Before | After |
|---|--------|-------|
| `ryr_launch_animation.mp4` duration | **5.506 s** (132 frames @ 23.976 fps) | **3.754 s** (90 frames) |
| Tagline fully typed | ~3.55–3.65 s | same (trim ends ~0.1 s after) |
| Trailing still hold | ~3.65–5.51 s (~**1.85 s**) | **removed** |
| Overlay hard cap | 6000 ms | **4500 ms** |
| Fallback cap | 1200 ms | **1400 ms** |
| Post-end delay | 150 ms | 150 ms (unchanged) |

Expected visible overlay once fonts are ready: **~3.8–3.9 s** (tagline done @ 3650 ms JS gate or file end @ 3754 ms + 150 ms), within the 3.5–4 s target.

## Preview GIFs

- [intro-before.gif](./intro-before.gif) — full previous mp4 (includes still hold)
- [intro-after.gif](./intro-after.gif) — trimmed mp4 (ends on full tagline)
- [intro-end-frame.jpg](./intro-end-frame.jpg) — last frame after trim

## Device cold-start checklist

Force-quit → launch; record screen; measure first mint frame → first Welcome/Home paint.

- [ ] iOS device — target ~3.5–4 s; no white flash
- [ ] Android device — same
- [ ] Force `useFallback={true}` in `LaunchSplashVideo` — mark ~1.4 s then app starts
