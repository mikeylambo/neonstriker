// ==========================================
// v18 INPUT DEVICE + BUTTON GLYPHS
// Playtest: a PS4 pad on USB showed "A" in the Finisher. Every on-screen prompt
// now reads the device you LAST touched — keyboard, Xbox-style pad, or
// PlayStation pad (detected from the Gamepad id) — and shows that device's
// glyph for the action. Button indices follow the W3C "standard" layout, which
// is what Chrome/Edge/Firefox report for DS4 / DualSense / Xbox pads on USB.
// ==========================================
import { gameState as st } from '../state.js';
import { getBinds, keyLabel } from './settings.js';

// PURE: which family is this pad? (Sony vendor id 054c or its product names.)
export function padFamily(id = '') {
    const s = String(id).toLowerCase();
    // Xbox first: "Xbox Wireless Controller" would otherwise match the Sony check.
    if (/045e|xbox|xinput|x-box/.test(s)) return 'xbox';
    // Sony's USB vendor id (054c) is in every DS4 / DualSense id string in
    // Chrome, Edge and Firefox; the names cover the rest.
    if (/054c|playstation|dualshock|dualsense|ps4|ps5/.test(s)) return 'playstation';
    return 'xbox'; // unknown pads get the Xbox letters (the standard-layout default)
}

export function setInputDevice(dev) { if (dev) st.inputDevice = dev; }
export function inputDevice() { return st.inputDevice || 'keyboard'; }

// Glyphs per device. `color` is the button's conventional colour.
const PAD = {
    playstation: {
        jab: { label: '□', color: '#f472b6' }, cross: { label: '△', color: '#34d399' },
        hook: { label: '○', color: '#f87171' }, instinct: { label: '×', color: '#60a5fa' },
        confirm: { label: '×', color: '#60a5fa' }, back: { label: '○', color: '#f87171' },
        ghost: { label: 'L1', color: '#e5e7eb' }, guard: { label: 'R1', color: '#e5e7eb' },
        up: { label: '▲', color: '#e5e7eb' }, down: { label: '▼', color: '#e5e7eb' },
        left: { label: '◀', color: '#e5e7eb' }, right: { label: '▶', color: '#e5e7eb' },
        pause: { label: 'OPTIONS', color: '#e5e7eb' }, tabs: { label: 'L1 / R1', color: '#e5e7eb' }
    },
    xbox: {
        jab: { label: 'X', color: '#60a5fa' }, cross: { label: 'Y', color: '#facc15' },
        hook: { label: 'B', color: '#f87171' }, instinct: { label: 'A', color: '#4ade80' },
        confirm: { label: 'A', color: '#4ade80' }, back: { label: 'B', color: '#f87171' },
        ghost: { label: 'LB', color: '#e5e7eb' }, guard: { label: 'RB', color: '#e5e7eb' },
        up: { label: '▲', color: '#e5e7eb' }, down: { label: '▼', color: '#e5e7eb' },
        left: { label: '◀', color: '#e5e7eb' }, right: { label: '▶', color: '#e5e7eb' },
        pause: { label: 'MENU', color: '#e5e7eb' }, tabs: { label: 'LB / RB', color: '#e5e7eb' }
    }
};
const KEY_FIXED = { confirm: 'ENTER', back: 'ESC', pause: 'ESC', tabs: 'Q / E' };

// { label, color } for an action on the current (or a given) device.
export function glyph(action, dev = inputDevice()) {
    if (dev === 'playstation' || dev === 'xbox') return PAD[dev][action] || { label: action.toUpperCase(), color: '#e5e7eb' };
    if (KEY_FIXED[action]) return { label: KEY_FIXED[action], color: '#e5e7eb' };
    const code = getBinds()[action];
    return { label: code ? keyLabel(code) : action.toUpperCase(), color: '#e5e7eb' };
}

export function glyphText(action, dev) { return glyph(action, dev).label; }

// HTML chip for DOM prompts.
export function glyphHTML(action, dev) {
    const g = glyph(action, dev);
    return `<span class="glyph" style="--g:${g.color}">${g.label}</span>`;
}
