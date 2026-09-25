// ==========================================
// v20 PRACTICE ROOM (unlock: reach the Arc 1 title fight)
// Pick an enemy type or a boss you've reached and drill it on a loop. You can't
// die (HP resets), there's no score / EXP / drafts / telemetry, and an optional
// overlay shows each attacker's slip window — the GOOD band and the PERFECT band
// with a cursor running down to the hit. Quit from the pause menu.
// ==========================================
import { gameState as st } from '../state.js';
import { CONSTANTS } from '../constants.js';
import { makeEnemy } from './waves.js';
import { spawnBoss } from '../entities/bosses.js';
import { spawnFloatingText } from '../vfx_audio/effects.js';

const BOSS_NAMES = ['NEON ENFORCER', 'PHANTOM BOXER', 'STATIC MONK', 'LIVE WIRE', 'NEGATIVE'];

// Every target: which stage it's staged on (for arena + tuning) and what unlocks it.
export function practiceTargets() {
    const a2 = CONSTANTS.firstStageOfArc(2);
    const list = [
        { id: 'grunt', label: 'GRUNT', type: 'grunt', stage: 2, need: 0 },
        { id: 'shield', label: 'GOLD ARMOR', type: 'shield', stage: 3, need: 0 },
        { id: 'bruiser', label: 'BRUISER', type: 'bruiser', stage: 3, need: 0 },
        { id: 'zoner', label: 'ZONER', type: 'zoner', stage: 4, need: 0 },
        { id: 'assassin', label: 'ASSASSIN', type: 'assassin', stage: 4, need: 0 },
        { id: 'string', label: 'PUNCH STRING', type: 'grunt', stringLen: 3, stage: a2 + 1, need: a2 }
    ];
    for (let arc = 1; arc <= 5; arc++) {
        const bs = CONSTANTS.bossStageOfArc(arc);
        list.push({ id: `boss${arc}`, label: BOSS_NAMES[arc - 1], boss: arc, stage: bs, need: bs });
    }
    return list;
}

export function practiceTargetUnlocked(t, bestStage) { return (bestStage || 0) >= (t.need || 0); }

// Called by startGame after resetGame() when a practice target is chosen.
export function beginPractice(target, showWindows) {
    st.practice = { id: target.id, target, windows: !!showWindows, respawn: 30, resets: 0, perfect0: 0 };
    st.currentStage = target.stage;
    st.stageClearing = false; st.bossActive = false; st.waveTimer = 9999;
    st.seenTutorials = { ...(st.seenTutorials || {}), footwork_tip: true, instinct: true, bruiser_id: true, string_id: true, assassin_id: true };
    st.tutorialEnabled = false;
    st.pendingUpgrades = 0;
}

// Once per playing frame (from update), before the knockdown check.
export function updatePractice() {
    const P = st.practice;
    if (!P) return;
    st.exp = 0; st.pendingUpgrades = 0; st.stageClearing = false;
    // can't lose: HP refills before a hit could floor you
    if (st.health < 40) { st.health = st.maxHealth; P.resets++; spawnFloatingText(st.player.x, st.player.y - 130, 'HP RESET', '#9ca3af'); }
    const t = P.target;
    const alive = t.boss ? st.enemies.some(e => e.isBoss && e.hp > 0) || st.bossIntroTimer > 0 || !!st.finisher
                         : st.enemies.some(e => e.hp > 0);
    if (alive) { P.respawn = t.boss ? 90 : 40; return; }
    if (--P.respawn > 0) return;
    if (t.boss) {
        st.enemies = st.enemies.filter(e => !e.isBoss);
        st.bossDefeatedThisStage = false; st.bossActive = false;
        spawnBoss();
    } else {
        const lane = st.player ? (Math.random() < 0.6 ? st.player.lane : Math.floor(Math.random() * 3)) : 1;
        st.enemies.push(makeEnemy(t.type, lane, 0, { stringLen: t.stringLen }));
    }
}

export function practiceHudText() {
    const P = st.practice; if (!P) return '';
    return `PRACTICE · ${P.target.label} · PERFECT ${st.statTotalSlips || 0} · HITS TAKEN ${st.stageHitsTaken || 0}`;
}
