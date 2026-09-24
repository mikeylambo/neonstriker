import { meetsRequirements, isRecentlyOffered, pushRecentlyOffered } from './requirements.js';
// FIXED: Path now correctly points up two levels to reach the data folder
import { UPGRADE_POOL } from '../../data/upgrades.js';
import { random } from '../rng.js';

export function buildEligiblePool(st, pool) {
    const pools = {
        orbs: [],
        masteries: [],
        fusions: [],
        overclocks: []
    };

    for (const orb of pool.orbs) {
        if (meetsRequirements(orb, st)) {
            pools.orbs.push(orb);
        }
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
        ["orbs", "masteries", "fusions", "overclocks"],   // Slot 1: Core Growth
        ["masteries", "orbs", "fusions", "overclocks"],   // Slot 2: Evolution
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