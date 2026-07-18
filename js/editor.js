// ============================================================
// editor.js — paint tiles/things on any map, pull tiles from the
// global tile library, design your own 16x16 tiles, export as code,
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

// chars we may hand out when a library tile needs a slot in this map
const CHAR_POOL = 'abcdefghijklmnopqrstuvwxyzABDEFGIJKLMNQRSTUVWYZ0123456789!@%^&*()_+[]{};<>?~|';

// ---- state ----
let cur = null;            // registry entry
let grid = [];             // array of array of chars
let brush = '.';
let zoom = 2;
let showGrid = true;
let undoStack = [];
let painting = 0;          // 1 = paint, 2 = erase
let customTiles = {};      // name -> {px: [16 strings], solid: bool}
let extraTiles = {};       // mapKey -> {char: tileName}

const $ = id => document.getElementById(id);
const view = $('view');
const vctx = view.getContext('2d');
vctx.imageSmoothingEnabled = false;

function loadEdits() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; }
  catch (e) { return {}; }
}
function saveEdits(edits) { localStorage.setItem(STORE_KEY, JSON.stringify(edits)); }

// restore custom tiles + per-map tile mappings from the store
(function restoreTileState() {
  const edits = loadEdits();
  customTiles = edits['::tiles'] || {};
  for (const name in customTiles) {
    TILE[name] = makeSprite(customTiles[name].px);
    if (customTiles[name].solid) SOLID.add(name);
  }
  for (const k in edits) if (k.indexOf('::tilemap:') === 0) extraTiles[k.slice(10)] = edits[k];
})();

function persistTileState() {
  const edits = loadEdits();
  if (Object.keys(customTiles).length) edits['::tiles'] = customTiles;
  else delete edits['::tiles'];
  for (const mk in extraTiles) {
    if (Object.keys(extraTiles[mk]).length) edits['::tilemap:' + mk] = extraTiles[mk];
    else delete edits['::tilemap:' + mk];
  }
  saveEdits(edits);
}

// effective char->tile mapping for the current map (base + library additions)
function allTiles() {
  return Object.assign({}, cur.def.tiles, extraTiles[cur.key] || {});
}

// ---- describe a char within the current map ----
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
  const tile = allTiles()[ch];
  if (tile) {
    return { kind: 'tile', name: 'tile: ' + tile + (SOLID.has(tile) ? ' (solid)' : ''), tile, color: '#999' };
  }
  return null;
}

function floorTileOf(def, ch) {
  const spec = def.things && def.things[ch];
  if (spec && spec.tile) return spec.tile;
  return def.tiles['.'];
}

// ---- level switching ----
function selectLevel(idx) {
  cur = REGISTRY[idx];
  const saved = loadEdits()[cur.key];
  const rows = saved || cur.def.map;
  const w = Math.max(...rows.map(r => r.length));
  grid = rows.map(r => r.padEnd(w, '.').split(''));
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

  const libBtn = document.createElement('button');
  libBtn.className = 'palbtn';
  libBtn.textContent = '+ TILE LIBRARY';
  libBtn.onclick = openLibrary;
  const newBtn = document.createElement('button');
  newBtn.className = 'palbtn';
  newBtn.textContent = '* NEW TILE';
  newBtn.onclick = () => openDesigner(null);
  pal.append(libBtn, newBtn);

  const tiles = allTiles();
  const chars = [];
  for (const ch in tiles) chars.push(ch);
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
    if (info.kind === 'tile' && customTiles[info.tile]) {
      const ed = document.createElement('span');
      ed.className = 'edit'; ed.textContent = 'edit';
      ed.onclick = ev => { ev.stopPropagation(); openDesigner(info.tile); };
      row.appendChild(ed);
    }
    row.onclick = () => { brush = ch; buildPalette(); };
    pal.appendChild(row);
  }
}

// find (or mint) a map char for a tile name; returns the char or null
function charForTile(tileName) {
  const tiles = allTiles();
  for (const ch in tiles) if (tiles[ch] === tileName) return ch;
  const taken = new Set(Object.keys(tiles));
  if (cur.def.things) for (const ch in cur.def.things) taken.add(ch);
  taken.add('P'); taken.add('X');
  for (const ch of CHAR_POOL) {
    if (!taken.has(ch)) {
      if (!extraTiles[cur.key]) extraTiles[cur.key] = {};
      extraTiles[cur.key][ch] = tileName;
      persistTileState();
      return ch;
    }
  }
  return null;
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

// ============================================================
// Tile library overlay
// ============================================================
function openLibrary() {
  const ov = $('library');
  const list = $('liblist');
  list.innerHTML = '';
  const names = Object.keys(TILE).sort();
  for (const name of names) {
    const row = document.createElement('div');
    row.className = 'pal';
    const sw = document.createElement('canvas');
    sw.width = 16; sw.height = 16;
    sw.getContext('2d').drawImage(TILE[name], 0, 0);
    const nm = document.createElement('span');
    nm.className = 'nm';
    nm.textContent = name + (SOLID.has(name) ? ' (solid)' : '') + (customTiles[name] ? ' *custom' : '');
    row.append(sw, nm);
    if (customTiles[name]) {
      const ed = document.createElement('span');
      ed.className = 'edit'; ed.textContent = 'edit';
      ed.onclick = ev => { ev.stopPropagation(); ov.style.display = 'none'; openDesigner(name); };
      row.appendChild(ed);
    }
    row.onclick = () => {
      const ch = charForTile(name);
      if (!ch) { status('no free map chars left for this map'); return; }
      brush = ch;
      ov.style.display = 'none';
      buildPalette();
      status("'" + name + "' painted with char '" + ch + "'");
    };
    list.appendChild(row);
  }
  ov.style.display = 'flex';
}
$('libclose').onclick = () => { $('library').style.display = 'none'; };

// ============================================================
// Tile designer overlay
// ============================================================
const D = { px: [], color: 'w', editing: null, painting: 0 };
const dcanvas = $('dcanvas');
const dctx = dcanvas.getContext('2d');
dctx.imageSmoothingEnabled = false;
const DCELL = 16; // display px per tile pixel

function blankPx() { return Array.from({ length: 16 }, () => '.'.repeat(16)); }

function openDesigner(name) {
  D.editing = name;
  if (name && customTiles[name]) {
    D.px = customTiles[name].px.slice();
    $('dname').value = name;
    $('dsolid').checked = !!customTiles[name].solid;
  } else {
    D.px = blankPx();
    $('dname').value = '';
    $('dsolid').checked = false;
  }
  $('dtitle').textContent = name ? 'EDIT TILE: ' + name : 'NEW TILE';
  buildDesignerPalette();
  buildLoadFrom();
  drawDesigner();
  $('designer').style.display = 'flex';
}

function buildDesignerPalette() {
  const pal = $('dpalette');
  pal.innerHTML = '';
  const entries = [['.', 'transparent']].concat(Object.keys(COL).map(k => [k, '']));
  for (const [k] of entries) {
    const b = document.createElement('div');
    b.className = 'dcol' + (D.color === k ? ' sel' : '');
    b.style.background = k === '.' ? 'transparent' : COL[k];
    if (k === '.') b.classList.add('trans');
    b.title = k;
    b.onclick = () => { D.color = k; buildDesignerPalette(); };
    pal.appendChild(b);
  }
}

function buildLoadFrom() {
  const sel = $('dload');
  sel.innerHTML = '<option value="">copy from existing...</option>';
  for (const name of Object.keys(TILE).sort()) {
    const o = document.createElement('option');
    o.value = name; o.textContent = name;
    sel.appendChild(o);
  }
}

$('dload').onchange = ev => {
  const name = ev.target.value;
  if (!name) return;
  if (customTiles[name]) { D.px = customTiles[name].px.slice(); drawDesigner(); return; }
  // sample the built-in tile canvas, snapping to the nearest palette color
  const c = TILE[name].getContext('2d');
  const img = c.getImageData(0, 0, 16, 16).data;
  const colv = Object.keys(COL).map(k => {
    const h = COL[k];
    return [k, parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  });
  const rows = [];
  for (let j = 0; j < 16; j++) {
    let row = '';
    for (let i = 0; i < 16; i++) {
      const o = (j * 16 + i) * 4;
      if (img[o + 3] < 128) { row += '.'; continue; }
      let best = 'k', bd = 1e9;
      for (const [k, r, g, b] of colv) {
        const d = (img[o] - r) ** 2 + (img[o + 1] - g) ** 2 + (img[o + 2] - b) ** 2;
        if (d < bd) { bd = d; best = k; }
      }
      row += best;
    }
    rows.push(row);
  }
  D.px = rows;
  drawDesigner();
  ev.target.value = '';
};

function drawDesigner() {
  dcanvas.width = 16 * DCELL; dcanvas.height = 16 * DCELL;
  for (let j = 0; j < 16; j++) {
    for (let i = 0; i < 16; i++) {
      const ch = D.px[j][i];
      if (ch === '.') {   // checkerboard = transparent
        dctx.fillStyle = (i + j) % 2 ? '#26262c' : '#1c1c22';
      } else {
        dctx.fillStyle = COL[ch] || '#f0f';
      }
      dctx.fillRect(i * DCELL, j * DCELL, DCELL, DCELL);
    }
  }
  dctx.strokeStyle = 'rgba(255,255,255,.07)';
  for (let i = 0; i <= 16; i++) {
    dctx.beginPath(); dctx.moveTo(i * DCELL + 0.5, 0); dctx.lineTo(i * DCELL + 0.5, 256); dctx.stroke();
    dctx.beginPath(); dctx.moveTo(0, i * DCELL + 0.5); dctx.lineTo(256, i * DCELL + 0.5); dctx.stroke();
  }
  // live preview at 1x and on a floor tile
  const pv = $('dpreview').getContext('2d');
  pv.imageSmoothingEnabled = false;
  pv.clearRect(0, 0, 96, 48);
  const spr = makeSprite(D.px);
  pv.fillStyle = '#000'; pv.fillRect(0, 0, 96, 48);
  pv.drawImage(spr, 4, 16);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) pv.drawImage(spr, 40 + i * 16, j * 16);
}

function dcell(ev) {
  const r = dcanvas.getBoundingClientRect();
  const i = Math.floor((ev.clientX - r.left) / (r.width / 16));
  const j = Math.floor((ev.clientY - r.top) / (r.height / 16));
  if (i < 0 || j < 0 || i > 15 || j > 15) return null;
  return [i, j];
}
function dpaint(i, j, ch) {
  D.px[j] = D.px[j].slice(0, i) + ch + D.px[j].slice(i + 1);
  drawDesigner();
}
dcanvas.addEventListener('mousedown', ev => {
  ev.preventDefault();
  const c = dcell(ev);
  if (!c) return;
  if (ev.altKey || ev.button === 1) { D.color = D.px[c[1]][c[0]]; buildDesignerPalette(); return; }
  D.painting = ev.button === 2 ? 2 : 1;
  dpaint(c[0], c[1], D.painting === 2 ? '.' : D.color);
});
dcanvas.addEventListener('mousemove', ev => {
  if (!D.painting) return;
  const c = dcell(ev);
  if (c) dpaint(c[0], c[1], D.painting === 2 ? '.' : D.color);
});
window.addEventListener('mouseup', () => { D.painting = 0; });
dcanvas.addEventListener('contextmenu', ev => ev.preventDefault());

$('dsave').onclick = () => {
  const name = $('dname').value.trim().toLowerCase();
  if (!/^[a-z][a-z0-9_]{1,15}$/.test(name)) { $('dstatus').textContent = 'name: a-z, 0-9, _ (2-16 chars)'; return; }
  if (TILE[name] && !customTiles[name] && name !== D.editing) { $('dstatus').textContent = "'" + name + "' is a built-in tile name"; return; }
  if (D.editing && D.editing !== name) delete customTiles[D.editing];
  customTiles[name] = { px: D.px.slice(), solid: $('dsolid').checked };
  TILE[name] = makeSprite(D.px);
  if ($('dsolid').checked) SOLID.add(name); else SOLID.delete(name);
  persistTileState();
  $('designer').style.display = 'none';
  const ch = charForTile(name);
  if (ch) { brush = ch; status("tile '" + name + "' saved - painting with '" + ch + "'"); }
  buildPalette();
  render();   // repaint in case an edited tile is already on the map
};
$('dcancel').onclick = () => { $('designer').style.display = 'none'; };
$('ddelete').onclick = () => {
  if (!D.editing || !customTiles[D.editing]) { $('designer').style.display = 'none'; return; }
  const name = D.editing;
  const usedBy = [];
  for (const mk in extraTiles)
    for (const ch in extraTiles[mk])
      if (extraTiles[mk][ch] === name) usedBy.push(mk);
  if (usedBy.length) { $('dstatus').textContent = 'in use on: ' + usedBy.join(', ') + ' - repaint those first'; return; }
  delete customTiles[name];
  delete TILE[name];
  SOLID.delete(name);
  persistTileState();
  $('designer').style.display = 'none';
  buildPalette();
};

// ---- export / stats / persistence ----
function mapRows() { return grid.map(r => r.join('')); }

function updateExport() {
  let out = '  map: [\n' + mapRows().map(r => "    '" + r + "',").join('\n') + '\n  ],';
  const extra = extraTiles[cur.key];
  if (extra && Object.keys(extra).length) {
    out += '\n\n  // add to this level\'s tiles: {}\n';
    out += Object.keys(extra).map(ch => "  '" + ch + "': '" + extra[ch] + "',").join('\n');
  }
  const used = new Set();
  const tiles = allTiles();
  for (const r of mapRows()) for (const ch of r) if (tiles[ch] && customTiles[tiles[ch]]) used.add(tiles[ch]);
  if (used.size) {
    out += '\n\n  // custom tile defs (build with makeSprite, add solid ones to SOLID):\n';
    for (const name of used) out += '  // ' + name + ': ' + JSON.stringify(customTiles[name]) + '\n';
  }
  $('export').value = out;
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
  const w = Math.max(...grid.map(r => r.length));
  grid = grid.map(r => { while (r.length < w) r.push('.'); return r; });
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
  persistTileState();
  status('saved! refresh the game tab to play it');
};
$('clearBtn').onclick = () => {
  localStorage.removeItem(STORE_KEY);
  for (const name in customTiles) { delete TILE[name]; SOLID.delete(name); }
  customTiles = {};
  extraTiles = {};
  selectLevel(+sel.value);
  status('all saved edits cleared');
};
$('copyBtn').onclick = () => {
  navigator.clipboard.writeText($('export').value).then(() => status('copied'));
};

selectLevel(0);
