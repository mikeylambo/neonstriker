// This file has NO dependencies. It is the root of the utility tree.
export const $ = (id) => document.getElementById(id);

export const canvas = document.getElementById('gameCanvas');
export const ctx = canvas ? canvas.getContext('2d', { alpha: false }) : null;

export const dl = (x1, y1, x2, y2) => { 
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); 
};

export const dc = (x, y, r, f, s) => { 
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); if(f) ctx.fill(); if(s) ctx.stroke(); 
};