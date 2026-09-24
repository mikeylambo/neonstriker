# Neon Strike: Instinct

A lane-based neon boxing game. Read the tell, slip on the white flash, cash the counter in.

## Play

Open `index.html` in a browser — that's it. The game ships as a single prebuilt bundle (`dist/game.bundle.js`), so it runs from a plain double-click with no server.

**Default controls** (remappable in Pause → Settings → Controls)

| Action | Keyboard | Gamepad |
|---|---|---|
| Slip up / down | ↑ / ↓ | D-pad / stick |
| Footwork (give ground / press forward) | ← / → (hold) | D-pad / stick |
| Ghost Step | Left Shift | LB / L2 |
| Jab / Cross / Hook | A / S / D | X / Y / B |
| Guard | W (hold) | RB / R2 |
| Instinct | Space | A |
| Pause | Esc / P | Start |

## Develop

```sh
npm install
npm run build        # rebuild dist/game.bundle.js from src/
npm test             # headless harness + v16/v17 suites (includes a bot that plays the real loop)
npm run smoke        # boots the shipped bundle in jsdom over file://
npm run smoke:http   # same, over http (covers persistence)
```

Run `npm run build` after any change under `src/` — `index.html` loads the bundle, not the modules.

Open `index.html?debug` for a dev hook on `window.__ns` (`jump(stage)`, `draft()`, `step(n)`, `mockOnboarding(scene)`).

## Layout

- `src/` — game source (ES modules): `systems/` (combat, finisher, knockdown, waves, wagers, score…), `entities/` (player, enemies, bosses), `render/`, `ui/`
- `tests/` — headless verification (`harness.mjs`, `v16.mjs`, `v17.mjs`, shared `bot.mjs`) and the browser smoke test
- `mockups/` — in-engine renders of the in-world onboarding prototype and v17 features

The optional global leaderboard uses a Supabase publishable key (client-safe, protected by row-level security). Submitting scores is opt-in.
