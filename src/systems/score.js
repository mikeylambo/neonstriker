// ==========================================
// LIVE SCORE (v16)
// Playtest: "Score feels meaningless on end screen, as it's not really visible
// during game play." Score is now earned live from specific actions, multiplied by
// the combo multiplier (and an accepted stage wager), shown on the HUD, and popped
// at the point of impact. The results screen ranks it and compares it to your PB.
// The math is exported as pure functions so the harness can pin it down.
// ==========================================
import { gameState as st } from '../state.js';
import { CONSTANTS } from '../constants.js';
import { spawnScorePop } from '../vfx_audio/effects.js';

const SC = CONSTANTS.SCORE;

// PURE: combo -> multiplier (1.0x, +0.25x every 5 combo, capped).
export function comboMultiplier(combo) {
    const steps = Math.floor(Math.max(0, combo || 0) / SC.comboStep);
    return Math.min(SC.maxComboMult, 1 + steps * SC.comboMultStep);
}

export function wagerMultiplier() { return st.wagerMult || 1; }

export function currentMultiplier() { return comboMultiplier(st.combo) * wagerMultiplier(); }

// Award points. `opts.noCombo` = flat bonus (stage clear): wager still applies,
// combo doesn't. Returns the points actually awarded.
export function addScore(base, x, y, opts = {}) {
    if (!base || base <= 0) return 0;
    const mult = opts.noCombo ? wagerMultiplier() : currentMultiplier();
    const pts = Math.round(base * mult);
    st.score = (st.score || 0) + pts;
    if (x !== undefined && y !== undefined && !opts.silent) spawnScorePop(x, y, pts, !!opts.big);
    return pts;
}

export function hitScore(punchType) {
    const H = SC.hit;
    if (punchType === 'jab3') return H.jab3;
    if (punchType === 'jab1' || punchType === 'jab2') return H.jab;
    if (punchType === 'hook' || punchType === 'check_hook') return H.hook;
    if (punchType === 'cross') return H.cross;
    return H.guard;
}

export function killScore(type) { return SC.kill[type] || SC.kill.grunt; }

// PURE: letter rank for a finished run. S additionally needs real defensive reads
// (at least one Perfect Slip per boss beaten, min 1) so it can't be farmed by
// face-tanking; A needs at least one Perfect Slip at all.
export function rankForRun({ score, slips = 0, bossKills = 0 }) {
    const R = SC.rank;
    let grade = 'C';
    if (score >= R.S) grade = 'S';
    else if (score >= R.A) grade = 'A';
    else if (score >= R.B) grade = 'B';
    const reqSlipsForS = Math.max(1, Math.min(bossKills, 3));
    if (grade === 'S' && slips < reqSlipsForS) grade = 'A';
    if (grade === 'A' && slips < 1) grade = 'B';
    return grade;
}

// PURE: the "vs personal best" line on the results screen.
export function pbDeltaText(score, prevBest) {
    if (prevBest === null || prevBest === undefined) return { text: 'FIRST RECORDED RUN', kind: 'new' };
    const d = score - prevBest;
    if (d > 0) return { text: `+${d.toLocaleString()} OVER YOUR BEST`, kind: 'up' };
    if (d === 0) return { text: 'TIED YOUR BEST', kind: 'even' };
    return { text: `${Math.abs(d).toLocaleString()} SHORT OF YOUR BEST`, kind: 'down' };
}
