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