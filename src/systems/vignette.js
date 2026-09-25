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
import { upgradeColorFor } from './colors.js';

export const VIGNETTE_FULL_FRAMES = 70;   // the full build-up (then it holds for input)
export const VIGNETTE_REPEAT_FRAMES = 36; // every pick already seen before: a shorter build
const SKIP_GUARD_FRAMES = 16;             // the key that picked the card can't also dismiss it

// v17: colours come from the tree / fusion-mix table (systems/colors.js).
export function upgradeColor(u) { return upgradeColorFor(u); }

export function upgradeRarity(u) {
    if (!u) return 'orb';
    if (u.kind === 'fusion') return u.evolved ? 'evolved' : 'fusion';
    if (u.draftRole === 'apex') return 'apex';
    if (u.verb) return 'verb';
    if (u.kind === 'mastery') return 'mastery';
    if (u.kind === 'overclock') return 'overclock';
    return 'orb';
}

// v18 TERMINOLOGY — one vocabulary everywhere the player reads it:
//   EVOLUTION      every pick you make when the EXP bar fills
//   RANK n         a step up a tree (Speed / Power / Technique), ranks 1-5
//   SIGNATURE MOVE rank 3 of a tree: it changes what an action does
//   APEX           rank 5 of a tree
//   MASTERY / FUSION / PERFECTED FUSION / OVERCLOCK — the other kinds
const TREE_NAMES = { speed: 'SPEED', power: 'POWER', technique: 'TECHNIQUE' };
export function evolutionLabel(u, rarity = upgradeRarity(u)) {
    if (!u) return '';
    const tree = TREE_NAMES[u.tree];
    if (u.kind === 'rank') return `${tree || ''} · RANK ${u.rank}${rarity === 'verb' ? ' · SIGNATURE MOVE' : (rarity === 'apex' ? ' · APEX' : '')}`;
    if (u.kind === 'mastery') return `${tree ? tree + ' ' : ''}MASTERY`;
    if (u.kind === 'fusion') {
        const pair = (u.trees || []).map(t => TREE_NAMES[t] || t).join(' + ');
        return `${u.evolved ? 'PERFECTED FUSION' : 'FUSION'}${pair ? ' · ' + pair : ''}`;
    }
    return 'OVERCLOCK';
}

const STING = { evolved: 'sting_fusion', fusion: 'sting_fusion', apex: 'sting_fusion', verb: 'sting_mastery', mastery: 'sting_mastery', overclock: 'sting_overclock', orb: 'sting_orb' };

// PURE: how long the build-up animation runs before the screen holds for input.
export function vignetteDuration(upgradeId, seenBefore, reduced = false) {
    return (seenBefore || reduced) ? VIGNETTE_REPEAT_FRAMES : VIGNETTE_FULL_FRAMES;
}

const RARITY_ORDER = ['evolved', 'fusion', 'apex', 'verb', 'mastery', 'orb', 'overclock'];

// v18: takes ONE upgrade or a LIST (a stacked chain of evolutions). The rarest
// pick is the hero (pose + colour); every pick is listed. The screen plays its
// build-up, then HOLDS until the player presses something (playtest: it used to
// time out on its own, sometimes before you'd read it).
export function playUpgradeVignette(upgradeOrList, onDone) {
    const picks = Array.isArray(upgradeOrList) ? upgradeOrList.filter(Boolean) : [upgradeOrList];
    if (!picks.length) { if (onDone) onDone(); return; }
    const allSeen = picks.every(u => hasSeenUpgrade(u.id));
    picks.forEach(u => markUpgradeSeen(u.id));
    const hero = picks.slice().sort((a, b) => RARITY_ORDER.indexOf(upgradeRarity(a)) - RARITY_ORDER.indexOf(upgradeRarity(b)))[0];
    const rarity = upgradeRarity(hero);
    st.vignette = {
        upgrade: hero, picks, rarity, color: upgradeColor(hero), repeat: allSeen,
        timer: 0, duration: vignetteDuration(hero.id, allSeen, reducedMotion()),
        holding: false, onDone, sparks: []
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
    if (v.timer >= v.duration) { v.timer = v.duration; v.holding = true; } // wait for the player
}

// First press during the build-up jumps to the finished screen; a press once it
// is holding continues the fight.
export function skipVignette() {
    const v = st.vignette;
    if (!v || v.timer < SKIP_GUARD_FRAMES) return false;
    if (!v.holding) { v.timer = v.duration; v.holding = true; return false; }
    endVignette();
    return true;
}

function endVignette() {
    const v = st.vignette;
    if (!v) return;
    st.vignette = null;
    if (typeof v.onDone === 'function') v.onDone();
}
