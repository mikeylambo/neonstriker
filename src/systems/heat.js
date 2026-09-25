// ==========================================
// v20 HEAT — optional modifiers stacked for a score multiplier (Hades-style).
// Unlocks once you've beaten the Arc 1 boss. Pick them from the menu; they
// apply to normal runs only (never the Daily Challenge or Practice).
// ==========================================
import { gameState as st } from '../state.js';
import { CONSTANTS } from '../constants.js';

const KEY = 'neon_strike_heat_v1';

export function heatOn(id) { return !!(st.heat && st.heat.includes(id)); }
export function heatMultFor(ids) {
    return 1 + (ids || []).reduce((n, id) => n + ((CONSTANTS.HEAT.mods.find(m => m.id === id) || {}).bonus || 0), 0);
}
export function heatMult() { return heatMultFor(st.heat); }
export function heatLevel(ids = st.heat) { return (ids || []).length; }

export function loadHeat() {
    try { const a = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(a) ? a.filter(id => CONSTANTS.HEAT.mods.some(m => m.id === id)) : []; } catch (e) { return []; }
}
export function saveHeat(ids) { try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch (e) {} }
export function toggleHeat(id) {
    const cur = loadHeat();
    const next = cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id];
    saveHeat(next); return next;
}
