// ==========================================
// ONLINE LEADERBOARD (Supabase REST). Optional layer on top of the local records:
// the game is fully playable offline; these calls are fire-and-forget and every
// one is wrapped so a network failure, offline play, or a paused backend degrades
// silently to "local only" — it never blocks or breaks a run.
//
// The publishable key below is meant to live in client code; the database is
// protected by Row-Level Security (read-all + bounded-insert policies). It is NOT
// a secret. Backed by the SHARED multi-game project `leaderboards`
// (iysvarvkltihgosbhtaa): every game writes to one table tagged by `game`, so one
// project (and one keep-alive ping) serves them all. To reuse this file in another
// game, change only GAME below and keep the URL/key.
//
// Honest caveat: a client-only web leaderboard can't be fully cheat-proof — the
// RLS bounds stop trivial garbage, not a determined forged submission.
// ==========================================

const GAME = 'neon-strike';
const SUPABASE_URL = 'https://iysvarvkltihgosbhtaa.supabase.co';
const SUPABASE_KEY = 'sb_publishable_7Kxs-F6HGMgZmb86V1b9_A_qtyUerCh';
const REST = `${SUPABASE_URL}/rest/v1/scores`;
const HEADERS = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };

// Are online features even reachable? (No network in a headless test / offline.)
export function onlineEnabled() {
    return typeof fetch === 'function';
}

// Fire-and-forget submit. Returns a promise that resolves to true/false but callers
// don't need to await it — a failed submit just means the run stays local-only.
export async function submitScore(run) {
    if (!onlineEnabled()) return false;
    const body = {
        game: GAME,
        name: String(run.name || 'STRIKER').slice(0, 16),
        score: Math.max(0, Math.min(1000000, Math.round(run.score || 0))),
        grade: ['C', 'B', 'A', 'S'].includes(run.grade) ? run.grade : 'C',
        stage: Math.max(1, Math.min(999, Math.round(run.stage || 1))),
        daily: !!run.daily,
        date_key: run.daily ? (run.dateKey || null) : null
    };
    try {
        const res = await fetch(REST, {
            method: 'POST',
            headers: { ...HEADERS, 'Prefer': 'return=minimal' },
            body: JSON.stringify(body)
        });
        return res.ok;
    } catch (e) { return false; }
}

async function fetchScores(query) {
    if (!onlineEnabled()) return null;
    try {
        const res = await fetch(`${REST}?${query}`, { headers: HEADERS });
        if (!res.ok) return null;
        return await res.json();
    } catch (e) { return null; }
}

// Top all-time runs (this game only). Returns an array or null (null = unreachable).
export function fetchTopAllTime(limit = 10) {
    return fetchScores(`select=name,score,grade,stage&game=eq.${GAME}&order=score.desc&limit=${limit}`);
}

// Top runs for a given daily seed (today's date key), this game only. Array or null.
export function fetchTopDaily(dateKey, limit = 10) {
    if (!dateKey) return Promise.resolve([]);
    return fetchScores(`select=name,score,grade,stage&game=eq.${GAME}&daily=eq.true&date_key=eq.${encodeURIComponent(dateKey)}&order=score.desc&limit=${limit}`);
}
