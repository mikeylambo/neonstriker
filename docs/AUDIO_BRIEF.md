# Neon Strike — Audio Brief

Every sound the game needs, with a ready-to-paste ElevenLabs prompt. The **ID** column matches the event name the code already fires (`playSound('<id>')`), so wiring is a straight swap from oscillator to sample. IDs marked **NEW** don't exist yet — Claude Code adds the trigger when wiring.

## How to generate

- **Sound effects:** ElevenLabs → Sound Effects. Paste the prompt, then add the style line below to the end of every prompt so the whole set sounds like one game.
- **Style line (append to every SFX prompt):** `neon arcade synthwave game sound, punchy, dry, tight tail, no music, no reverb wash`
- **Length:** set the duration in ElevenLabs to the value in the table (or the closest it allows), then trim silence.
- **Variants:** where the table says ×3, keep 3 different takes. The game picks one at random so repeated hits don't sound robotic.
- **Export & naming:** MP3, named `<id>.mp3`, or `<id>_1.mp3`, `<id>_2.mp3`… for variants. Drop them all in `audio/sfx/`, voice lines in `audio/vo/`, music in `audio/music/`.

## 1. Player offense

| ID | When it plays | Prompt | Length | Takes |
|---|---|---|---|---|
| `hit_jab` | Jab lands | Quick light boxing jab landing on a padded body, crisp snap with a small electric zap | 0.3s | ×3 |
| `hit_cross` | Cross lands | Heavy straight punch landing, deep thud with a bright electric crack on top | 0.4s | ×3 |
| `hit_hook` | Hook lands | Swinging hook punch connecting, meaty whump with a sideways neon whoosh into the impact | 0.4s | ×3 |
| `counter_hit` | Counter-charged punch lands | Massive counter punch impact, bass drop thump plus a sharp glass-like electric shatter, feels like a critical hit | 0.6s | ×2 |
| `whiff` **NEW** | Punch misses | Fast punch swinging through air, short airy whoosh with a faint electric hum | 0.2s | ×3 |
| `charge_ready` | Loaded Cross fully charged | Energy charging up then locking in, rising electric whine ending in a clean click-ping, like a charged buster shot ready | 0.5s | ×1 |
| `loaded_release` **NEW** | Loaded Cross thrown | Charged energy punch released, huge electric blast with a bass boom | 0.7s | ×1 |
| `bounce` | Punch deflected off a shield / armor (also a "locked" menu bump) | Punch glancing off a hard shield, dull metallic clank with an electric spark | 0.3s | ×2 |
| `body_collide` **NEW** | Enemy knocked back into another enemy | Two bodies colliding hard, dull body slam with an electric spark | 0.4s | ×2 |
| `vacuum` | Punch thrown with a slip buff — pulls the target in | Energy punch pulling a target inward, reverse whoosh into a short electric snap | 0.4s | ×1 |
| `punish` | You punish an open boss | Brutal punishing punch, hard crunch with a distorted bass hit and a bright sting | 0.5s | ×2 |
| `enemy_knockdown` **NEW** | Non-boss enemy floored | Body slamming onto a hard floor, heavy thud with a short neon crackle | 0.5s | ×2 |
| `shatter` | Enemy KO — body shatters into light | Figure shattering into shards of neon light, crystalline glass burst with a sparkling electric tail | 0.8s | ×3 |

## 2. Player defense

| ID | When it plays | Prompt | Length | Takes |
|---|---|---|---|---|
| `slip` | Normal slip | Quick body dodge, short cloth whoosh with a soft electric flutter | 0.25s | ×3 |
| `perfect_slip` | Perfect slip (white flash) | Perfect dodge, sharp rising neon shimmer with a crisp high chime, time-slows feeling | 0.5s | ×2 |
| `ghost_step` | Ghost Step dash | Instant teleport dash, electric blink with a phase-shift zip, like vanishing into light | 0.4s | ×2 |
| `afterimage_punch` **NEW** | Afterimage echo punch fires | Ghostly echoed punch, reversed whoosh into a hollow shimmering impact | 0.4s | ×2 |
| `guard_block` **NEW** | Punch blocked by Guard | Punch blocked by raised gloves, muffled leather thump with a low electric buzz | 0.3s | ×3 |
| `player_hurt` **NEW** | Player takes a hit | Boxer getting hit hard, body impact thud with a harsh distorted electric glitch | 0.4s | ×3 |
| `knockdown` | Player floored (ten-count starts) | Boxer collapsing to the canvas, heavy body fall thud, then crowd gasp, sound dulls like losing consciousness | 1.2s | ×1 |
| `get_up` **NEW** | Player beats the count | Boxer rising back up, rising electric power-up swell into a triumphant crowd roar burst | 1.2s | ×1 |

## 3. Enemy tells & attacks

| ID | When it plays | Prompt | Length | Takes |
|---|---|---|---|---|
| `jab_tell` | Enemy / boss winding up a quick attack | Short warning tick, sharp high electric blip, clearly readable alert | 0.15s | ×1 |
| `bash_tell` | Winding up a heavy attack | Heavy attack warning, low grinding electric charge that rises in pitch | 0.4s | ×1 |
| `feint_tell` | Phantom Boxer feint | Deceptive half-warning, glitched stuttering electric blip that cuts off early | 0.2s | ×1 |
| `zoner_tell` | Zoner beam charging | Laser cannon charging, rising sci-fi energy whine | 0.6s | ×1 |
| `laser` | Zoner beam fires | Sci-fi laser beam firing down a lane, sustained buzzing neon beam burst | 0.6s | ×2 |
| `sweep` | Bruiser / boss sweep | Wide low sweeping attack, heavy whoosh along the floor with a rumble | 0.5s | ×1 |
| `shock` | Live Wire electrified lane | High-voltage electric arc crackling across the floor, dangerous buzzing | 0.8s | ×2 |

## 4. Instinct & Zone

| ID | When it plays | Prompt | Length | Takes |
|---|---|---|---|---|
| `instinct_ready` **NEW** | Instinct meter full | Power meter full, bright synth chime with a soft glowing hum | 0.5s | ×1 |
| `instinct_activate` **NEW** | Instinct triggered | Power mode activated, surging electric swell with a heavy bass hit | 0.8s | ×1 |
| `zone` | Enter the Zone (colour inversion + slow-mo) | Time slowing down, deep bass whoomp as all sound drops underwater, then a sustained low shimmering tone | 1.2s | ×1 |
| `zone_exit` **NEW** | Zone ends | Time snapping back to normal speed, reversed swell ending in a sharp snap | 0.6s | ×1 |

## 5. Bosses & Finishers

| ID | When it plays | Prompt | Length | Takes |
|---|---|---|---|---|
| `boss_intro` **NEW** | Title-fight poster slams in | Epic fight poster slam, massive impact boom with electric crackle and crowd roar | 1.5s | ×1 |
| `stagger` | Boss staggered (Finisher begins) | Boss reeling, heavy stumble impact with a descending electric power-down | 0.8s | ×1 |
| `beat_tick` | Finisher prompt beat | Rhythmic metronome tick, tight neon click | 0.1s | ×1 |
| `finisher_hit` | Each Finisher prompt landed | Cinematic slow-motion punch impact, huge bass thump with bright electric flash | 0.6s | ×3 |
| `finisher_miss` | Finisher prompt missed | Missed timing, dull deflated thud with a short falling glitch | 0.4s | ×1 |
| `finisher_ko` | Finisher's final blow | Ultimate knockout punch, enormous impact explosion of light and bass, glass shatter, crowd erupts | 2.0s | ×1 |

## 6. Rounds & flow

| ID | When it plays | Prompt | Length | Takes |
|---|---|---|---|---|
| `bell` | Round start | Classic boxing ring bell, single clean ding, slightly metallic and bright | 1.2s | ×1 |
| `bell_end` **NEW** | Stage clear / boss down | Boxing bell rung three times fast, end of fight | 1.8s | ×1 |
| `billing_slam` **NEW** | "ROUND N — VENUE" card | Title card slamming onto screen, punchy whoosh into a neon sign buzzing on | 0.8s | ×1 |
| `transition_sweep` **NEW** | Walkout / light sweep between venues | Neon light sweep passing across the screen, long smooth electric whoosh | 1.5s | ×1 |
| `all_clear` **NEW** | ALL CLEAR bonus | Achievement unlocked, bright rising synth arpeggio | 1.0s | ×1 |
| `flawless` **NEW** | FLAWLESS bonus | Perfect achievement, shimmering sparkling synth chord with a crystal ping | 1.2s | ×1 |
| `ref_count` | Ten-count, counts 1–7 | Referee count beat, short firm thud like a hand slapping the canvas | 0.3s | ×1 |
| `ref_count_hi` | Ten-count, counts 8–10 | Urgent referee count beat, harder slap with a tense rising electric tone | 0.4s | ×1 |

## 7. Upgrades & progression

| ID | When it plays | Prompt | Length | Takes |
|---|---|---|---|---|
| `orb` | EXP / light shard picked up | Tiny neon pickup, soft bright blip | 0.15s | ×3 |
| `level_up` **NEW** | Evolution earned (draft incoming) | Level up, triumphant rising synth sweep with a sparkle | 1.0s | ×1 |
| `card_move` **NEW** | Moving between draft cards | Soft UI hover tick, glassy neon click | 0.08s | ×1 |
| `card_pick` **NEW** | Card confirmed | Satisfying selection, punchy neon click with a short rising tone | 0.3s | ×1 |
| `sting_orb` | Rank pick (identity moment) | Power acquired, clean bright synth sting, three rising notes | 0.8s | ×1 |
| `sting_mastery` | Verb rank / Mastery pick | Rare power acquired, rich five-note ascending synth sting with shimmer | 1.2s | ×1 |
| `sting_fusion` | Fusion pick — colour mix | Legendary power fusion, two tones merging into one huge chord, electric crackle, glowing shimmer | 1.8s | ×1 |
| `sting_apex` **NEW** | Apex pick (rank 5) | Ultimate power unlocked, epic cinematic synth swell with a bass hit and choir-like pad | 2.0s | ×1 |
| `sting_overclock` | Overclock pick | Small stat boost, quick two-note synth blip | 0.4s | ×1 |
| `locked` **NEW** | Selecting something unavailable | Denied, low short muted buzz | 0.2s | ×1 |

## 8. Menus & results

| ID | When it plays | Prompt | Length | Takes |
|---|---|---|---|---|
| `ui_move` **NEW** | Menu navigation | Crisp minimal neon UI tick | 0.06s | ×1 |
| `ui_confirm` **NEW** | Menu confirm | Clean neon UI confirm click with a small upward chirp | 0.2s | ×1 |
| `ui_back` **NEW** | Menu back / cancel | Soft neon UI click with a small downward chirp | 0.2s | ×1 |
| `pause` **NEW** | Pause opens | Game pausing, everything muffles with a soft low swoosh | 0.4s | ×1 |
| `unpause` **NEW** | Resume | Sound un-muffling back to normal, quick rising swoosh | 0.3s | ×1 |
| `score_tick` **NEW** | Results score counting up | Rapid digital counter tick | 0.05s | ×1 |
| `rank_reveal` **NEW** | Results letter rank lands | Grade stamp slamming down, heavy impact with a neon buzz | 0.6s | ×1 |
| `rank_s` **NEW** | S rank specifically | Top grade achieved, huge triumphant impact with sparkling shimmer and crowd cheer | 1.5s | ×1 |
| `new_best` **NEW** | New personal best | Record broken, celebratory rising synth fanfare | 1.2s | ×1 |
| `medal` **NEW** | Arc par medal earned | Medal awarded, metallic ring with a bright chime | 1.0s | ×1 |
| `unlock` **NEW** | New mode unlocked (Practice / Heat) | New feature unlocked, magical rising synth shimmer with a door-opening whoosh | 1.2s | ×1 |
| `heat_on` **NEW** | Heat modifier toggled on | Danger level rising, short aggressive distorted synth stab | 0.4s | ×1 |
| `game_over` **NEW** | Run ends | Defeat, slow descending synth tone with a final heavy body thud, sound fading out | 2.0s | ×1 |

## 9. Crowd & ambience (loops)

Generate these as seamless loops (turn on looping in ElevenLabs if available, or generate 10s and crossfade the ends).

| ID | When it plays | Prompt | Length |
|---|---|---|---|
| `amb_crowd` **NEW** | Under every regular stage | Large arena crowd murmuring and reacting, distant, steady, no loud cheers | 10s loop |
| `amb_crowd_boss` **NEW** | Under title fights | Packed arena crowd chanting and roaring with anticipation, intense but steady | 10s loop |
| `amb_neon` **NEW** | Very quiet bed under everything | Buzzing neon signs and electric hum in a large empty stone hall | 10s loop |
| `crowd_react` **NEW** | Big hits, KOs, perfect slips | Crowd reacting with a sudden "ooh!" to a big punch | 1.5s ×3 |

## 10. Announcer & ref voice

ElevenLabs → Text to Speech. Pick **one** voice for the ring announcer (deep, theatrical, boxing-announcer energy) and **one** for the referee (gruff, clipped). Keep lines short; set stability low-ish for more energy.

**Announcer** (`audio/vo/ann_<id>.mp3`)

| ID | Line |
|---|---|
| `ann_round_1` … `ann_round_10` | "Round one!" … "Round ten!" (the billing card shows higher numbers as text only) |
| `ann_final_round` | "Final round!" |
| `ann_title_fight` | "It's a title fight!" |
| `ann_boss_enforcer` | "The Neon Enforcer!" |
| `ann_boss_phantom` | "The Phantom Boxer!" |
| `ann_boss_monk` | "The Static Monk!" |
| `ann_boss_livewire` | "Live Wire!" |
| `ann_boss_negative` | "…Negative." (quiet, ominous) |
| `ann_fight` | "Fight!" |
| `ann_ko` | "Knockout!" |
| `ann_perfect` | "Perfect!" |
| `ann_flawless` | "Flawless!" |
| `ann_all_clear` | "All clear!" |
| `ann_zone` | "In the zone!" |
| `ann_new_record` | "New record!" |
| `ann_game_over` | "And he's down for good." |

**Referee** (`audio/vo/ref_<n>.mp3`)

| ID | Line |
|---|---|
| `ref_1` … `ref_10` | "One!" … "Ten!" — one file per number |
| `ref_get_up` | "Get up!" |
| `ref_box` | "Box!" |

## 11. Music

One track per Arc plus the set pieces. All loops should start and end on the bar so they repeat cleanly; the game ducks music under Finishers and the ten-count.

| ID | Where | Direction | Length |
|---|---|---|---|
| `mus_menu` | Title / menus | Moody neon synthwave, slow pulse, the Striker's theme | 1–2 min loop |
| `mus_arc1_foundation` | Arc 1 — Shattered Cathedral | Driving synthwave, steady four-on-the-floor, confident | 2–3 min loop |
| `mus_arc2_distortion` | Arc 2 — Glass Reliquary | Same energy, detuned / bit-crushed textures | 2–3 min loop |
| `mus_arc3_compression` | Arc 3 — Ashen Cloister | Tighter, faster, sidechained and pumping | 2–3 min loop |
| `mus_arc4_mirage` | Arc 4 — Midnight Causeway | Hazy, reverb-soaked melody over a hard beat | 2–3 min loop |
| `mus_arc5_dominion` | Arc 5 — Abyss Rail | Dark, heavy, near-industrial | 2–3 min loop |
| `mus_boss` | Title fights (Enforcer / Phantom / Monk / Live Wire) | Aggressive boss theme, higher BPM | 2 min loop |
| `mus_boss_negative` | Final boss | The menu theme's melody, inverted and menacing | 2–3 min loop |
| `mus_victory` | Beating Negative | Triumphant resolve of the Striker's theme | 30–60s |
| `mus_results` | Results screen | Calm, reflective neon outro | 1 min loop |
