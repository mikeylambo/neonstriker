// ==========================================
// BOSS OFFENSE RULES (v16 audit)
// Playtest: "Boss battles don't feel real… I felt like I was just mashing on
// them, just to lose." Two rules make every boss exchange readable:
//   1. TELEGRAPH — every attack announces itself (sound + windup meter + red lane)
//      at least BOSS_OFFENSE.minTelegraphLead frames before it lands. Checked with
//      `<=` + a per-cycle flag, never `===`, so a sped-up cycle can't skip it.
//   2. PUNISH WINDOW — after every attack the boss slumps OPEN: it can't move or
//      attack, takes bonus damage, and its anti-mash defenses are switched off.
// Kept dependency-free (constants only) so combat/enemies/bosses can all read it
// without an import cycle.
// ==========================================
import { CONSTANTS } from '../constants.js';

const BO = CONSTANTS.BOSS_OFFENSE;

export function telegraphLead(en) {
    const mult = (en && en.arcMods && en.arcMods.punishWindowMult) || 1;
    return Math.max(BO.minTelegraphLead, Math.floor(BO.telegraphLead * mult));
}

export function punishFrames(en, move) {
    const mult = (en && en.arcMods && en.arcMods.punishWindowMult) || 1;
    const base = BO.punishFrames[move] || BO.punishFrames.jab;
    return Math.max(BO.minPunishFrames, Math.floor(base * mult));
}

export function beginPunishWindow(en, move) {
    const f = punishFrames(en, move);
    en.recoverTimer = f;
    en.recoverMax = f;
    en.punishShown = false;
    en.telegraphed = false;
}

// A boss is OPEN during its post-attack recovery, and for the Static Monk during
// its whole recharge (it teleports next to you — that IS its punish window).
export function isBossOpen(en) {
    if (!en || !en.isBoss) return false;
    if ((en.recoverTimer || 0) > 0) return true;
    return en.controller === 'static_monk' && en.currentMove === 'recharge';
}

// Cooldowns can never be shorter than a full telegraph, whatever speeds them up.
export function clampCycle(frames) {
    return Math.max(BO.minTelegraphLead + 2, Math.round(frames));
}
