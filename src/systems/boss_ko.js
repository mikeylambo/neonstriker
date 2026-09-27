import { gameState as st } from '../state.js';
import { CONSTANTS } from '../constants.js';
import { playSound } from '../vfx_audio/audio.js';
import { createImpact, createKoShatter, triggerShockwave, doFlash } from '../vfx_audio/effects.js';

// ==========================================
// v22 BOSS KO (playtest: "Bosses need some sort of KO animation and not just a
// quick defeat like regular enemy"). After the KO Finisher the champion isn't
// just shattered on the spot: the final blow launches them backwards, they hit
// the canvas, bounce once and lie there while the bell rings them out under a
// big K.O. banner — then they break into the usual shards + orb.
// Purely presentational: rewards/score already resolved in enemies.js, and the
// stage transition waits on purifyTimer (set to cover BOSS_KO_FRAMES).
// ==========================================
const KO = { flight: 26, bounce: 14, shatterAt: 118 };
export const BOSS_KO_FRAMES = 132;

export function startBossKo(en) {
    const midY = st.height * CONSTANTS.LANE_Y[en.lane];
    st.bossKo = {
        body: { ...en, trails: [], state: 'hurt', stun: 1, isActiveThreat: true, telegraphed: false },
        x0: en.x, x1: Math.min(st.width - 90, en.x + 170), y0: midY,
        t: 0, rot: 0, lift: 0, alpha: 1, shattered: false, color: en.color
    };
    st.shake = Math.max(st.shake, 18);
    playSound('hit');
}

export function updateBossKo() {
    const k = st.bossKo;
    if (!k) return;
    k.t++;
    const b = k.body;
    if (k.t <= KO.flight) {
        // launched: flies back in an arc, tipping over backwards
        const u = k.t / KO.flight;
        b.x = k.x0 + (k.x1 - k.x0) * (1 - Math.pow(1 - u, 2));
        k.lift = Math.sin(Math.PI * u) * 70;
        k.rot = (Math.PI / 2) * Math.min(1, u * 1.15);
        if (k.t % 3 === 0) createImpact(b.x + 20, k.y0 - 60 - k.lift, k.color);
    } else if (k.t <= KO.flight + KO.bounce) {
        // hits the canvas, one small bounce
        if (k.t === KO.flight + 1) {
            st.shake = Math.max(st.shake, 26); doFlash(0.35); playSound('bounce');
            triggerShockwave(b.x + 60, k.y0, k.color);
            for (let i = 0; i < 6; i++) createImpact(b.x + i * 22, k.y0 - 6, '#ffffff');
        }
        const u = (k.t - KO.flight) / KO.bounce;
        k.lift = Math.sin(Math.PI * u) * 16; k.rot = Math.PI / 2;
    } else {
        k.lift = 0; k.rot = Math.PI / 2;
        // counted out: three bells
        const since = k.t - (KO.flight + KO.bounce);
        if (since === 6 || since === 22 || since === 38) playSound('bell');
    }
    if (k.t === KO.shatterAt && !k.shattered) {
        k.shattered = true;
        createKoShatter({ ...b, x: b.x + 30, y: k.y0 + 30, h: 60, isBoss: true });
    }
    if (k.t > KO.shatterAt) k.alpha = Math.max(0, k.alpha - 0.12);
    if (k.t >= BOSS_KO_FRAMES) st.bossKo = null;
}

// Banner progress for the renderer: 0 before it appears, then eases to 1.
export function koBannerAlpha() {
    const k = st.bossKo;
    if (!k) return 0;
    const t = k.t - KO.flight;
    if (t < 0) return 0;
    const fadeOut = BOSS_KO_FRAMES - k.t;
    return Math.min(1, t / 8, fadeOut / 14);
}
