// ==========================================
// UPGRADE IDENTITY MOMENT (v16)
// Playtest: "Needs more 'Game Identity Moments' — think small cutscene after
// choosing upgrades." Every pick plays a ~1.5s equip vignette: the Striker strikes
// a pose, the gloves ignite in the upgrade's tree colour, the name slams in over
// a sting. Any key / click / button skips it. An upgrade you've seen before (per
// save) plays a 0.6s version, so repeats never drag. Drawn by render/overlays.js.
// ==========================================
import { gameState as st } from '../state.js';
import { playSound } from '../vfx_audio/audio.js';
import { hasSeenUpgrade, markUpgradeSeen, reducedMotion } from './settings.js';

export const VIGNETTE_FULL_FRAMES = 90;   // 1.5s
export const VIGNETTE_REPEAT_FRAMES = 36; // 0.6s
const SKIP_GUARD_FRAMES = 6;              // the key that picked the card can't also skip

export const TREE_COLORS = { speed: '#22d3ee', power: '#ec4899', technique: '#facc15' };

export function upgradeColor(u) {
    if (!u) return '#ffffff';
    if (u.kind === 'fusion') return '#ff0055';
    if (u.kind === 'overclock') return '#c084fc';
    return TREE_COLORS[u.tree] || '#ffffff';
}

export function upgradeRarity(u) {
    if (!u) return 'orb';
    if (u.kind === 'fusion') return 'fusion';
    if (u.draftRole === 'apex') return 'apex';
    if (u.kind === 'mastery') return 'mastery';
    if (u.kind === 'overclock') return 'overclock';
    return 'orb';
}

const STING = { fusion: 'sting_fusion', apex: 'sting_fusion', mastery: 'sting_mastery', overclock: 'sting_overclock', orb: 'sting_orb' };

// PURE: how long this upgrade's vignette runs.
export function vignetteDuration(upgradeId, seenBefore, reduced = false) {
    return (seenBefore || reduced) ? VIGNETTE_REPEAT_FRAMES : VIGNETTE_FULL_FRAMES;
}

export function playUpgradeVignette(upgrade, onDone) {
    const seen = hasSeenUpgrade(upgrade.id);
    markUpgradeSeen(upgrade.id);
    const rarity = upgradeRarity(upgrade);
    st.vignette = {
        upgrade, rarity, color: upgradeColor(upgrade), repeat: seen,
        timer: 0, duration: vignetteDuration(upgrade.id, seen, reducedMotion()),
        onDone, sparks: []
    };
    st.screen = 'vignette';
    playSound(STING[rarity] || 'sting_orb');
}

export function updateVignette() {
    const v = st.vignette;
    if (!v) return;
    v.timer++;
    // Ember sparks off the ignited gloves.
    if (!reducedMotion() && v.timer < v.duration - 8) {
        for (let i = 0; i < 3; i++) v.sparks.push({ gx: Math.random() < 0.5 ? 0 : 1, ox: (Math.random() - 0.5) * 14, oy: 0, vx: (Math.random() - 0.5) * 1.6, vy: -1.5 - Math.random() * 2.5, life: 1 });
    }
    v.sparks.forEach(s => { s.ox += s.vx; s.oy += s.vy; s.life -= 0.05; });
    v.sparks = v.sparks.filter(s => s.life > 0);
    if (v.timer >= v.duration) endVignette();
}

export function skipVignette() {
    const v = st.vignette;
    if (!v || v.timer < SKIP_GUARD_FRAMES) return false;
    endVignette();
    return true;
}

function endVignette() {
    const v = st.vignette;
    if (!v) return;
    st.vignette = null;
    if (typeof v.onDone === 'function') v.onDone();
}
