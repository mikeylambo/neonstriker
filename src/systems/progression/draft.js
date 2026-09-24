import { meetsRequirements, isRecentlyOffered, pushRecentlyOffered } from './requirements.js';
// FIXED: Path now correctly points up two levels to reach the data folder
import { UPGRADE_POOL } from '../../data/upgrades.js';
import { random } from '../rng.js';
import { CONSTANTS } from '../../constants.js';

// v17: a tree's NEXT rank is offered only while that tree is under the current
// arc's cap. Ranks are linear, so at most one card per tree.
export function nextRank(st, pool, tree) {
    const r = (st.orbCounts && st.orbCounts[tree]) || 0;
    return pool.orbs.find(o => o.tree === tree && o.rank === r + 1) || null;
}
export function currentRankCap(st) {
    return CONSTANTS.rankCap(CONSTANTS.getArcIndex(st.currentStage || 1));
}

export function buildEligiblePool(st, pool) {
    const pools = {
        orbs: [],
        masteries: [],
        fusions: [],
        overclocks: []
    };

    const cap = currentRankCap(st);
    for (const tree of CONSTANTS.TREE_ORDER) {
        const next = nextRank(st, pool, tree);
        if (next && next.rank <= cap) pools.orbs.push(next);
    }

    for (const mastery of pool.masteries) {
        if (meetsRequirements(mastery, st) && !isRecentlyOffered(st, mastery)) {
            pools.masteries.push(mastery);
        }
    }

    for (const fusion of pool.fusions) {
        if (meetsRequirements(fusion, st) && !isRecentlyOffered(st, fusion)) {
            pools.fusions.push(fusion);
        }
    }

    for (const overclock of pool.overclocks) {
        if (meetsRequirements(overclock, st)) {
            pools.overclocks.push(overclock);
        }
    }

    return pools;
}

function weightedPick(candidates, excludedIds = new Set()) {
    const filtered = candidates.filter(c => !excludedIds.has(c.id));
    if (!filtered.length) return null;

    const totalWeight = filtered.reduce((sum, c) => sum + (c.weight !== undefined ? c.weight : 1), 0);
    let roll = random() * totalWeight;

    for (const item of filtered) {
        roll -= (item.weight !== undefined ? item.weight : 1);
        if (roll <= 0) return item;
    }

    return filtered[filtered.length - 1];
}

function resolveSlotByPriority(pools, priorities, excludedIds, st) {
    for (const category of priorities) {
        if (category === "overclocks") {
            const softFresh = pools.overclocks.filter(
                oc => !excludedIds.has(oc.id) && !isRecentlyOffered(st, oc)
            );
            const softAny = pools.overclocks.filter(
                oc => !excludedIds.has(oc.id)
            );

            if (softFresh.length) return weightedPick(softFresh, excludedIds);
            if (softAny.length) return weightedPick(softAny, excludedIds);
            continue;
        }

        const pool = pools[category].filter(item => !excludedIds.has(item.id));
        if (pool.length) {
            return weightedPick(pool, excludedIds);
        }
    }

    return null;
}

export function buildDraft(st, pool) {
    const pools = buildEligiblePool(st, pool);
    const chosen = [];
    const excludedIds = new Set();

    // Slot Priorities: Ensuring Core > Mastery > Fusion progression
    const slotRules = [
        ["orbs", "masteries", "fusions", "overclocks"],   // Slot 1: a tree rank
        // v17: slot 2 prefers a SECOND tree's rank, so a draft usually lets you
        // choose which tree climbs (and a rank-3 verb isn't crowded out).
        ["orbs", "masteries", "fusions", "overclocks"],   // Slot 2: another tree rank
        ["fusions", "masteries", "orbs", "overclocks"]    // Slot 3: Capstone/Flex
    ];

    for (const priorities of slotRules) {
        const pick = resolveSlotByPriority(pools, priorities, excludedIds, st);
        if (pick) {
            chosen.push(pick);
            excludedIds.add(pick.id);
        }
    }

    // Absolute fallback: Fill with Overclocks if we are starved for options
    while (chosen.length < 3) {
        const remaining = pool.overclocks.filter(oc => !excludedIds.has(oc.id));
        if (!remaining.length) break;

        const pick = weightedPick(remaining, excludedIds);
        if (!pick) break;

        chosen.push(pick);
        excludedIds.add(pick.id);
    }

    st.currentDraftOptions = chosen;
    pushRecentlyOffered(st, chosen.map(c => c.id));

    return chosen;
}
// v16 PACING TEASE: in Arc 1 no Fusion can be earned yet (they need two trees at
// level 2), so the player never learns they exist until much later. Every Arc 1
// draft now shows ONE locked Fusion card beside the real options — never
// selectable — naming what it does and exactly what it takes to unlock.
// Picks the not-yet-owned Fusion the current build is closest to.
const TREE_SHORT = { speed: 'SPD', power: 'PWR', technique: 'TEC' };
// v17: when a tree has hit this arc's cap, its next rank shows as a LOCKED card
// ("Unlocks in Arc N") — the promise of the next verb/Apex is what pulls a run
// forward. Picks the highest-ranked capped tree (most recently ranked on ties).
export function buildRankTease(st, pool) {
    const cap = currentRankCap(st);
    const order = st.rankOrder || [];
    let best = null;
    for (const tree of CONSTANTS.TREE_ORDER) {
        const r = st.orbCounts[tree] || 0;
        if (r < cap || r >= CONSTANTS.MAX_RANK) continue;
        if (!best || r > best.r || (r === best.r && order.lastIndexOf(tree) > order.lastIndexOf(best.tree))) best = { tree, r };
    }
    if (!best) return null;
    const next = nextRank(st, pool, best.tree);
    if (!next) return null;
    return { ...next, locked: true, reqText: `UNLOCKS IN ARC ${CONSTANTS.arcForRank(next.rank)}` };
}

// One locked card per draft: a capped tree's next rank first, else (Arc 1 only)
// the nearest Fusion.
export function buildDraftTease(st, pool, arcIndex) {
    return buildRankTease(st, pool) || buildFusionTease(st, pool, arcIndex);
}

export function buildFusionTease(st, pool, arcIndex) {
    if (arcIndex !== 1) return null;
    if ((st.currentDraftOptions || []).some(o => o.kind === 'fusion')) return null;
    let best = null;
    for (const f of pool.fusions) {
        if (f.evolved || st.acquiredUpgradeIds.includes(f.id)) continue;
        const need = (f.reqs && f.reqs.orbTreeAtLeast) || {};
        let missing = 0;
        for (const [tree, lvl] of Object.entries(need)) missing += Math.max(0, lvl - (st.orbCounts[tree] || 0));
        if (!best || missing < best.missing) best = { fusion: f, missing, need };
    }
    if (!best) return null;
    const reqText = Object.entries(best.need).map(([t, l]) => `${TREE_SHORT[t] || t} ${Math.min(st.orbCounts[t] || 0, l)}/${l}`).join(' · ');
    return { ...best.fusion, locked: true, reqText };
}
