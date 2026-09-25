// ==========================================
// v19 RUN TELEMETRY (for tuning)
// Playtest: "LVL 10 seems to be the common spot of failure… dev in a system of
// internal time to completion, along with tracking whatever metric needed."
// Every run records, per stage: game-clock time (frames while playing), kills
// by enemy type, damage taken by source, attacks thrown / landed by punch,
// slips, ghost steps, guards, knockdowns, floors, finishers — plus evolution
// picks and what ended the run. Local only (last MAX_RUNS runs in
// localStorage); export as JSON from the Records screen. Never uploaded.
// ==========================================
import { gameState as st } from '../state.js';
import { CONSTANTS } from '../constants.js';

const KEY = 'neon_strike_telemetry_v1';
const MAX_RUNS = 25;
export const TELEMETRY_VERSION = '19.0.0';

let run = null;     // the live run
let stage = null;   // the live stage record

function safeGet() { try { const r = localStorage.getItem(KEY); const a = r ? JSON.parse(r) : []; return Array.isArray(a) ? a : []; } catch (e) { return []; } }
function safeSet(a) { try { localStorage.setItem(KEY, JSON.stringify(a)); } catch (e) {} }
const bump = (obj, k, n = 1) => { obj[k] = (obj[k] || 0) + n; };

function newStage(n) {
    const arc = CONSTANTS.getArcIndex(n), lvl = CONSTANTS.getLevelInArc(n);
    const t = CONSTANTS.ARC_STAGE_TABLES[Math.min(arc, 5)] || {};
    return {
        stage: n, arc, level: lvl, name: (t[lvl] && t[lvl].stageName) || '', boss: CONSTANTS.isBossStage(n),
        frames: 0, kills: {}, dmg: {}, hitsTaken: 0, attacks: {}, landed: {},
        slips: { perfect: 0, good: 0 }, ghosts: { used: 0, perfect: 0 }, guards: 0,
        knockdowns: 0, floored: 0, counteredBy: 0, finishers: [], wager: null
    };
}

export function tmStartRun({ seed = null, daily = false } = {}) {
    run = { v: TELEMETRY_VERSION, id: `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`, date: new Date().toISOString(), seed, daily, frames: 0, stages: [], evolutions: [], end: null };
    stage = newStage(1); run.stages.push(stage);
}
export function tmStage(n) {
    if (!run) return;
    stage = newStage(n); run.stages.push(stage);
}
export function tmTick() { if (!run || !stage) return; run.frames++; stage.frames++; }
export function tmKill(kind) { if (stage) bump(stage.kills, kind); }
export function tmDamage(src, amt) { if (!stage) return; bump(stage.dmg, src || 'unknown', Math.max(0, Math.round(amt))); stage.hitsTaken++; if (run) run.lastDamageSrc = src || 'unknown'; }
export function tmAttack(punch) { if (stage) bump(stage.attacks, punch); }
export function tmLanded(punch) { if (stage) bump(stage.landed, punch); }
export function tmSlip(quality) { if (stage && stage.slips[quality] !== undefined) stage.slips[quality]++; }
export function tmGhost(perfect) { if (!stage) return; if (perfect) stage.ghosts.perfect++; else stage.ghosts.used++; }
export function tmGuard() { if (stage) stage.guards++; }
export function tmKnockdown() { if (stage) stage.knockdowns++; }
export function tmFloored(counter) { if (!stage) return; stage.floored++; if (counter) stage.counteredBy++; }
export function tmFinisher(kind, result, hits, prompts) { if (stage) stage.finishers.push({ kind, result, hits, prompts }); }
export function tmEvolution(id) { if (run) run.evolutions.push({ stage: st.currentStage, frame: run.frames, id }); }
export function tmWager(name) { if (stage) stage.wager = name || null; }

export function tmEndRun({ stage: endStage, score, grade }) {
    if (!run) return null;
    run.end = { stage: endStage, score, grade, frames: run.frames, cause: run.lastDamageSrc || 'unknown' };
    const all = safeGet(); all.push(run); safeSet(all.slice(-MAX_RUNS));
    const done = run; run = null; stage = null;
    return done;
}

export function liveRun() { return run; }
export function loadTelemetry() { return safeGet(); }
export function exportTelemetryJSON() { return JSON.stringify({ exported: new Date().toISOString(), game: 'neon-strike', version: TELEMETRY_VERSION, runs: safeGet() }, null, 2); }

export function fmtTime(frames) {
    const s = Math.floor((frames || 0) / 60);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// PURE: where runs end, what hits you, how long each stage takes (across runs).
export function summarizeTelemetry(runs) {
    const ends = {}, hurt = {}, stageTime = {}, reached = {};
    for (const r of runs) {
        if (r.end) bump(ends, r.end.stage);
        for (const s of r.stages || []) {
            bump(reached, s.stage);
            (stageTime[s.stage] = stageTime[s.stage] || []).push(s.frames);
            for (const [k, v] of Object.entries(s.dmg || {})) bump(hurt, k, v);
        }
    }
    const avgTime = {};
    for (const [k, arr] of Object.entries(stageTime)) avgTime[k] = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
    const topHurt = Object.entries(hurt).sort((a, b) => b[1] - a[1]);
    return { runs: runs.length, ends, reached, avgTime, topHurt };
}
