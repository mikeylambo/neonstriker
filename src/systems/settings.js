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

export const SETTINGS_DEFAULTS = Object.freeze({
    masterVolume: 0.8,
    musicVolume: 0.55,
    sfxVolume: 0.8,
    screenShake: 1.0,     // 0..1 multiplier
    flashIntensity: 1.0,  // 0..1 multiplier
    hitStop: true,
    reducedMotion: false
});

const UNIT_KEYS = ['masterVolume', 'musicVolume', 'sfxVolume', 'screenShake', 'flashIntensity'];
const BOOL_KEYS = ['hitStop', 'reducedMotion'];

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
    const out = { ...SETTINGS_DEFAULTS };
    if (!raw || typeof raw !== 'object') return out;
    for (const k of UNIT_KEYS) if (k in raw) out[k] = clamp01(raw[k], SETTINGS_DEFAULTS[k]);
    for (const k of BOOL_KEYS) if (k in raw) out[k] = raw[k] === true;
    return out;
}

let current = sanitizeSettings(safeGet(SETTINGS_KEY));
const listeners = [];

export function getSettings() { return current; }

export function setSetting(key, value) {
    if (!(key in SETTINGS_DEFAULTS)) return current;
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
        seenUpgrades: Array.isArray(p.seenUpgrades) ? p.seenUpgrades : []
    };
}

export function profileFlag(name) { return loadProfile().flags[name] === true; }
export function setProfileFlag(name) {
    const p = loadProfile(); p.flags[name] = true; safeSet(PROFILE_KEY, p);
}

export function hasSeenUpgrade(id) { return loadProfile().seenUpgrades.includes(id); }
export function markUpgradeSeen(id) {
    const p = loadProfile();
    if (!p.seenUpgrades.includes(id)) { p.seenUpgrades.push(id); safeSet(PROFILE_KEY, p); }
}
