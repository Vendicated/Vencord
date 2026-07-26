# MusicTheme

Discord themed by whatever you're listening to, right now.

MusicTheme hooks into your live presence state, not a static config. Every time the track changes, it resamples the new album art and repaints Discord's background to match, no reload, no manual trigger.

Works with:
- **Spotify** — out of the box, via Discord's native Spotify integration
- **YouTube Music** — requires the [PreMiD](https://premid.app/) browser extension, which is what relays YouTube Music playback to Discord as Rich Presence in the first place. Without it, Discord has no YouTube Music activity to read, and the "React to YouTube Music" setting has nothing to react to.

---

### How it picks the color

Grabbing the average color of an image usually gives you mud. Most album art is one saturated color and a lot of near-black or near-white padding, and a naive average just blends them into gray.

Instead, MusicTheme:

1. Samples pixels from the album art (skipping near-transparent ones)
2. Runs k-means clustering to group pixels into color clusters
3. Scores each cluster on saturation, lightness, and population
4. Picks the cluster that's vibrant *and* common, not just the loudest single pixel

That score is deliberately weighted toward saturation (`0.7`) over lightness (`0.3`), which is why the accent color tends to land on "that one vivid color" in the cover art rather than an average beige.

The result gets converted to HSL and injected as a handful of Discord's own `--background-*` CSS variables, scaled to different lightness levels for each surface layer  so the whole client shifts together, not just one panel.

### Settings

| Setting | Description |
|---|---|
| **Transition duration** | How long the background fade takes, in ms |
| **Color clusters** | How many k-means clusters to compute, higher is more accurate, slower |
| **React to Spotify** | Toggle Spotify as a source |
| **React to YouTube Music** | Toggle YouTube Music as a source |


### Notes

- Only reacts to activities Discord reports as type `2` (Listening)
- Recomputes the color only when the track's `details` field changes, so it won't re-run on every presence tick
- If no supported activity is active, the injected stylesheet is removed and Discord returns to its normal theme
- **YouTube Music users:** you need [PreMiD](https://premid.app/) installed and running in your browser. MusicTheme reads Discord's presence data, it has no way to know what's playing unless something is already reporting it there.

---

<sub>Author: Glitchy</sub>