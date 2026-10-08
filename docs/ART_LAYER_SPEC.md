# Neon Strike — Painted Backdrop Layer Spec (Step 2)

What to make, at what size, in what style, so painted art drops straight into the game's
parallax renderer. Written alongside v25.1 (the code-drawn stained-glass Cathedral). The
painted layers replace the *static* parts of each Arc; the *living* parts — glowing glass,
light shafts, floor light pools, particles, KO flares, the Instinct colour shift — stay in
code and sit on top of / between your layers.

---

## 1. The one rule: the fight stays the brightest, sharpest thing on screen

The game is read through three lanes and a red → white attack flash on each. Everything in
this spec exists to sit **behind** that read.

| Zone (on the 1000 × 600 game frame) | y range | What may live there |
|---|---|---|
| **Sky / back wall** | 0 – 175 | Your focal art: windows, crowns, skylines. Brightest painted area allowed. |
| **Fight band** | 175 – 470 | Dim, low-contrast, low-detail. No hard bright edges, no red or white highlights, nothing lane-shaped (no long horizontal lines). |
| **Floor / foreground** | 470 – 600 | Floor texture, rubble, framing silhouettes. |

Lane rails sit at **y = 210, 330, 450**. Fighters stand on those lines and are ~110–130 px tall.

**Brightness ceiling inside the fight band:** no pixel brighter than ~25% luminance after the
layer is in place. Check with a greyscale preview: lanes and stick fighters must pop clearly.

**Colours to avoid in the fight band:** pure red (`#ff0055` is the "attack winding up" tell),
pure white (the "slip now" tell), amber `#ffaa00` (lane hazard warning).

---

## 2. Layers per Arc

Each Arc gets **5 painted layers**, listed back to front. The game scrolls them horizontally at
different speeds (parallax), so **every layer except L1 must tile seamlessly left-to-right**.

| Layer | Name | Parallax | Size (master) | Alpha | Contents |
|---|---|---|---|---|---|
| L1 | Sky / void | 0 (static) | 2000 × 1200 | Opaque | Base colour field, distant glow, haze. No hard detail. |
| L2 | Far architecture | 0.05 | 4000 × 1200 tileable | Transparent | Distant arcades / skyline. Soft, fogged toward L1's colour, slightly blurred. |
| L3 | Hero set piece | 0.1 | 2000 × 1200 | Transparent | The Arc's focal object (rose window frame, eclipse crown…). Leave glass **openings empty/transparent** — the code fills them with live glass. |
| L4 | Mid structure | 0.4 | 4000 × 1200 tileable | Transparent | Columns, buttresses, pistons. Dark, rim-lit on one side only. |
| L5 | Foreground framing | 1.1 | 4000 × 1200 tileable | Transparent | Near-black silhouettes **only** in y 0–140 (arch tops, chains, banners) and y 940–1200 (rubble, railings). Fully transparent between. Will be lightly blurred in-engine. |

Masters are 2× the game frame (1000 × 600). The game downsamples, so paint at 2×.

**Floor:** paint it into L1 (perspective floor below y ≈ 350 at 2×, ≈ 175 in game).
Vanishing point at centre, horizon at ~29% of height.

---

## 3. Style

- **Painted, not vector.** Visible brush texture, soft value shifts, worn stone. (Reference:
  Hollow Knight's backgrounds, Ori's atmospheric depth, Blasphemous' cathedral gloom.)
- **Atmospheric perspective.** Each layer further back is lighter, less saturated and closer
  to the Arc's fog colour. L2 should almost dissolve into L1.
- **Dark, cool values with one accent colour per Arc.** Glass and light are the only saturated things.
- **No characters, no text, no UI.**
- **Light comes from the glass / focal object**, so rim-light and cast shadows should agree with it.

---

## 4. Per-Arc briefs

Fog colour = the colour every far layer fades toward. Accent = the Arc's identity colour (also
used by the HUD and the code-drawn glass/light).

### Arc 1 · FOUNDATION — The Shattered Cathedral
- **Fog** `#0d1626` · **Accent** cyan `#22d3ee` (glass is multicolour: cyan, magenta, violet, amber)
- L2: a long nave of gothic arcades receding into blue haze.
- L3: the frame of a great rose window (stone tracery only — openings transparent), upper centre-right.
- L4: clustered gothic columns, cyan rim-light.
- L5: broken arch tops hanging from above; fallen masonry and a cracked pew-line along the bottom.
- *Prompt seed:* "painted gothic cathedral interior, dark blue atmospheric haze, receding stone arcades, hand-painted 2D game background, soft brush texture, moody, Hollow Knight style, empty, no people"

### Arc 2 · DISTORTION — The Cathedral, Glitching
- **Fog** `#071816` · **Accent** teal `#34d399`
- Same architecture as Arc 1 but *wrong*: arcades that repeat slightly offset, a column that
  stops mid-air, masonry floating a few pixels out of place. Paint the distortion; the code adds
  the moving glitch.
- L5: cables and broken scaffolding.
- *Prompt seed:* "painted gothic cathedral interior subtly fragmented and misaligned, teal haze, floating stone fragments, eerie, hand-painted 2D game background, dark, no people"

### Arc 3 · COMPRESSION — The Closing Nave
- **Fog** `#1a0505` · **Accent** red-coral `#f87171` (keep it coral, never the tell red `#ff0055`)
- A narrowing industrial nave: iron ribs, a massive ceiling slab on pistons, walls leaning inward.
- L4: hydraulic pistons and chains (the code animates a pump; paint them at rest).
- L5: grated floor edge, steam vents.
- *Prompt seed:* "painted industrial gothic tunnel narrowing to a point, heavy iron ribs, ceiling press machinery, deep red-black haze, ember glow, hand-painted 2D game background, oppressive, no people"

### Arc 4 · MIRAGE — The Mirrored Horizon
- **Fog** `#120a22` · **Accent** violet `#c084fc`
- A flooded cathedral: a still mirror-floor reflecting slender pillars, a horizon of mist.
- L3: floating prism shards (paint 4–6 separately on transparency, so the code can bob them).
- Keep the floor reflection very dark — Assassins are purple and must stay readable.
- *Prompt seed:* "painted flooded cathedral with mirror-still water floor reflecting thin pillars, violet mist, floating crystal shards, dreamlike, hand-painted 2D game background, dark, no people"

### Arc 5 · DOMINION — The Throne Room
- **Fog** `#0a0802` · **Accent** gold `#facc15`
- A vast throne hall: black monoliths, gold inlay, a colossal eclipse/crown sculpture behind.
- L3: the eclipse crown ring (paint the ring and spikes; leave the disc and rays to code).
- L5: banners and braziers framing the top; gold-veined marble steps at the bottom.
- *Prompt seed:* "painted colossal throne hall, black obsidian monoliths with gold inlay, giant eclipse crown sculpture, gold dust haze, hand-painted 2D game background, regal and ominous, no people"

### Boss chambers
No separate art. The game darkens the Arc's layers, adds a spotlight on the boss and a vignette.

---

## 5. Files & delivery

```
assets/arcs/arc1/L1_sky.webp      (opaque)
assets/arcs/arc1/L2_far.webp      (alpha, tileable)
assets/arcs/arc1/L3_hero.webp     (alpha)
assets/arcs/arc1/L4_mid.webp      (alpha, tileable)
assets/arcs/arc1/L5_fg.webp       (alpha, tileable)
… arc2 … arc5
```

- **Format:** WebP with alpha, quality ~82. Keep layered PSD/PNG masters outside the repo.
- **Budget:** ≤ 400 KB per layer, ≤ 2 MB per Arc. (The game loads one Arc ahead.)
- **Tiling check:** place two copies side by side and confirm there's no visible seam.
- **Greyscale check:** desaturate the full stack with fighters on top and confirm the lanes
  still read instantly.

## 6. What stays in code (don't paint these)

Glass panes and their glow · light shafts and floor pools · particles (dust, embers, sparks,
gold ash) · the Arc 2 glitch, Arc 3 piston pump, Arc 4 shimmer and prism bob · KO flares ·
the Instinct magenta shift and Zone inversion · lanes, tells, fighters, HUD.

## 7. Integration (Claude's side, once layers exist)

1. A loader per Arc (`render/arc_layers.js`) that preloads the next Arc's set during the current one.
2. Painted layers composite *under* the existing code effects in `render/arc_looks.js`; each
   Arc's code scene drops the shapes your layers replace.
3. If a layer fails to load, the code-drawn scene stays as the fallback, so the game never shows
   an empty background.
4. Mockups from the game for sign-off, the same as v25 / v25.1.
