export function hasUpgrade(st, id) {
    return st.acquiredUpgradeIds.includes(id);
}

export function isRecentlyOffered(st, upgrade) {
    if (!upgrade.memoryPolicy || upgrade.memoryPolicy === "none") return false;
    return st.recentlyOffered.includes(upgrade.id);
}

export function pushRecentlyOffered(st, offeredIds, maxSize = 6) {
    const merged = [...st.recentlyOffered, ...offeredIds];
    st.recentlyOffered = merged.slice(-maxSize);
}

export function meetsRequirements(upgrade, st) {
    const reqs = upgrade.reqs || {};

    if (reqs.orbTreeBelow) {
        for (const [tree, value] of Object.entries(reqs.orbTreeBelow)) {
            if ((st.orbCounts[tree] ?? 0) >= value) return false;
        }
    }
    if (reqs.orbTreeAtLeast) {
        for (const [tree, value] of Object.entries(reqs.orbTreeAtLeast)) {
            if ((st.orbCounts[tree] ?? 0) < value) return false;
        }
    }
    if (reqs.hasUpgradeIds) {
        for (const id of reqs.hasUpgradeIds) {
            if (!st.acquiredUpgradeIds.includes(id)) return false;
        }
    }
    if (reqs.notOwned) {
        for (const id of reqs.notOwned) {
            if (st.acquiredUpgradeIds.includes(id)) return false;
        }
    }
    return true;
}
// v20 FUSION PREVIEW (pure): would taking `option` complete — or bring within
// reach of — a Fusion the player hasn't got? Returns { name, missing, color? }
// for the closest one (missing 0 = "this pick unlocks it"), or null.
export function fusionHint(option, st, poolIn, maxMissing = 2) {
    const pool = Array.isArray(poolIn) ? poolIn : Object.values(poolIn || {}).flat();
    const inc = (option.effects || []).find(e => e.op === 'incOrb');
    if (!inc) return null;
    const after = { ...st.orbCounts, [inc.tree]: (st.orbCounts[inc.tree] ?? 0) + (inc.amount || 1) };
    let best = null;
    for (const f of pool) {
        if (f.kind !== 'fusion' || !f.reqs || !f.reqs.orbTreeAtLeast) continue;
        if (!(inc.tree in f.reqs.orbTreeAtLeast)) continue; // this pick doesn't feed it
        if (st.acquiredUpgradeIds.includes(f.id)) continue;
        if ((f.reqs.hasUpgradeIds || []).some(id => !st.acquiredUpgradeIds.includes(id))) continue;
        const missing = Object.entries(f.reqs.orbTreeAtLeast).reduce((n, [t, v]) => n + Math.max(0, v - (after[t] ?? 0)), 0);
        const before = Object.entries(f.reqs.orbTreeAtLeast).reduce((n, [t, v]) => n + Math.max(0, v - (st.orbCounts[t] ?? 0)), 0);
        if (missing > maxMissing || missing >= before) continue; // must actually move you closer
        if (!best || missing < best.missing) best = { id: f.id, name: f.name, missing, evolved: !!f.evolved };
    }
    return best;
}
