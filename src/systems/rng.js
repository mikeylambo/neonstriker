// Small mulberry32 PRNG. Freeplay seeds itself from real entropy at load time,
// so normal runs feel exactly as random as Math.random(). Daily Challenge calls
// seedRng() with a date-derived integer before the run starts, which makes every
// boss-move roll, upgrade draft, and affix pick reproducible for that calendar day.
// Wave/enemy composition needs no seeding — it was already hand-authored data.
let _state = (Math.random() * 0xffffffff) >>> 0;

export function seedRng(seed) {
    _state = seed >>> 0;
    if (_state === 0) _state = 0x9e3779b9; // avoid the degenerate all-zero state
}

export function random() {
    _state |= 0;
    _state = (_state + 0x6d2b79f5) | 0;
    let t = Math.imul(_state ^ (_state >>> 15), 1 | _state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function dailySeedFromDate(date = new Date()) {
    const y = date.getUTCFullYear(), m = date.getUTCMonth() + 1, d = date.getUTCDate();
    return y * 10000 + m * 100 + d;
}

export function todayKey(date = new Date()) {
    const y = date.getUTCFullYear(), m = String(date.getUTCMonth() + 1).padStart(2, '0'), d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}
