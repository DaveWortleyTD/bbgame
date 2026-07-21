// ============================================================
// touch.js — on-screen touch controls + control settings panel.
// Drives the same input state as the keyboard via vkeyDown/vkeyUp
// (defined in game.js). Loaded after game.js.
// ============================================================

'use strict';

(function () {
  const STORE = 'bbgameControls';
  const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

  function load() {
    try { return JSON.parse(localStorage.getItem(STORE)) || {}; }
    catch (e) { return {}; }
  }
  const cfg = Object.assign({ scheme: 'dpad', scale: 'medium', show: isTouch }, load());
  // ?touchui=1 forces the on-screen controls on (handy on hybrid laptops, or to test)
  if (/[?&]touchui=1\b/.test(location.search)) cfg.show = true;
  function save() { localStorage.setItem(STORE, JSON.stringify(cfg)); }

  const $ = id => document.getElementById(id);
  const layer = $('touchlayer');

  function applyLayer() {
    layer.dataset.scheme = cfg.scheme;
    layer.dataset.scale = cfg.scale;
    layer.classList.toggle('hidden-controls', !cfg.show);
  }
  applyLayer();

  // ---- settings panel ----
  const panel = $('settingsPanel');
  function syncPanelFromCfg() {
    $('showControlsChk').checked = cfg.show;
    document.querySelectorAll('input[name=scheme]').forEach(r => { r.checked = r.value === cfg.scheme; });
    document.querySelectorAll('input[name=scale]').forEach(r => { r.checked = r.value === cfg.scale; });
  }
  $('gearBtn').addEventListener('pointerdown', ev => {
    ev.preventDefault(); ev.stopPropagation();
    syncPanelFromCfg();
    panel.classList.add('open');
  });
  $('closeSettings').addEventListener('click', () => panel.classList.remove('open'));
  $('showControlsChk').addEventListener('change', ev => { cfg.show = ev.target.checked; save(); applyLayer(); });
  document.querySelectorAll('input[name=scheme]').forEach(r => {
    r.addEventListener('change', () => { if (r.checked) { cfg.scheme = r.value; save(); applyLayer(); } });
  });
  document.querySelectorAll('input[name=scale]').forEach(r => {
    r.addEventListener('change', () => { if (r.checked) { cfg.scale = r.value; save(); applyLayer(); } });
  });

  // ---- generic press-and-hold button -> virtual key ----
  function wireButton(el, key) {
    let down = false;
    const press = ev => {
      ev.preventDefault();
      if (down) return;
      down = true;
      el.classList.add('pressed');
      vkeyDown(key);
    };
    const release = () => {
      if (!down) return;
      down = false;
      el.classList.remove('pressed');
      vkeyUp(key);
    };
    el.addEventListener('pointerdown', press);
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
    el.addEventListener('pointerleave', release);
  }
  document.querySelectorAll('#padDpad .dbtn, #padActions .abtn').forEach(el => wireButton(el, el.dataset.k));

  // ---- floating joystick ----
  const stickZone = $('padStick'), stickBase = $('stickBase'), stickKnob = $('stickKnob');
  const DIRS = ['up', 'down', 'left', 'right'];
  let stickId = null, originX = 0, originY = 0;
  const DEAD = 12, MAXR = 34;

  function clearDirs() { DIRS.forEach(vkeyUp); }
  function updateStick(cx, cy) {
    const dx = cx - originX, dy = cy - originY;
    const dist = Math.hypot(dx, dy);
    const r = Math.min(dist, MAXR);
    const ang = Math.atan2(dy, dx);
    stickKnob.style.transform = 'translate(' + (Math.cos(ang) * r) + 'px,' + (Math.sin(ang) * r) + 'px)';
    clearDirs();
    if (dist < DEAD) return;
    const deg = ang * 180 / Math.PI;   // -180..180, 0=right, 90=down
    if (deg > -22.5 && deg <= 22.5) vkeyDown('right');
    else if (deg <= 67.5) { vkeyDown('right'); vkeyDown('down'); }
    else if (deg <= 112.5) vkeyDown('down');
    else if (deg <= 157.5) { vkeyDown('left'); vkeyDown('down'); }
    else if (deg > 157.5 || deg <= -157.5) vkeyDown('left');
    else if (deg <= -112.5) { vkeyDown('left'); vkeyDown('up'); }
    else if (deg <= -67.5) vkeyDown('up');
    else { vkeyDown('right'); vkeyDown('up'); }
  }
  stickZone.addEventListener('pointerdown', ev => {
    if (stickId !== null) return;
    ev.preventDefault();
    stickId = ev.pointerId;
    originX = ev.clientX; originY = ev.clientY;
    const r = stickZone.getBoundingClientRect();
    stickBase.style.left = (ev.clientX - r.left) + 'px';
    stickBase.style.top = (ev.clientY - r.top) + 'px';
    stickBase.style.display = 'block';
    stickKnob.style.transform = 'translate(0,0)';
    updateStick(ev.clientX, ev.clientY);
  });
  stickZone.addEventListener('pointermove', ev => { if (ev.pointerId === stickId) updateStick(ev.clientX, ev.clientY); });
  function endStick(ev) {
    if (ev.pointerId !== stickId) return;
    stickId = null;
    stickBase.style.display = 'none';
    clearDirs();
  }
  stickZone.addEventListener('pointerup', endStick);
  stickZone.addEventListener('pointercancel', endStick);
  stickZone.addEventListener('pointerleave', endStick);
})();
