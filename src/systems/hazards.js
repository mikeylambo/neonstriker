// ==========================================
// LANE HAZARDS (surprise injector)
// The arena occasionally overloads a lane: a long amber WARNING pulses, then a brief
// STRIKE. If you're still in the lane at the strike (and not Ghost Stepping), you eat
// it. Design guarantees: two lanes are always safe, the warning is long and uses a
// distinct amber colour (never the red/white slip language), and evasion is a plain
// lane change. Seeded rng -> a Daily's hazards are identical for everyone.
// ==========================================
import { gameState as st } from '../state.js';
import { CONSTANTS } from '../constants.js';
import { random } from './rng.js';
import { takeDamage, registerPerfectGhostStep } from '../entities/player.js';
import { spawnFloatingText } from '../vfx_audio/effects.js';
import { playSound } from '../vfx_audio/audio.js';

export function spawnHazard(laneOverride) {
    const H = CONSTANTS.HAZARDS;
    const lane = laneOverride !== undefined ? laneOverride : Math.floor(random() * 3);
    st.hazards.push({ lane, phase: 'warn', timer: H.warnFrames, struck: false });
    playSound('bash_tell');
    spawnFloatingText(st.width * 0.5, st.height * CONSTANTS.LANE_Y[lane] - 46, 'RAIL OVERLOAD', '#ff8800');
}

// Rolls at most once per cooldown window; only during live, non-boss play.
// Three independent limits, in order of what actually constrains frequency:
//   1. per-stage HARD CAP (maxPerStageByArc) — the real frequency control
//   2. the shared SURPRISE budget — stops stacking with a hot lane
//   3. no second hazard while one is still live — never two at once
// The cooldown is only the minimum *gap*; on its own it never bounded the count.
export function maybeScheduleHazard() {
    const H = CONSTANTS.HAZARDS;
    if (st.hazardCooldown > 0) { st.hazardCooldown--; return; }
    if (st.screen !== 'playing' || st.bossActive || st.stageClearing || st.bossIntroTimer > 0 || CONSTANTS.isBossStage(st.currentStage)) return;
    if (st.hazards.length > 0) return;                       // never two stacked
    const arc = Math.min(CONSTANTS.getArcIndex(st.currentStage), 5);
    const cap = (H.maxPerStageByArc || {})[arc] || 0;
    if ((st.hazardsThisStage || 0) >= cap) return;           // stage cap reached
    if ((st.surpriseBudget || 0) < CONSTANTS.SURPRISE.hazardCost) return; // budget spent
    st.hazardCooldown = H.cooldownFrames;
    const chance = (H.chanceByArc || {})[arc] || 0;
    if (chance > 0 && random() < chance) {
        st.hazardsThisStage = (st.hazardsThisStage || 0) + 1;
        st.surpriseBudget -= CONSTANTS.SURPRISE.hazardCost;
        spawnHazard();
    }
}

export function updateHazards() {
    const H = CONSTANTS.HAZARDS;
    for (let i = st.hazards.length - 1; i >= 0; i--) {
        const hz = st.hazards[i];
        hz.timer--;
        if (hz.phase === 'warn') {
            if (hz.timer <= 0) { hz.phase = 'strike'; hz.timer = H.strikeFrames; playSound('laser'); st.shake = Math.max(st.shake, 12); }
        } else { // strike — resolve damage exactly once, on the first active frame
            if (!hz.struck) {
                hz.struck = true;
                const evading = st.player.state === 'ghost_step';
                if (st.player.lane === hz.lane && !evading) {
                    takeDamage(st.isInstinct ? Math.floor(H.damage * 0.5) : H.damage, true, null);
                    spawnFloatingText(st.player.x, st.player.y - 60, 'HAZARD!', '#ff8800');
                } else {
                    if (evading && st.player.lane === hz.lane) registerPerfectGhostStep();
                    spawnFloatingText(st.width * 0.5, st.height * CONSTANTS.LANE_Y[hz.lane] - 40, evading && st.player.lane === hz.lane ? 'EVADED' : 'CLEARED', '#ffaa00');
                }
            }
            if (hz.timer <= 0) st.hazards.splice(i, 1);
        }
    }
}

export function clearHazards() {
    st.hazards = [];
    st.hazardCooldown = CONSTANTS.HAZARDS.cooldownFrames;
    st.hazardsThisStage = 0;
}
