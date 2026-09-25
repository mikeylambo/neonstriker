// ==========================================
// v20 ARC PAR + MEDALS
// Playtest: "a par… as a whole for the Arc, not each round." Each Arc has a
// target TIME and SCORE. When its boss falls the Arc is judged:
//   GOLD   — beat both par time and par score
//   SILVER — beat one of them
//   BRONZE — cleared it
// The medal pays a bonus and your best medal per Arc is kept in Records.
// Pars are PROVISIONAL (from bot runs); tune them from exported run data.
// ==========================================
import { gameState as st } from '../state.js';
import { CONSTANTS } from '../constants.js';

const KEY = 'neon_strike_arc_medals_v1';

// seconds / points, per Arc. Arc 1 is 5 rounds; Arcs 2+ are 7.
export const ARC_PAR = {
    1: { time: 330, score: 70000 },
    2: { time: 540, score: 160000 },
    3: { time: 600, score: 260000 },
    4: { time: 660, score: 380000 },
    5: { time: 720, score: 520000 }
};
export const MEDALS = {
    gold:   { label: 'GOLD',   color: '#facc15', bonus: 5000, rank: 3 },
    silver: { label: 'SILVER', color: '#e5e7eb', bonus: 2500, rank: 2 },
    bronze: { label: 'BRONZE', color: '#d97706', bonus: 1000, rank: 1 }
};

export function parFor(arc) { return ARC_PAR[Math.min(Math.max(1, arc), 5)]; }

// Called when an Arc begins (run start, and each new Arc).
export function arcParStart() { st.arcFrames = 0; st.arcStartScore = st.score || 0; }
// Called once per playing frame.
export function arcParTick() { st.arcFrames = (st.arcFrames || 0) + 1; }

export function arcLive() {
    const arc = CONSTANTS.getArcIndex(st.currentStage);
    return { arc, par: parFor(arc), secs: Math.floor((st.arcFrames || 0) / 60), score: (st.score || 0) - (st.arcStartScore || 0) };
}

// PURE: which medal does this result earn?
export function medalFor(par, secs, score) {
    const fast = secs <= par.time, rich = score >= par.score;
    return fast && rich ? 'gold' : (fast || rich ? 'silver' : 'bronze');
}

export function loadMedals() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
function saveMedals(m) { try { localStorage.setItem(KEY, JSON.stringify(m)); } catch (e) {} }

// Judge the Arc that just ended. Returns the result (for the card + telemetry).
export function judgeArc(arc) {
    const par = parFor(arc);
    const secs = Math.floor((st.arcFrames || 0) / 60), score = (st.score || 0) - (st.arcStartScore || 0);
    const medal = medalFor(par, secs, score);
    const best = loadMedals();
    const prev = best[arc];
    const isBest = !prev || MEDALS[medal].rank > MEDALS[prev].rank;
    if (isBest && !st.practice) { best[arc] = medal; saveMedals(best); }
    return { arc, medal, secs, score, par, isBest };
}

export const fmtSecs = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
export const fmtK = n => n >= 1000 ? `${Math.round(n / 1000)}K` : String(n);
