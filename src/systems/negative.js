// ==========================================
// v17 NEGATIVE (Arc 5 final boss) — reactive rules.
// A colour-inverted mirror of the Striker that fights with YOUR tools:
//   * Afterimage slip: punch it while it isn't OPEN and it may slip your punch,
//     leaving an echo in the lane it left that punches back after a telegraph.
//   * Counters your counters: throw a Counter-Charged hit while it isn't OPEN and
//     it may read it — the charge is spent, and it winds up a counter of its own.
// While it's OPEN (after its own attacks) neither reaction is available — bait,
// slip, then punish is the whole answer. Kept free of player/combat imports so
// combat.js can call it without an import cycle; bosses.js resolves the echoes.
// ==========================================
import { gameState as st } from '../state.js';
import { CONSTANTS } from '../constants.js';
import { random } from './rng.js';
import { spawnFloatingText, createShatter } from '../vfx_audio/effects.js';
import { playSound } from '../vfx_audio/audio.js';
import { telegraphLead } from './boss_rules.js';

export const ECHO_DELAY = 26; // >= BOSS_OFFENSE.minTelegraphLead: an echo is always telegraphed

export function invertHex(hex) {
    const h = String(hex || '#00ffff').replace('#', '');
    const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h.padEnd(6, '0').slice(0, 6);
    const n = parseInt(full, 16);
    return '#' + (0xffffff ^ n).toString(16).padStart(6, '0');
}

// v24 READ TELL (playtest: Negative "feels hard to read... the gap to hit/block
// him is weird"). Whether it will slip your next punch used to be a hidden roll
// on every hit. Now it's decided AHEAD of time — once its slip cooldown clears
// it either PRIMES (glows in YOUR colour: don't swing, make it attack and punish
// the opening) or doesn't (hit it freely). It re-decides every `rerollFrames`.
export const NEG_READ = { rerollFrames: 70 };
export function primeNegativeRead(en) {
    if (en.slipCooldown > 0) { en.readPrimed = false; return; }
    if ((en.readTimer = (en.readTimer || 0) - 1) > 0) return;
    en.readTimer = NEG_READ.rerollFrames;
    const m = en.arcMods || {};
    const was = en.readPrimed;
    en.readPrimed = random() < (m.echoChance || 0.35) * (en.phase === 2 ? 1.4 : 1);
    if (en.readPrimed && !was) playSound('feint_tell');
}

// Returns true if Negative NEGATES this hit (the caller treats it as a whiff).
export function negativeReact(en, buffActive) {
    if (en.slipCooldown > 0 || !en.readPrimed) return false; // v24: only ever when primed (and visibly so)
    en.readPrimed = false; en.readTimer = NEG_READ.rerollFrames;
    if (buffActive) {
        en.slipCooldown = 40;
        spawnFloatingText(en.x + 20, en.y - 150, 'READ YOU.', en.color);
        playSound('feint_tell');
        // its own counter: a full, honest telegraph, then a heavier blow
        en.currentMove = 'cross';
        en.attackCooldown = telegraphLead(en) + 2;
        en.telegraphed = false;
        return true;
    }
    en.slipCooldown = 36;
    const oldLane = en.lane;
    const lanes = [oldLane - 1, oldLane + 1].filter(l => l >= 0 && l <= 2);
    en.lane = lanes[Math.floor(random() * lanes.length)];
    if (!st.enemyEchoes) st.enemyEchoes = [];
    st.enemyEchoes.push({ lane: oldLane, x: en.x, y: st.height * CONSTANTS.LANE_Y[oldLane], timer: ECHO_DELAY, fade: 20, fired: false, color: en.color });
    createShatter(en.x, en.y - 60, en.color);
    spawnFloatingText(en.x + 20, en.y - 150, 'AFTERIMAGE', en.color);
    playSound('ghost_step');
    return true;
}
