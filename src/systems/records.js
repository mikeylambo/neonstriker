// ==========================================
// RETENTION LAYER (Roadmap Phase 6): local leaderboard, run history, lifetime
// stats (best boss streak), and grade-keyed cosmetic unlocks.
//
// Deliberately DOM-free: it only ever touches localStorage (each access wrapped
// so a private window / blocked storage degrades to "no records", never a crash).
// The ranking and unlock rules are exported as pure functions so they can be unit
// tested without a browser (see tests/harness.mjs). Nothing here is seeded — these
// are per-device records, not part of a Daily Challenge's deterministic run.
// ==========================================

const LB_KEY = 'neon_strike_leaderboard_v1';
const META_KEY = 'neon_strike_meta_v1';
const MAX_ENTRIES = 10;

// Cosmetic striker colours. `cyan` is the shipped default and always available;
// the rest unlock off a run's peak grade, or off clearing a boss in a Daily.
export const STRIKER_SKINS = [
    { id: 'cyan',   name: 'Signal Cyan',  color: '#00ffff', unlock: 'default', hint: 'Default' },
    { id: 'ember',  name: 'Ember',        color: '#ff5a3c', unlock: 'grade:B', hint: 'Finish a run at grade B+' },
    { id: 'violet', name: 'Violet Ghost', color: '#c084fc', unlock: 'grade:A', hint: 'Finish a run at grade A+' },
    { id: 'gold',   name: 'Apex Gold',    color: '#facc15', unlock: 'grade:S', hint: 'Finish a run at grade S' },
    { id: 'prism',  name: 'Prism',        color: '#34d399', unlock: 'gold',    hint: 'Earn a GOLD Arc medal' }
];

const GRADE_RANK = { C: 0, B: 1, A: 2, S: 3 };

function safeGet(key) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
}
function safeSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
}

export function loadLeaderboard() {
    const a = safeGet(LB_KEY);
    return Array.isArray(a) ? a : [];
}

export function loadMeta() {
    const m = safeGet(META_KEY) || {};
    return {
        totalRuns: m.totalRuns || 0,
        bestBossStreak: m.bestBossStreak || 0,
        // v20: furthest round reached (Practice / Heat unlocks). Saves from before
        // v20 don't have it — backfill from the local leaderboard.
        bestStage: m.bestStage || (safeGet(LB_KEY) || []).reduce((n, e) => Math.max(n, (e && e.stage) || 0), 0),
        unlocked: Array.isArray(m.unlocked) && m.unlocked.length ? m.unlocked : ['cyan'],
        selectedSkin: m.selectedSkin || 'cyan',
        alias: typeof m.alias === 'string' && m.alias.length ? m.alias : 'STRIKER',
        // Online submission consent. Defaults to OFF: uploading a player's alias and
        // stats to a third-party server is opt-in, not something to do silently. The
        // game is fully playable — and the LOCAL leaderboard fully works — either way.
        onlineOptIn: m.onlineOptIn === true
    };
}

function saveMeta(m) { safeSet(META_KEY, m); }

// Player alias for the online leaderboard. Sanitised to the 1-16 char range the
// server enforces; letters/digits/basic punctuation only, uppercased for the board.
export function getAlias() { return loadMeta().alias; }
export function setAlias(name) {
    const clean = String(name || '').replace(/[^A-Za-z0-9 _\-.]/g, '').trim().slice(0, 16).toUpperCase() || 'STRIKER';
    const m = loadMeta(); m.alias = clean; saveMeta(m);
    return clean;
}

// Online-leaderboard consent (see loadMeta). Off until the player turns it on.
export function getOnlineOptIn() { return loadMeta().onlineOptIn; }
export function setOnlineOptIn(on) {
    const m = loadMeta(); m.onlineOptIn = !!on; saveMeta(m);
    return m.onlineOptIn;
}

// PURE: is a finished run worth putting on a GLOBAL board? Junk runs (a stage-1
// rage-quit, a 0-score death) are kept local-only — otherwise the all-time board
// fills with noise and the free-tier row budget burns on nothing. Local records
// still record every run; this gate is about what gets published.
export function isSubmittableRun(run) {
    if (!run) return false;
    return (run.score || 0) > 0 && (run.stage || 0) >= 2;
}

// PURE: insert an entry into a score-descending list capped at `max`. Returns the
// new list plus the entry's 1-based rank (or -1 if it didn't make the cut).
export function rankInsert(list, entry, max = MAX_ENTRIES) {
    const next = [...list, entry].sort((a, b) => b.score - a.score).slice(0, max);
    const idx = next.indexOf(entry);
    return { list: next, rank: idx >= 0 ? idx + 1 : -1 };
}

// PURE: which skin ids a run newly unlocks, given the currently-unlocked set.
export function unlocksForRun(run, unlocked) {
    const out = [];
    for (const s of STRIKER_SKINS) {
        if (unlocked.includes(s.id) || out.includes(s.id)) continue;
        if (s.unlock === 'default') { out.push(s.id); continue; }
        // v21: the Daily Challenge was removed; Prism now comes from a GOLD Arc medal.
        if (s.unlock === 'gold') { if (run.goldMedal) out.push(s.id); continue; }
        if (s.unlock.startsWith('grade:')) {
            const need = s.unlock.split(':')[1];
            if ((GRADE_RANK[run.grade] ?? -1) >= (GRADE_RANK[need] ?? 99)) out.push(s.id);
        }
    }
    return out;
}

// Commit a finished run: append to the leaderboard, bump lifetime stats, grant any
// newly-earned cosmetics. `run` = { score, grade, stage, daily, bossKills }.
export function commitRunRecord(run) {
    const entry = { score: run.score, grade: run.grade, stage: run.stage, daily: !!run.daily, at: Date.now() };
    const { list, rank } = rankInsert(loadLeaderboard(), entry);
    safeSet(LB_KEY, list);

    const meta = loadMeta();
    meta.totalRuns += 1;
    meta.bestBossStreak = Math.max(meta.bestBossStreak, run.bossKills || 0);
    meta.bestStage = Math.max(meta.bestStage || 0, run.stage || 0);
    const newly = unlocksForRun(run, meta.unlocked);
    if (newly.length) meta.unlocked = [...meta.unlocked, ...newly];
    saveMeta(meta);

    return { rank, newUnlocks: newly, bestBossStreak: meta.bestBossStreak, totalRuns: meta.totalRuns, leaderboard: list };
}

// v20 UNLOCKS. Practice: you've reached the Arc 1 title fight. Heat: you've
// beaten the Arc 1 boss.
export function practiceUnlocked(m = loadMeta()) { return (m.bestStage || 0) >= 5 || (m.bestBossStreak || 0) >= 1; }
export function heatUnlocked(m = loadMeta()) { return (m.bestBossStreak || 0) >= 1; }

export function selectSkin(id) {
    const m = loadMeta();
    if (m.unlocked.includes(id)) { m.selectedSkin = id; saveMeta(m); }
    return loadMeta().selectedSkin;
}

// The colour the currently-selected (and still-unlocked) skin resolves to.
export function selectedStrikerColor() {
    const m = loadMeta();
    const skin = STRIKER_SKINS.find(x => x.id === m.selectedSkin);
    return (skin && m.unlocked.includes(skin.id)) ? skin.color : '#00ffff';
}
