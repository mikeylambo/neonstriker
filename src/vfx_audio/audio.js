import { gameState as st } from '../state.js';

export function initAudio() { 
    if (st.audioMuted) return;
    if (!st.audioCtx) { 
        st.audioCtx = new (window.AudioContext || window.webkitAudioContext)(); 
        st.audioEnabled = true; 
    } 
    if (st.audioCtx.state === 'suspended') st.audioCtx.resume(); 
}

export function playSound(type) {
    if (!st.audioEnabled || st.audioMuted) return;
    const osc = st.audioCtx.createOscillator();
    const gain = st.audioCtx.createGain();
    const now = st.audioCtx.currentTime;
    osc.connect(gain); gain.connect(st.audioCtx.destination);
    let t = 0.15, f1 = 100, f2 = 40, v1 = 0.2, v2 = 0.01, sq = 'square';
    if (type === 'jab_tell') { sq = 'sine'; f1 = 1200; f2 = 800; t = 0.05; v1 = 0.1; }
    else if (type === 'bash_tell') { sq = 'sawtooth'; f1 = 150; f2 = 50; t = 0.3; }
    else if (type === 'feint_tell') { sq = 'triangle'; f1 = 400; f2 = 1200; t = 0.2; v1 = 0.1; v2 = 0; }
    else if (type === 'slip') { sq = 'sine'; f1 = 600; f2 = 150; t = 0.1; v1 = 0.05; }
    else if (type === 'perfect_slip') { f1 = 1200; f2 = 300; }
    else if (type === 'ghost_step') { sq = 'sawtooth'; f1 = 300; f2 = 50; v1 = 0.1; }
    else if (type === 'bounce') { sq = 'triangle'; f1 = 200; f2 = 100; v1 = 0.1; }
    else if (type === 'laser') { sq = 'sawtooth'; f1 = 800; f2 = 100; t = 0.3; }
    else if (type === 'shatter') { f1 = 8000; f2 = 100; t = 0.25; v1 = 0.3; }
    else if (type === 'hit') { f1 = 200; f2 = 50; v1 = 0.3; }
    osc.type = sq; osc.frequency.setValueAtTime(f1, now); osc.frequency.exponentialRampToValueAtTime(Math.max(1, f2), now + t);
    gain.gain.setValueAtTime(v1, now); gain.gain.exponentialRampToValueAtTime(Math.max(0.001, v2), now + t);
    osc.start(now); osc.stop(now + t);
}