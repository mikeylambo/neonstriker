// ==========================================
// SETTINGS + PROFILE (v16)
// Settings: player-facing comfort/audio options from the pause menu. Profile:
// once-per-save flags (e.g. "has seen the Arc 1 theme line", "which upgrade
// vignettes have played"). Both persist in localStorage; every access is wrapped
// so a private window / blocked storage degrades to defaults, never a crash.
// DOM-free except the reduced-motion body class, which is guarded.
// ==========================================

const SETTINGS_KEY = 'neon_strike_settings_v1';
const PROFILE_KEY = 'neon_strike_profile_v1';

// v17 REMAPPABLE CONTROLS. Ghost Step has its own button (was tap-LEFT, which
// collided with held-LEFT footwork); LEFT/RIGHT are footwork only. Guard moves
// off Shift to W so the left hand keeps A/S/D + Shift + W + Space.
export const DEFAULT_BINDS = Object.freeze({
    up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight',
    jab: 'KeyA', cross: 'KeyS', hook: 'KeyD',
    guard: 'KeyW', ghost: 'ShiftLeft', instinct: 'Space'
});
export const BIND_LABELS = {
    up: 'Slip Up', down: 'Slip Down', left: 'Give Ground', right: 'Press Forward',
    jab: 'Jab', cross: 'Cross', hook: 'Hook', guard: 'Guard', ghost: 'Ghost Step', instinct: 'Instinct'
};
// Keys that stay reserved for menus / system and can't be bound to an action.
export const RESERVED_KEYS = ['Escape', 'KeyP', 'KeyM', 'KeyH', 'Enter', 'Tab', 'Digit1', 'Digit2', 'Digit3', 'KeyQ', 'KeyE', 'KeyR'];

export function keyLabel(code) {
    if (!code) return '—';
    const named = { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Space: 'SPACE', ShiftLeft: 'L-SHIFT', ShiftRight: 'R-SHIFT', ControlLeft: 'L-CTRL', ControlRight: 'R-CTRL', AltLeft: 'L-ALT', AltRight: 'R-ALT' };
    if (named[code]) return named[code];
    return code.replace(/^Key/, '').replace(/^Digit/, '').replace(/^Numpad/, 'NUM ').toUpperCase();
}

// PURE: keep a stored binds object valid (known actions only, unique keys, no
// reserved keys); anything invalid falls back to its default.
export function sanitizeBinds(raw) {
    const actions = Object.keys(DEFAULT_BINDS);
    const out = {};
    const valid = c => typeof c === 'string' && c.length > 0 && c.length < 32 && !RESERVED_KEYS.includes(c);
    // 1) keep every valid, non-duplicated custom bind
    const used = new Set();
    if (raw && typeof raw === 'object') {
        for (const a of actions) if (valid(raw[a]) && !used.has(raw[a])) { out[a] = raw[a]; used.add(raw[a]); }
    }
    // 2) fill the rest with defaults; if a default key was taken by a custom bind,
    //    inherit the default of the action that took it (i.e. the two swapped)
    for (const a of actions) {
        if (out[a]) continue;
        let code = DEFAULT_BINDS[a];
        for (let guard = 0; used.has(code) && guard < actions.length; guard++) {
            const taker = actions.find(x => out[x] === code);
            code = taker ? DEFAULT_BINDS[taker] : null;
        }
        if (!code || used.has(code)) code = actions.map(x => DEFAULT_BINDS[x]).find(c => !used.has(c));
        out[a] = code; used.add(code);
    }
    return out;
}

export const SETTINGS_DEFAULTS = Object.freeze({
    masterVolume: 0.8,
    musicVolume: 0.55,
    sfxVolume: 0.8,
    screenShake: 1.0,     // 0..1 multiplier
    flashIntensity: 1.0,  // 0..1 multiplier
    hitStop: true,
    reducedMotion: false,
    tellShapes: false     // v20 colour-blind aid: wind-up = dashed lane, SLIP NOW = chevrons
});

const UNIT_KEYS = ['masterVolume', 'musicVolume', 'sfxVolume', 'screenShake', 'flashIntensity'];
const BOOL_KEYS = ['hitStop', 'reducedMotion', 'tellShapes'];

function safeGet(key) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
}
function safeSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
}

const clamp01 = (v, d) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : d;
};

// PURE: coerce any stored/partial object into a valid settings object.
export function sanitizeSettings(raw) {
    const out = { ...SETTINGS_DEFAULTS, binds: { ...DEFAULT_BINDS } };
    if (!raw || typeof raw !== 'object') return out;
    for (const k of UNIT_KEYS) if (k in raw) out[k] = clamp01(raw[k], SETTINGS_DEFAULTS[k]);
    for (const k of BOOL_KEYS) if (k in raw) out[k] = raw[k] === true;
    out.binds = sanitizeBinds(raw.binds);
    return out;
}

let current = sanitizeSettings(safeGet(SETTINGS_KEY));
const listeners = [];

export function getSettings() { return current; }

export function getBinds() { return current.binds || DEFAULT_BINDS; }
export function keyName(action) { return keyLabel(getBinds()[action]); }

// Bind `code` to `action`; whatever action held that key swaps to this action's
// old key, so a rebind never leaves an action unbound.
export function rebind(action, code) {
    if (!(action in DEFAULT_BINDS) || RESERVED_KEYS.includes(code)) return false;
    const binds = { ...getBinds() };
    const prev = binds[action];
    const other = Object.keys(binds).find(a => a !== action && binds[a] === code);
    if (other) binds[other] = prev;
    binds[action] = code;
    setSetting('binds', binds);
    return true;
}
export function resetBinds() { setSetting('binds', { ...DEFAULT_BINDS }); }

export function setSetting(key, value) {
    if (!(key in SETTINGS_DEFAULTS) && key !== 'binds') return current;
    current = sanitizeSettings({ ...current, [key]: value });
    safeSet(SETTINGS_KEY, current);
    applySettingsSideEffects();
    listeners.forEach(fn => { try { fn(current); } catch (e) {} });
    return current;
}

export function reloadSettings() {
    current = sanitizeSettings(safeGet(SETTINGS_KEY));
    applySettingsSideEffects();
    return current;
}

export function onSettingsChange(fn) { listeners.push(fn); }

export function applySettingsSideEffects() {
    try {
        if (typeof document !== 'undefined' && document.body && document.body.classList) {
            if (current.reducedMotion) document.body.classList.add('reduced-motion');
            else document.body.classList.remove('reduced-motion');
        }
    } catch (e) {}
}

// Effective multipliers the render/feel code reads. Reduced motion zeroes shake
// and halves flashes on top of the explicit sliders.
export function shakeScale() { return current.reducedMotion ? 0 : current.screenShake; }
export function flashScale() { return current.flashIntensity * (current.reducedMotion ? 0.5 : 1); }
export function hitStopEnabled() { return current.hitStop; }
export function reducedMotion() { return current.reducedMotion; }

// ---------------- PROFILE (once-per-save flags) ----------------
function loadProfile() {
    const p = safeGet(PROFILE_KEY) || {};
    return {
        flags: (p.flags && typeof p.flags === 'object') ? p.flags : {},
        seenUpgrades: Array.isArray(p.seenUpgrades) ? p.seenUpgrades : [],
        counts: (p.counts && typeof p.counts === 'object') ? p.counts : {}
    };
}

export function profileFlag(name) { return loadProfile().flags[name] === true; }
export function setProfileFlag(name) {
    const p = loadProfile(); p.flags[name] = true; safeSet(PROFILE_KEY, p);
}

export function profileCount(name) { const p = loadProfile(); return (p.counts && p.counts[name]) || 0; }
export function bumpProfileCount(name) {
    const raw = safeGet(PROFILE_KEY) || {};
    raw.counts = raw.counts || {}; raw.counts[name] = (raw.counts[name] || 0) + 1;
    safeSet(PROFILE_KEY, raw);
}

export function hasSeenUpgrade(id) { return loadProfile().seenUpgrades.includes(id); }
export function markUpgradeSeen(id) {
    const p = loadProfile();
    if (!p.seenUpgrades.includes(id)) { p.seenUpgrades.push(id); safeSet(PROFILE_KEY, p); }
}
