// ==========================================
// v17 COLOUR IDENTITY
// Each tree has a signature neon; a Fusion is the mix of its two trees. The
// "build colour" is what the player's punch trails, hit sparks and afterimage
// wear — the latest Fusion if you own one, else your highest-ranked tree (ties go
// to the tree ranked most recently). Never applied to the Striker's body/gloves.
// ==========================================
import { gameState as st } from '../state.js';
import { CONSTANTS } from '../constants.js';

export function treeColor(tree) {
    return (CONSTANTS.TREES[tree] && CONSTANTS.TREES[tree].color) || '#ffffff';
}

export function upgradeColorFor(u) {
    if (!u) return '#ffffff';
    if (CONSTANTS.FUSION_COLORS[u.id]) return CONSTANTS.FUSION_COLORS[u.id];
    if (u.kind === 'overclock') return '#c084fc';
    return treeColor(u.tree);
}

export function buildColor() {
    const owned = (st.acquiredUpgradeIds || []);
    for (let i = owned.length - 1; i >= 0; i--) {
        if (CONSTANTS.FUSION_COLORS[owned[i]]) return CONSTANTS.FUSION_COLORS[owned[i]];
    }
    let best = null, bestRank = 0;
    const order = st.rankOrder || [];
    for (const tree of CONSTANTS.TREE_ORDER) {
        const r = (st.orbCounts && st.orbCounts[tree]) || 0;
        if (r > bestRank || (r === bestRank && r > 0 && order.lastIndexOf(tree) > order.lastIndexOf(best))) { best = tree; bestRank = r; }
    }
    return best ? treeColor(best) : '#ffffff';
}
