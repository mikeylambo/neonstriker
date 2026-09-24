import { gameState as st } from '../state.js';

const Sequences = { 
    stage1Intro: [ 
        { type: 'tint', color: 'rgba(0, 0, 0, 0.8)', duration: 30 }, 
        { type: 'text', title: 'STAGE 1: SHATTERED CATHEDRAL', duration: 150 }, 
        { type: 'tint', color: 'transparent', duration: 30 }, 
        { type: 'resume' } 
    ] 
};

export const SequenceManager = {
    active: false, 
    currentSequence: null, 
    stepIndex: 0, 
    timer: 0, 
    overlayColor: 'transparent', 
    text: { title: '', subtitle: '', alpha: 0 },

    play: function(seqId) { 
        if (!Sequences[seqId]) return;
        this.active = true; 
        this.currentSequence = Sequences[seqId]; 
        this.stepIndex = 0; 
        this.startStep(); 
    },
    
    // NEW: Trigger custom dynamic cinematic overlays directly!
    playDynamic: function(stepsArray) {
        this.active = true;
        this.currentSequence = stepsArray;
        this.stepIndex = 0;
        this.startStep();
    },

    startStep: function() {
        if (!this.currentSequence || this.stepIndex >= this.currentSequence.length) { 
            this.active = false; 
            return; 
        }
        let step = this.currentSequence[this.stepIndex]; 
        this.timer = step.duration || 0;
        
        if (step.type === 'tint') {
            this.overlayColor = step.color;
        }
        if (step.type === 'text') {
            this.text = { title: step.title, subtitle: step.subtitle || '', alpha: 1 };
        }
        if (step.type === 'resume') { 
            this.active = false; 
            this.overlayColor = 'transparent'; 
            this.text.alpha = 0; 
            return; 
        }
    },

    update: function() { 
        if (!this.active) return; 
        if (this.timer > 0) { 
            this.timer--; 
            if (this.timer < 30 && this.text.alpha > 0) {
                this.text.alpha = Math.max(0, this.text.alpha - 0.05); 
            }
            if (this.timer <= 0) { 
                this.stepIndex++; 
                this.startStep(); 
            } 
        } 
    },

    draw: function(ctx, w, h) {
        if (!this.active) return;
        
        if (this.overlayColor !== 'transparent') { 
            ctx.fillStyle = this.overlayColor; 
            ctx.fillRect(0, 0, w, h); 
        }

        if (this.text.alpha > 0) {
            ctx.save();
            ctx.fillStyle = `rgba(255, 255, 255, ${this.text.alpha})`; 
            ctx.textAlign = 'center'; 
            ctx.font = '900 italic 40px Orbitron'; 
            ctx.fillText(this.text.title, w / 2, h / 2 - 10);
            
            if (this.text.subtitle) { 
                ctx.fillStyle = `rgba(0, 255, 255, ${this.text.alpha})`; 
                ctx.font = 'bold 20px Orbitron'; 
                ctx.fillText(this.text.subtitle, w / 2, h / 2 + 30); 
            }
            ctx.restore();
        }
    }
};