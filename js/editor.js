// ============================================================
// editor.js — paint tiles/things on any map, export as code,
// or save to localStorage where the game auto-applies it.
// Loads sprites.js + levels.js (not game.js — no game loop here).
// ============================================================

'use strict';

const STORE_KEY = 'bbgameEdits';

// ---- registry of every editable map ----
const REGISTRY = [];
LEVELS.forEach((L, i) => {
  REGISTRY.push({ key: 'L' + i, label: 'M' + (i + 1) + ' ' + L.name, def: L });
  if (L.chain) REGISTRY.push({ key: 'L' + i + '.chain', label: 'M' + (i + 1) + ' ' + L.name + ' (PART 2)', def: L.chain });
  if (L.phase2) REGISTRY.push({ key: 'L' + i + '.phase2', label: 'M' + (i + 1) + ' ' + L.name + ' (PHASE 2)', def: L.phase2 });
});
REGISTRY.push({ key: 'SIDE_COOK', label: 'SIDE: DESERT COOK', def: SIDE_COOK });
REGISTRY.push({ key: 'SIDE_WASH', label: 'SIDE: CAR WASH', def: SIDE_WASH });
REGISTRY.push({ key: 'SIDE_PEST', label: 'SIDE: VAMANOS PEST', def: SIDE_PEST });
REGISTRY.push({ key: 'WORLD', label: 'OPEN WORLD: ALBUQUERQUE', def: WORLD });

// sprites for map things (mirrors ETYPES sprite fields in game.js)
const ENEMY_SPRITE = {
  snake: 'snake', jeep: 'jeep', goon: 'goon', nazi: 'nazi', rival: 'dealer',
  tuco: 'tuco', cousin: 'cousin', jack: 'nazi', cop: 'cop', victor: 'victor',
  guard: 'guard', camera: 'camera', krazy8: 'krazy8', henchman: 'goon',
  cartel: 'dealer', kid: 'kid1', sponger: 'kid2', trafficL: 'jeep', trafficR: 'jeep',
};
const PICKUP_SPRITE = {
  cash: 'cash', heart: 'heart', chicken: 'chicken', bomb: 'bomb', flask: 'flask',
  crystal: 'crystal', hcrystal: 'crystal', supply: 'flask', ingredient: 'flask', chk: 'arrow',
};

// ---- describe a char within a def ----
function charInfo(def, ch) {
  if (ch === 'P') return { kind: 'player', name: 'player start', color: '#4f4' };
  if (ch === 'X') return { kind: 'exit', name: 'exit', color: '#f4f' };
  const spec = def.things && def.things[ch];
  if (spec) {
    if (spec.e) return { kind: 'enemy', name: 'enemy: ' + spec.e, sprite: ENEMY_SPRITE[spec.e], color: '#f66' };
    if (spec.a) return { kind: 'ally', name: 'ally: ' + spec.a, sprite: spec.a, color: '#6af' };
    if (spec.p) {
      const spr = (spec.extra && spec.extra.sprite) || PICKUP_SPRITE[spec.p] || 'crystal';
      return { kind: 'pickup', name: 'pickup: ' + spec.p, sprite: spr, color: '#fd6' };
    }
    if (spec.i) return { kind: 'inter', name: 'object: ' + (spec.i.label || spec.i.sprite || ch), sprite: spec.i.sprite, color: '#6fd' };
  }
  const tile = def.tiles[ch];
  if (tile) return { kind: 'tile', name: 'tile: ' + tile, tile, color: '#999' };
  return null;
}

function floorTileOf(def, ch) {
  const spec = def.things && def.things[ch];
  if (spec && spec.tile) return spec.tile;
  return def.tiles['.'];
}

// ---- state ----
let cur = null;            // registry entry
let grid = [];             // array of array of chars
let brush = '.';
let zoom = 2;
let showGrid = true;
let undoStack = [];
let painting = 0;          // 1 = paint, 2 = erase

const $ = id => document.getElementById(id);
const view = $('view');
const vctx = view.getContext('2d');
vctx.imageSmoothingEnabled = false;

function loadEdits() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; }
  catch (e) { return {}; }
}
function saveEdits(edits) { localStorage.setItem(STORE_KEY, JSON.stringify(edits)); }

// ---- level switching ----
function selectLevel(idx) {
  cur = REGISTRY[idx];
  const saved = loadEdits()[cur.key];
  const rows = saved || cur.def.map;
  grid = rows.map(r => r.split(''));
  undoStack = [];
  brush = '.';
  buildPalette();
  render();
  updateExport();
  status(saved ? 'showing SAVED edits for this map' : '');
}

// ---- palette ----
function buildPalette() {
  const pal = $('palette');
  pal.innerHTML = '';
  const chars = [];
  for (const ch in cur.def.tiles) chars.push(ch);
  if (cur.def.things) for (const ch in cur.def.things) if (chars.indexOf(ch) < 0) chars.push(ch);
  for (const ch of ['P', 'X']) if (chars.indexOf(ch) < 0) chars.push(ch);

  for (const ch of chars) {
    const info = charInfo(cur.def, ch);
    if (!info) continue;
    const row = document.createElement('div');
    row.className = 'pal' + (ch === brush ? ' sel' : '');
    row.dataset.ch = ch;
    const sw = document.createElement('canvas');
    sw.width = 16; sw.height = 16;
    drawCellOn(sw.getContext('2d'), 0, 0, ch, info);
    const chEl = document.createElement('span');
    chEl.className = 'ch'; chEl.textContent = ch;
    const nm = document.createElement('span');
    nm.className = 'nm'; nm.textContent = info.name;
    row.append(sw, chEl, nm);
    row.onclick = () => { brush = ch; buildPalette(); };
    pal.appendChild(row);
  }
}

// ---- rendering ----
function drawCellOn(c, x, y, ch, info) {
  info = info || charInfo(cur.def, ch);
  const tileName = info && info.kind === 'tile' ? info.tile : floorTileOf(cur.def, ch);
  const t = TILE[tileName];
  if (t) c.drawImage(t, x, y); else { c.fillStyle = '#000'; c.fillRect(x, y, 16, 16); }
  if (!info || info.kind === 'tile') return;
  if (info.sprite && SPR[info.sprite]) {
    const s = SPR[info.sprite];
    const sw = Math.min(16, s.width), sh = Math.min(16, s.height);
    c.drawImage(s, 0, 0, sw, sh, x + (16 - sw) / 2, y + (16 - sh) / 2, sw, sh);
  } else {
    c.fillStyle = info.color;
    c.globalAlpha = 0.35; c.fillRect(x + 1, y + 1, 14, 14); c.globalAlpha = 1;
    drawText(c, ch, x + 6, y + 5, 'w', 1);
  }
  // corner tag so P/X/things stay findable even under sprites
  c.fillStyle = info.color;
  c.fillRect(x, y, 3, 3);
}

function render() {
  const H = grid.length, W = grid[0].length;
  view.width = W * 16; view.height = H * 16;
  view.style.width = (W * 16 * zoom) + 'px';
  view.style.height = (H * 16 * zoom) + 'px';
  for (let j = 0; j < H; j++)
    for (let i = 0; i < W; i++)
      drawCellOn(vctx, i * 16, j * 16, grid[j][i]);
  if (showGrid) {
    vctx.strokeStyle = 'rgba(255,255,255,.08)';
    for (let i = 0; i <= W; i++) { vctx.beginPath(); vctx.moveTo(i * 16 + 0.5, 0); vctx.lineTo(i * 16 + 0.5, H * 16); vctx.stroke(); }
    for (let j = 0; j <= H; j++) { vctx.beginPath(); vctx.moveTo(0, j * 16 + 0.5); vctx.lineTo(W * 16, j * 16 + 0.5); vctx.stroke(); }
  }
  updateStats();
}

function renderCell(i, j) {
  drawCellOn(vctx, i * 16, j * 16, grid[j][i]);
  if (showGrid) {
    vctx.strokeStyle = 'rgba(255,255,255,.08)';
    vctx.strokeRect(i * 16 + 0.5, j * 16 + 0.5, 16, 16);
  }
}

// ---- painting ----
function cellAt(ev) {
  const r = view.getBoundingClientRect();
  const i = Math.floor((ev.clientX - r.left) / (16 * zoom));
  const j = Math.floor((ev.clientY - r.top) / (16 * zoom));
  if (i < 0 || j < 0 || j >= grid.length || i >= grid[0].length) return null;
  return [i, j];
}

function applyBrush(i, j, ch) {
  if (grid[j][i] === ch) return;
  grid[j][i] = ch;
  renderCell(i, j);
}

view.addEventListener('mousedown', ev => {
  ev.preventDefault();
  const c = cellAt(ev);
  if (!c) return;
  if (ev.button === 1 || ev.altKey) {           // eyedropper
    brush = grid[c[1]][c[0]];
    buildPalette();
    return;
  }
  undoStack.push(grid.map(r => r.slice()));
  if (undoStack.length > 60) undoStack.shift();
  painting = ev.button === 2 ? 2 : 1;
  applyBrush(c[0], c[1], painting === 2 ? '.' : brush);
});
view.addEventListener('mousemove', ev => {
  const c = cellAt(ev);
  if (c) status('(' + c[0] + ',' + c[1] + ') ' + (charInfo(cur.def, grid[c[1]][c[0]]) || { name: grid[c[1]][c[0]] }).name, true);
  if (!painting || !c) return;
  applyBrush(c[0], c[1], painting === 2 ? '.' : brush);
});
window.addEventListener('mouseup', () => { if (painting) { painting = 0; updateExport(); } });
view.addEventListener('contextmenu', ev => ev.preventDefault());
window.addEventListener('keydown', ev => {
  if ((ev.ctrlKey || ev.metaKey) && ev.code === 'KeyZ') {
    ev.preventDefault();
    const prev = undoStack.pop();
    if (prev) { grid = prev; render(); updateExport(); }
  }
});

// ---- export / stats / persistence ----
function mapRows() { return grid.map(r => r.join('')); }

function updateExport() {
  $('export').value = '  map: [\n' + mapRows().map(r => "    '" + r + "',").join('\n') + '\n  ],';
}

function validate() {
  const flat = mapRows().join('');
  const issues = [];
  const pCount = (flat.match(/P/g) || []).length;
  if (pCount !== 1) issues.push(pCount + ' player starts (need exactly 1)');
  if (cur.def.map.join('').includes('X') && !flat.includes('X')) issues.push('original map had an exit X, this one has none');
  return issues;
}

function updateStats() {
  const flat = mapRows().join('');
  const counts = {};
  for (const ch of flat) if (cur.def.things && cur.def.things[ch]) counts[ch] = (counts[ch] || 0) + 1;
  const parts = Object.keys(counts).map(ch => ch + ':' + counts[ch]);
  const issues = validate();
  $('stats').innerHTML = grid[0].length + 'x' + grid.length + ' tiles &middot; ' + (parts.join(' ') || 'no things') +
    (issues.length ? '<br><span class="warn">! ' + issues.join('<br>! ') + '</span>' : '<br><span class="ok">map ok</span>');
}

let statusT = null;
function status(text, transient) {
  $('status').textContent = text;
  if (transient) { clearTimeout(statusT); statusT = setTimeout(() => { $('status').textContent = ''; }, 1500); }
}

// ---- toolbar ----
const sel = $('levelSel');
REGISTRY.forEach((r, i) => {
  const o = document.createElement('option');
  o.value = i; o.textContent = r.label;
  sel.appendChild(o);
});
sel.onchange = () => selectLevel(+sel.value);
$('zoomSel').onchange = ev => { zoom = +ev.target.value; render(); };
$('gridChk').onchange = ev => { showGrid = ev.target.checked; render(); };
$('undoBtn').onclick = () => { const p = undoStack.pop(); if (p) { grid = p; render(); updateExport(); } };
$('revertBtn').onclick = () => {
  const edits = loadEdits();
  delete edits[cur.key];
  saveEdits(edits);
  grid = cur.def.map.map(r => r.split(''));
  undoStack = [];
  render(); updateExport();
  status('reverted to the shipped map');
};
$('saveBtn').onclick = () => {
  const issues = validate();
  if (issues.length) { status('fix first: ' + issues[0]); return; }
  const edits = loadEdits();
  edits[cur.key] = mapRows();
  saveEdits(edits);
  status('saved! refresh the game tab to play it');
};
$('clearBtn').onclick = () => {
  localStorage.removeItem(STORE_KEY);
  selectLevel(+sel.value);
  status('all saved edits cleared');
};
$('copyBtn').onclick = () => {
  navigator.clipboard.writeText($('export').value).then(() => status('copied'));
};

selectLevel(0);
