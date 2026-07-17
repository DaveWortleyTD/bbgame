// ============================================================
// audio.js — Web Audio chiptune SFX + looping bass line
// ============================================================

'use strict';

const AUDIO = (() => {
  let ctx = null;
  let muted = false;
  let musicOn = true;
  let musicTimer = null;
  let musicStep = 0;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // one voice: square/triangle blip with optional pitch slide
  function tone(freq, dur, type, vol, slideTo, when) {
    if (muted) return;
    const c = ensure(); if (!c) return;
    const t = c.currentTime + (when || 0);
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(vol || 0.08, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }

  // white-noise burst (explosions, hits)
  function noise(dur, vol, low) {
    if (muted) return;
    const c = ensure(); if (!c) return;
    const n = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, n, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = c.createBufferSource(); src.buffer = buf;
    const g = c.createGain(); g.gain.value = vol || 0.15;
    if (low) {
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700;
      src.connect(f); f.connect(g);
    } else src.connect(g);
    g.connect(c.destination);
    src.start();
  }

  const sfx = {
    shoot()   { tone(900, 0.08, 'square', 0.05, 180); },
    enemyShoot() { tone(500, 0.1, 'sawtooth', 0.04, 120); },
    hit()     { noise(0.08, 0.1); },
    hurt()    { tone(160, 0.25, 'sawtooth', 0.1, 60); noise(0.1, 0.08, true); },
    die()     { tone(400, 0.6, 'triangle', 0.12, 40); noise(0.4, 0.12, true); },
    pickup()  { tone(660, 0.06, 'square', 0.06); tone(990, 0.08, 'square', 0.06, null, 0.06); },
    crystal() { tone(880, 0.05, 'triangle', 0.08); tone(1320, 0.05, 'triangle', 0.08, null, 0.05); tone(1760, 0.1, 'triangle', 0.08, null, 0.1); },
    cash()    { tone(1046, 0.06, 'square', 0.07); tone(1318, 0.1, 'square', 0.07, null, 0.07); },
    denied()  { tone(200, 0.15, 'square', 0.08, 120); },
    alarm()   { tone(700, 0.15, 'square', 0.07, 500); tone(700, 0.15, 'square', 0.07, 500, 0.2); },
    explosion(){ noise(0.6, 0.25, true); tone(80, 0.6, 'triangle', 0.2, 30); },
    siphon()  { tone(300 + Math.random() * 60, 0.05, 'triangle', 0.03); },
    step()    { },
    jingle() { // level clear
      const seq = [523, 659, 784, 1046, 784, 1046];
      seq.forEach((f, i) => tone(f, 0.12, 'square', 0.09, null, i * 0.11));
    },
    gameover() {
      const seq = [392, 370, 349, 330, 311, 294, 262];
      seq.forEach((f, i) => tone(f, 0.2, 'triangle', 0.1, null, i * 0.18));
    },
    victory() {
      const seq = [523, 523, 523, 659, 784, 1046, 784, 1046, 1318];
      seq.forEach((f, i) => tone(f, 0.16, 'square', 0.09, null, i * 0.14));
    },
  };

  // ---- background music: minor-key bass arpeggio loop ----
  const BASS = [110, 110, 131, 110, 87, 87, 98, 110,
                110, 110, 131, 147, 165, 147, 131, 98];
  const LEAD = [0, 220, 0, 262, 0, 175, 196, 0,
                220, 0, 262, 294, 330, 0, 262, 196];

  function startMusic() {
    if (musicTimer) return;
    musicTimer = setInterval(() => {
      if (muted || !musicOn || !ctx) return;
      const b = BASS[musicStep % BASS.length];
      tone(b, 0.14, 'triangle', 0.05);
      const l = LEAD[musicStep % LEAD.length];
      if (l && musicStep % 2 === 0) tone(l, 0.1, 'square', 0.02);
      musicStep++;
    }, 160);
  }
  function toggleMute() { muted = !muted; return muted; }

  return { ensure, sfx, startMusic, toggleMute, get muted() { return muted; } };
})();
