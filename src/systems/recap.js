// ==========================================
// v20 DEATH RECAP
// "The game-over screen becomes a lesson." While you play, a small ring buffer
// keeps the last ~3 seconds of the screen (downscaled, every other frame). When
// the run ends it replays — the final second in slow motion — with what ended
// the run, what hurt you most, and one targeted tip. Any button skips it.
// ==========================================
import { gameState as st } from '../state.js';

export const RECAP = { w: 250, h: 150, every: 2, slots: 84, slowTail: 30 };

let slots = [], head = 0, count = 0, tick = 0;
let play = null; // { order: [canvas], i, sub, hold }

function ensureSlots() {
    if (slots.length) return true;
    try {
        for (let i = 0; i < RECAP.slots; i++) {
            const c = document.createElement('canvas');
            if (!c || typeof c.getContext !== 'function') return false;
            c.width = RECAP.w; c.height = RECAP.h;
            slots.push(c);
        }
        return true;
    } catch (e) { slots = []; return false; }
}

export function resetRecap() { head = 0; count = 0; tick = 0; play = null; }

// Called once per rendered frame while playing.
export function captureRecap(src) {
    if (!src || st.screen !== 'playing' || st.practice) return;
    if (++tick % RECAP.every) return;
    if (!ensureSlots()) return;
    try {
        const c = slots[head].getContext('2d');
        c.drawImage(src, 0, 0, RECAP.w, RECAP.h);
        head = (head + 1) % RECAP.slots; count = Math.min(RECAP.slots, count + 1);
    } catch (e) {}
}

export function recapFrameCount() { return count; }

// Tips keyed by damage source (what ended the run).
const TIPS = {
    grunt: 'Slip on the WHITE flash, not the red — an early slip is only Good.',
    assassin: 'Assassins bite through Guard. Read the quick white flash and slip.',
    bruiser: 'Bruisers wind up long and hit hard — wait out the red, then Cross to stagger.',
    zoner: 'Zoners shoot from range. Watch the edge chevrons, slip their lane or press in.',
    shield: 'Gold Armor eats Jabs — open with a Cross.',
    hazard: 'Amber pulsing lane = rail hazard. Step out before the white strike.',
    live_lane: 'A crackling lane is live — never stand in it when it fires.',
    negative_echo: 'The Negative replays your own moves — change your pattern.',
    boss: 'Bosses open up (cyan OPEN) after their combos. Punish then, slip otherwise — mashing gets countered.',
    unknown: 'Red = winding up, white = slip now.'
};
const BOSSES = ['neon_enforcer', 'phantom_boxer', 'static_monk', 'live_wire', 'negative'];
export function tipFor(src) { return TIPS[src] || (BOSSES.includes(src) ? TIPS.boss : TIPS.unknown); }

// PURE: the source that did the most damage across a run record.
export function topDamage(run) {
    const tot = {};
    for (const s of (run && run.stages) || []) for (const [k, v] of Object.entries(s.dmg || {})) tot[k] = (tot[k] || 0) + v;
    const top = Object.entries(tot).sort((a, b) => b[1] - a[1])[0];
    return top ? { src: top[0], dmg: top[1] } : null;
}

export function startRecapPlayback() {
    if (count < 10) return false;
    const order = [];
    for (let i = 0; i < count; i++) order.push(slots[(head - count + i + RECAP.slots) % RECAP.slots]);
    play = { order, i: 0, sub: 0, hold: 0 };
    return true;
}
export function recapPlaying() { return !!play; }
export function stopRecap() { play = null; }

// Advance + draw into the target canvas; returns false when the replay is over.
export function updateRecap(target) {
    if (!play || !target) return false;
    const n = play.order.length, slowFrom = n - Math.floor(RECAP.slowTail / 1);
    const slow = play.i >= slowFrom;
    try {
        const c = target.getContext('2d');
        c.imageSmoothingEnabled = true;
        c.drawImage(play.order[Math.min(play.i, n - 1)], 0, 0, target.width, target.height);
        if (slow) { c.fillStyle = 'rgba(255,0,85,0.10)'; c.fillRect(0, 0, target.width, target.height); }
    } catch (e) {}
    if (play.i >= n - 1) { if (++play.hold > 75) { play.i = 0; play.hold = 0; } return true; } // hold, then loop
    // capture was every 2nd frame -> play 1 slot / 2 frames = real time; the tail at half speed
    play.sub++;
    if (play.sub >= (slow ? RECAP.every * 2 : RECAP.every)) { play.sub = 0; play.i++; }
    return true;
}
