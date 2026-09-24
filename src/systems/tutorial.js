import { gameState as st } from '../state.js';
import { CONSTANTS } from '../constants.js';
// FIXED: Removed the import of $ from main.js to prevent the final circular dependency!

export function triggerTutorial(id, title, text) {
    if (st.seenTutorials[id]) return;
    
    st.seenTutorials[id] = true;
    st.screen = 'tutorial';
    
    // Using standard document.getElementById to keep this file entirely independent
    const titleElem = document.getElementById('tutorial-title');
    const textElem = document.getElementById('tutorial-text');
    const screenElem = document.getElementById('tutorial-screen');
    
    if (titleElem) titleElem.innerText = title;
    if (textElem) textElem.innerHTML = text;
    if (screenElem) screenElem.style.display = 'flex';
}

export function dismissTutorial() {
    st.screen = 'playing';
    const screenElem = document.getElementById('tutorial-screen');
    if (screenElem) screenElem.style.display = 'none';
    st.tutorialGrace = 0;
}

export function spawnTutorialEnemy(type) {
    st.spawnTotal++;
    
    st.player.lane = 1; 
    st.player.y = st.height * CONSTANTS.LANE_Y[st.player.lane];
    st.player.x = 180; 

    let color = '#ff0055';
    let hp = 45;
    let speed = 2.0;
    let cooldown = 60;
    let weight = 1.0;
    let enemyType = 'grunt';
    let spawnX = st.width + 100;

    switch (type) {
        case 'slip':
            color = '#ff0055';
            speed = 4.0;
            cooldown = 60;
            break;
            
        case 'counter':
            color = '#ffaa00';
            speed = 1.5;
            cooldown = 120;
            st.player.slipBuff = 1; 
            spawnX = st.player.x + 100; 
            break;
            
        case 'ghost_step':
            color = '#888888';
            speed = 5.5;
            spawnX = st.player.x + 100;
            break;
            
        case 'shield':
            color = '#ffaa00';
            hp = 80;
            speed = 1.5;
            cooldown = 80;
            enemyType = 'shield';
            spawnX = st.player.x + 130;
            break;
            
        case 'guard':
            color = '#aa00ff';
            hp = 30;
            speed = 5.5;
            cooldown = 35;
            enemyType = 'assassin';
            break;
    }

    st.enemies.push({ 
        x: spawnX, 
        lane: 1, 
        y: st.player.y, 
        w: 50, 
        h: 110, 
        hp: hp, 
        maxHp: hp, 
        speed: speed, 
        color: color, 
        weight: weight,
        type: enemyType, 
        stun: 0, 
        stunResist: 0,
        attackCooldown: cooldown, 
        maxCooldown: cooldown, 
        pressure: 0, 
        pressureDecay: 0, 
        isBoss: false, 
        tutorialType: type, 
        justAttacked: 0,
        trails: [],
        trailTimer: 0,
        vx: 0 
    });
}