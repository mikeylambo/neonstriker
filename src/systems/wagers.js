// ==========================================
// STAGE WAGERS (v16)
// Playtest: "Stage modifiers feel forced, and thus out of place." A modifier is
// no longer imposed on a stage. Before each eligible stage the arena OFFERS one
// risk modifier; accept it and every point scored that stage is multiplied by
// its scoreMult, decline and the stage runs clean. The OFFER is rolled on the
// seeded RNG (a Daily offers everyone the same wager); the choice is the player's.
// ==========================================
import { gameState as st } from '../state.js';
import { CONSTANTS } from '../constants.js';
import { random } from './rng.js';
import { tmWager } from './telemetry.js';

const NONE = CONSTANTS.AFFIXES[0];

// Rolls the offer for `stage` (null on stage 1 / boss stages). Always consumes
// exactly one rng roll on eligible stages so Daily streams stay aligned.
export function rollWagerOffer(stage) {
    if (stage < CONSTANTS.WAGERS.firstStage || CONSTANTS.isBossStage(stage)) return null;
    const pool = CONSTANTS.wagerPool();
    if (!pool.length) return null;
    return pool[Math.floor(random() * pool.length)];
}

// Stage start: nothing is active until the player accepts.
export function clearWager() {
    st.currentAffix = NONE;
    st.wagerMult = 1;
}

export function acceptWager() {
    const offer = st.wagerOffer;
    if (!offer) return null;
    st.currentAffix = offer;
    st.wagerMult = offer.scoreMult || 1;
    st.wagerOffer = null;
    tmWager(offer.name);
    return offer;
}

export function declineWager() {
    st.wagerOffer = null;
    clearWager();
}
