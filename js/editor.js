// ============================================================
// editor.js — paint tiles/things on any map, pull tiles/characters
// from the global libraries, design your own pixel art (tiles or
// characters, built-in or custom), export as code, or save to
// localStorage where the game auto-applies it.
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
let showLabels = true;
let undoStack = [];
let painting = 0;          // 1 = paint, 2 = erase
let customTiles = {};      // name -> {px: [16 strings], solid: bool}
let customChars = {};      // name -> {px: [rows of palette chars]}
let extraTiles = {};       // mapKey -> {char: tileName}
let customLevels = {};     // id -> {name, tiles, things, map} - brand-new draft levels

const $ = id => document.getElementById(id);
const view = $('view');
const vctx = view.getContext('2d');
vctx.imageSmoothingEnabled = false;

function loadEdits() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; }
  catch (e) { return {}; }
}
function saveEdits(edits) { localStorage.setItem(STORE_KEY, JSON.stringify(edits)); }

// snapshot of every shipped tile/character (name -> {cv[, solid]}), taken
// before any saved overrides are applied below. This is what "revert to
// original" restores - we never mutate a canvas in place, only ever
// replace the TILE[name]/SPR[name] pointer, so keeping a reference (no
// cloning) is safe.
const BUILTIN = {};
for (const name in TILE) BUILTIN[name] = { cv: TILE[name], solid: SOLID.has(name) };

const CHAR_BUILTIN = {};
for (const name in SPR) if (!HIDDEN_CHAR_NAMES.has(name)) CHAR_BUILTIN[name] = { cv: SPR[name] };

// sample a canvas into a palette-char pixel grid (rows = its height, each
// row length = its width), snapping each pixel to the nearest game-palette
// color. Used both for "copy from existing" and for opening the designer
// on an unmodified built-in tile/character.
function samplePixels(cv) {
  const w = cv.width, h = cv.height;
  const c = cv.getContext('2d');
  const img = c.getImageData(0, 0, w, h).data;
  const colv = Object.keys(COL).map(k => {
    const hex = COL[k];
    return [k, parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
  });
  const rows = [];
  for (let j = 0; j < h; j++) {
    let row = '';
    for (let i = 0; i < w; i++) {
      const o = (j * w + i) * 4;
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
  return rows;
}

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

// restore custom characters (global overrides, not per-map)
(function restoreCharState() {
  const edits = loadEdits();
  customChars = edits['::chars'] || {};
  for (const name in customChars) {
    SPR[name] = makeSprite(customChars[name].px);
    if (ROTATE_FAMILIES[name]) ROTATE_FAMILIES[name]();
  }
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

function persistCharState() {
  const edits = loadEdits();
  if (Object.keys(customChars).length) edits['::chars'] = customChars;
  else delete edits['::chars'];
  saveEdits(edits);
}

// restore draft levels created via "+ new level" (not part of the shipped
// game yet - these just need to exist in REGISTRY so they're paintable)
(function restoreCustomLevelsState() {
  const edits = loadEdits();
  customLevels = edits['::levels'] || {};
  for (const id in customLevels) {
    const def = customLevels[id];
    REGISTRY.push({ key: 'CUSTOM:' + id, label: '★ ' + def.name, def, custom: true });
  }
})();

function persistCustomLevelsState() {
  const edits = loadEdits();
  if (Object.keys(customLevels).length) edits['::levels'] = customLevels;
  else delete edits['::levels'];
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
  $('deleteLevelBtn').classList.toggle('hide', !cur.custom);
  buildPalette();
  render();
  updateExport();
  status(saved ? 'showing SAVED edits for this map' : '');
}

// ---- palette ----
function buildPalette() {
  const pal = $('palette');
  pal.innerHTML = '';

  const mkBtn = (label, fn) => {
    const b = document.createElement('button');
    b.className = 'palbtn';
    b.textContent = label;
    b.onclick = fn;
    return b;
  };
  pal.append(
    mkBtn('+ TILE LIBRARY', () => openLibrary('tile')),
    mkBtn('* NEW TILE', () => openDesigner('tile', null)),
    mkBtn('+ CHARACTER LIBRARY', () => openLibrary('char')),
    mkBtn('* NEW CHARACTER', () => openDesigner('char', null)),
  );

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
    if (info.kind === 'tile') {
      const ed = document.createElement('span');
      ed.className = 'edit'; ed.textContent = 'edit';
      ed.onclick = ev => { ev.stopPropagation(); openDesigner('tile', info.tile); };
      row.appendChild(ed);
    } else if (info.sprite && SPR[info.sprite]) {
      const ed = document.createElement('span');
      ed.className = 'edit'; ed.textContent = 'edit';
      ed.onclick = ev => { ev.stopPropagation(); openDesigner('char', info.sprite); };
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
    const scale = Math.min(1, 16 / s.width, 16 / s.height);
    const sw = s.width * scale, sh = s.height * scale;
    c.drawImage(s, 0, 0, s.width, s.height, x + (16 - sw) / 2, y + (16 - sh) / 2, sw, sh);
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
  // location titles (same data the game renders in the overworld)
  if (showLabels && cur.def.labels) {
    for (const [tx, ty, t] of cur.def.labels) {
      const lx = tx * 16 + 8, ly = Math.max(1, ty * 16 - 10);
      const w = textWidth(t, 1) + 4;
      vctx.fillStyle = 'rgba(0,0,0,.65)';
      vctx.fillRect(lx - w / 2, ly - 1, w, 7);
      drawTextC(vctx, t, lx, ly, 'w', 1);
    }
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
window.addEventListener('mouseup', () => {
  if (painting) { painting = 0; updateExport(); render(); }  // re-render restores labels chipped while dragging
});
view.addEventListener('contextmenu', ev => ev.preventDefault());
window.addEventListener('keydown', ev => {
  if ((ev.ctrlKey || ev.metaKey) && ev.code === 'KeyZ') {
    ev.preventDefault();
    const prev = undoStack.pop();
    if (prev) { grid = prev; render(); updateExport(); }
  }
});

// ============================================================
// Tile / character library overlay (shared)
// ============================================================
function openLibrary(kind) {
  const ov = $('library');
  const list = $('liblist');
  list.innerHTML = '';
  $('libtitle').textContent = kind === 'tile'
    ? 'TILE LIBRARY - every tile from every level'
    : 'CHARACTER LIBRARY - every character/sprite in the game';

  const store = kind === 'tile' ? TILE : SPR;
  const custom = kind === 'tile' ? customTiles : customChars;
  const builtin = kind === 'tile' ? BUILTIN : CHAR_BUILTIN;
  const names = Object.keys(store)
    .filter(n => kind === 'tile' || !HIDDEN_CHAR_NAMES.has(n))
    .sort();

  for (const name of names) {
    const cv = store[name];
    const row = document.createElement('div');
    row.className = 'pal';
    const sw = document.createElement('canvas');
    sw.width = 16; sw.height = 16;
    const swc = sw.getContext('2d');
    const scale = Math.min(1, 16 / cv.width, 16 / cv.height);
    const sw2 = cv.width * scale, sh2 = cv.height * scale;
    swc.drawImage(cv, 0, 0, cv.width, cv.height, (16 - sw2) / 2, (16 - sh2) / 2, sw2, sh2);
    const nm = document.createElement('span');
    nm.className = 'nm';
    const tag = custom[name] ? (builtin[name] ? ' *modified' : ' *custom') : '';
    const dims = kind === 'char' ? ' ' + cv.width + 'x' + cv.height : '';
    nm.textContent = name + (kind === 'tile' && SOLID.has(name) ? ' (solid)' : '') + dims + tag;
    row.append(sw, nm);
    const ed = document.createElement('span');
    ed.className = 'edit'; ed.textContent = 'edit';
    ed.onclick = ev => { ev.stopPropagation(); ov.style.display = 'none'; openDesigner(kind, name); };
    row.appendChild(ed);
    row.onclick = () => {
      if (kind === 'tile') {
        const ch = charForTile(name);
        if (!ch) { status('no free map chars left for this map'); return; }
        brush = ch;
        ov.style.display = 'none';
        buildPalette();
        status("'" + name + "' painted with char '" + ch + "'");
      } else {
        ov.style.display = 'none';
        openDesigner('char', name);
      }
    };
    list.appendChild(row);
  }
  ov.style.display = 'flex';
}
$('libclose').onclick = () => { $('library').style.display = 'none'; };

// ============================================================
// Tile / character designer overlay (shared)
// ============================================================
const D = { kind: 'tile', px: [], w: 16, h: 16, color: 'w', editing: null, painting: 0 };
const dcanvas = $('dcanvas');
const dctx = dcanvas.getContext('2d');
dctx.imageSmoothingEnabled = false;
const DCELL = 16; // backing-canvas px per source pixel

function blankPx(w, h) { return Array.from({ length: h }, () => '.'.repeat(w)); }

function openDesigner(kind, name) {
  D.kind = kind;
  D.editing = name;
  const isTile = kind === 'tile';
  const store = isTile ? TILE : SPR;
  const custom = isTile ? customTiles : customChars;
  const builtin = isTile ? BUILTIN : CHAR_BUILTIN;

  if (name && custom[name]) {
    // either a pure custom asset, or a saved override of a built-in
    D.px = custom[name].px.slice();
    D.w = D.px[0].length; D.h = D.px.length;
    $('dname').value = name;
    if (isTile) $('dsolid').checked = !!custom[name].solid;
  } else if (name && store[name]) {
    // unmodified built-in: sample its real pixels rather than starting blank
    D.px = samplePixels(store[name]);
    D.w = store[name].width; D.h = store[name].height;
    $('dname').value = name;
    if (isTile) $('dsolid').checked = SOLID.has(name);
  } else {
    D.w = isTile ? 16 : Math.max(4, Math.min(32, +$('dwidth').value || 16));
    D.h = isTile ? 16 : Math.max(4, Math.min(32, +$('dheight').value || 16));
    D.px = blankPx(D.w, D.h);
    $('dname').value = '';
    if (isTile) $('dsolid').checked = false;
  }

  $('dsolidWrap').classList.toggle('hide', !isTile);
  $('dNewDims').classList.toggle('hide', !(!name && !isTile));
  $('dsaveLabel').textContent = isTile ? 'save tile' : 'save character';
  $('dname').placeholder = isTile ? 'tile name' : 'character name';

  const label = isTile ? 'TILE' : 'CHARACTER';
  if (!name) $('dtitle').textContent = 'NEW ' + label;
  else if (builtin[name] && !custom[name]) $('dtitle').textContent = 'EDIT BUILT-IN ' + label + ': ' + name;
  else if (builtin[name]) $('dtitle').textContent = 'EDIT MODIFIED ' + label + ': ' + name;
  else $('dtitle').textContent = 'EDIT ' + label + ': ' + name;

  const isBuiltin = name && builtin[name];
  $('ddelete').textContent = isBuiltin ? 'revert to original' : 'delete';
  $('ddelete').disabled = !!(isBuiltin && !custom[name]);   // nothing to revert yet
  $('dstatus').textContent = '';

  buildDesignerPalette();
  buildLoadFrom(kind);
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

function buildLoadFrom(kind) {
  const sel = $('dload');
  sel.innerHTML = '<option value="">copy from existing...</option>';
  const store = kind === 'tile' ? TILE : SPR;
  const names = Object.keys(store)
    .filter(n => kind === 'tile' || !HIDDEN_CHAR_NAMES.has(n))
    .sort();
  for (const name of names) {
    const o = document.createElement('option');
    o.value = name; o.textContent = name;
    sel.appendChild(o);
  }
}

$('dload').onchange = ev => {
  const name = ev.target.value;
  if (!name) return;
  const isTile = D.kind === 'tile';
  const custom = isTile ? customTiles : customChars;
  const store = isTile ? TILE : SPR;
  D.px = custom[name] ? custom[name].px.slice() : samplePixels(store[name]);
  D.w = D.px[0].length; D.h = D.px.length;
  drawDesigner();
  ev.target.value = '';
};

// rotate/flip the pixels currently in the designer - handy for spinning up
// a directional variant (e.g. a corner/rotated wall) to save as a new tile
// without redrawing from scratch. Square grids (all tiles) keep their size;
// rectangular ones (characters) swap width/height on a 90-degree turn.
function rotatePxCW(px) {
  const h = px.length, w = px[0].length;
  const out = [];
  for (let i = 0; i < w; i++) {
    let row = '';
    for (let j = h - 1; j >= 0; j--) row += px[j][i];
    out.push(row);
  }
  return out;
}
function flipPxH(px) { return px.map(r => r.split('').reverse().join('')); }
function flipPxV(px) { return px.slice().reverse(); }

$('drotate').onclick = () => {
  D.px = rotatePxCW(D.px);
  D.w = D.px[0].length; D.h = D.px.length;
  drawDesigner();
};
$('dfliph').onclick = () => { D.px = flipPxH(D.px); drawDesigner(); };
$('dflipv').onclick = () => { D.px = flipPxV(D.px); drawDesigner(); };

function drawDesigner() {
  dcanvas.width = D.w * DCELL;
  dcanvas.height = D.h * DCELL;
  // fit the display box to a consistent long edge regardless of aspect
  // ratio, overriding the stylesheet's fixed square size
  const disp = 320 / Math.max(dcanvas.width, dcanvas.height);
  dcanvas.style.width = Math.round(dcanvas.width * disp) + 'px';
  dcanvas.style.height = Math.round(dcanvas.height * disp) + 'px';

  for (let j = 0; j < D.h; j++) {
    for (let i = 0; i < D.w; i++) {
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
  for (let i = 0; i <= D.w; i++) {
    dctx.beginPath(); dctx.moveTo(i * DCELL + 0.5, 0); dctx.lineTo(i * DCELL + 0.5, D.h * DCELL); dctx.stroke();
  }
  for (let j = 0; j <= D.h; j++) {
    dctx.beginPath(); dctx.moveTo(0, j * DCELL + 0.5); dctx.lineTo(D.w * DCELL, j * DCELL + 0.5); dctx.stroke();
  }

  // live preview: tiled 3x3 for floor tiles, one big copy for characters
  const pv = $('dpreview').getContext('2d');
  pv.imageSmoothingEnabled = false;
  pv.clearRect(0, 0, 96, 48);
  pv.fillStyle = '#000'; pv.fillRect(0, 0, 96, 48);
  const spr = makeSprite(D.px);
  if (D.kind === 'tile') {
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) pv.drawImage(spr, 40 + i * 16, j * 16);
    pv.drawImage(spr, 4, 16);
  } else {
    const big = Math.min(88 / D.w, 44 / D.h, 4);
    pv.save();
    pv.translate(48 - (D.w * big) / 2, 24 - (D.h * big) / 2);
    pv.scale(big, big);
    pv.drawImage(spr, 0, 0);
    pv.restore();
  }
}

function dcell(ev) {
  const r = dcanvas.getBoundingClientRect();
  const i = Math.floor((ev.clientX - r.left) / (r.width / D.w));
  const j = Math.floor((ev.clientY - r.top) / (r.height / D.h));
  if (i < 0 || j < 0 || i > D.w - 1 || j > D.h - 1) return null;
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
  const isTile = D.kind === 'tile';
  const store = isTile ? TILE : SPR;
  const custom = isTile ? customTiles : customChars;
  const builtin = isTile ? BUILTIN : CHAR_BUILTIN;
  const persist = isTile ? persistTileState : persistCharState;

  const raw = $('dname').value.trim();
  // tile names are always lowercase; character names are case-sensitive
  // (hankNpc, waltUndies, gusNpc are real built-in sprite names)
  const name = isTile ? raw.toLowerCase() : raw;
  const nameRe = isTile ? /^[a-z][a-z0-9_]{1,15}$/ : /^[A-Za-z][A-Za-z0-9_]{1,15}$/;
  if (!nameRe.test(name)) { $('dstatus').textContent = 'name: letters/digits/_ (2-16 chars)'; return; }
  if (store[name] && !custom[name] && name !== D.editing) {
    $('dstatus').textContent = "'" + name + "' is a built-in " + (isTile ? 'tile' : 'character') + ' name';
    return;
  }
  if (D.editing && D.editing !== name) delete custom[D.editing];

  if (isTile) {
    custom[name] = { px: D.px.slice(), solid: $('dsolid').checked };
    TILE[name] = makeSprite(D.px);
    if ($('dsolid').checked) SOLID.add(name); else SOLID.delete(name);
  } else {
    custom[name] = { px: D.px.slice() };
    SPR[name] = makeSprite(D.px);
    if (ROTATE_FAMILIES[name]) ROTATE_FAMILIES[name]();
  }
  persist();
  $('designer').style.display = 'none';

  const overridingBuiltin = builtin[name] && name === D.editing;
  const ch = isTile ? charForTile(name) : null;   // characters have no per-map paint slot (yet)
  const kindWord = isTile ? 'tile' : 'character';
  const paintNote = ch ? " - painting with '" + ch + "'" : '';
  const savedMsg = overridingBuiltin
    ? "'" + name + "' overridden everywhere it's used" + paintNote
    : "'" + name + "' " + kindWord + " saved" + paintNote;
  if (ch) brush = ch;
  status(savedMsg);
  buildPalette();
  render();   // repaint in case an edited tile/character is already visible
};
$('dcancel').onclick = () => { $('designer').style.display = 'none'; };
$('ddelete').onclick = () => {
  const isTile = D.kind === 'tile';
  const store = isTile ? TILE : SPR;
  const custom = isTile ? customTiles : customChars;
  const builtin = isTile ? BUILTIN : CHAR_BUILTIN;
  const persist = isTile ? persistTileState : persistCharState;
  const name = D.editing;
  if (!name) { $('designer').style.display = 'none'; return; }

  if (builtin[name]) {
    // revert an edited built-in back to its shipped art - the name keeps
    // existing (and, for vehicles, its rotated facings regenerate), so
    // nothing else on any map needs to change
    if (!custom[name]) { $('designer').style.display = 'none'; return; }
    store[name] = builtin[name].cv;
    if (isTile) { if (builtin[name].solid) SOLID.add(name); else SOLID.delete(name); }
    else if (ROTATE_FAMILIES[name]) ROTATE_FAMILIES[name]();
    delete custom[name];
    persist();
    $('designer').style.display = 'none';
    buildPalette();
    render();
    status("'" + name + "' reverted to the built-in original");
    return;
  }

  if (!custom[name]) { $('designer').style.display = 'none'; return; }
  if (isTile) {
    const usedBy = [];
    for (const mk in extraTiles)
      for (const ch in extraTiles[mk])
        if (extraTiles[mk][ch] === name) usedBy.push(mk);
    if (usedBy.length) { $('dstatus').textContent = 'in use on: ' + usedBy.join(', ') + ' - repaint those first'; return; }
    SOLID.delete(name);
  }
  delete custom[name];
  delete store[name];
  persist();
  $('designer').style.display = 'none';
  buildPalette();
};

// ---- export / stats / persistence ----
function mapRows() { return grid.map(r => r.join('')); }

function updateExport() {
  let out;
  if (cur.custom) {
    // brand-new level: there's no existing js/levels.js entry to diff
    // against, so hand over a full paste-ready object skeleton instead
    // of just a map snippet.
    out = '{\n  name: ' + JSON.stringify(cur.def.name) + ',\n' +
      '  tiles: ' + JSON.stringify(Object.assign({}, cur.def.tiles, extraTiles[cur.key] || {})) + ',\n' +
      '  things: {},  // describe what should happen here and Claude will fill this in\n' +
      '  map: [\n' + mapRows().map(r => "    '" + r + "',").join('\n') + '\n  ],\n},';
    $('export').value = out;
    return;
  }
  out = '  map: [\n' + mapRows().map(r => "    '" + r + "',").join('\n') + '\n  ],';
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
  if (Object.keys(customChars).length) {
    out += '\n\n  // character overrides active (global, not map-specific): ' + Object.keys(customChars).join(', ') + '\n';
    out += '  // each is SPR.<name> = makeSprite([...16-or-so rows...]) in js/sprites.js\n';
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
function rebuildLevelSelect(selectIdx) {
  sel.innerHTML = '';
  REGISTRY.forEach((r, i) => {
    const o = document.createElement('option');
    o.value = i; o.textContent = r.label;
    sel.appendChild(o);
  });
  if (selectIdx !== undefined) sel.value = selectIdx;
}
rebuildLevelSelect();
sel.onchange = () => selectLevel(+sel.value);
$('zoomSel').onchange = ev => { zoom = +ev.target.value; render(); };
$('gridChk').onchange = ev => { showGrid = ev.target.checked; render(); };
$('labelsChk').onchange = ev => { showLabels = ev.target.checked; render(); };
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
  status(cur.custom ? 'reverted to the blank template' : 'reverted to the shipped map');
};

// ---- new / delete custom levels ----
function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'level';
}
$('newLevelBtn').onclick = () => {
  $('nlName').value = ''; $('nlWidth').value = 24; $('nlHeight').value = 14; $('nlStatus').textContent = '';
  $('newLevelPanel').style.display = 'flex';
};
$('nlCancel').onclick = () => { $('newLevelPanel').style.display = 'none'; };
$('nlCreate').onclick = () => {
  const name = $('nlName').value.trim();
  const w = Math.max(8, Math.min(84, +$('nlWidth').value || 0));
  const h = Math.max(8, Math.min(60, +$('nlHeight').value || 0));
  if (!name) { $('nlStatus').textContent = 'give it a name'; return; }
  let id = slugify(name);
  if (customLevels[id]) {
    let n = 2;
    while (customLevels[id + '_' + n]) n++;
    id = id + '_' + n;
  }
  const map = [];
  for (let j = 0; j < h; j++) {
    let row = '';
    for (let i = 0; i < w; i++) {
      row += (j === 0 || j === h - 1 || i === 0 || i === w - 1) ? '#' : (i === 1 && j === 1) ? 'P' : '.';
    }
    map.push(row);
  }
  const def = { name, tiles: { '#': 'brick', '.': 'walk' }, things: {}, map };
  customLevels[id] = def;
  persistCustomLevelsState();
  REGISTRY.push({ key: 'CUSTOM:' + id, label: '★ ' + name, def, custom: true });
  rebuildLevelSelect(REGISTRY.length - 1);
  selectLevel(REGISTRY.length - 1);
  $('newLevelPanel').style.display = 'none';
  status("'" + name + "' created - paint away, then tell Claude how to hook it up");
};
$('deleteLevelBtn').onclick = () => {
  if (!cur.custom) return;
  if (!confirm("Delete draft level '" + cur.def.name + "'? This can't be undone.")) return;
  const id = cur.key.slice('CUSTOM:'.length);
  delete customLevels[id];
  persistCustomLevelsState();
  const edits = loadEdits();
  delete edits[cur.key];
  saveEdits(edits);
  const idx = REGISTRY.findIndex(r => r.key === cur.key);
  if (idx >= 0) REGISTRY.splice(idx, 1);
  rebuildLevelSelect(0);
  selectLevel(0);
  status("deleted '" + id + "'");
};
$('saveBtn').onclick = () => {
  const issues = validate();
  if (issues.length) { status('fix first: ' + issues[0]); return; }
  const edits = loadEdits();
  edits[cur.key] = mapRows();
  saveEdits(edits);
  persistTileState();
  status(cur.custom ? 'saved - this draft isn\'t wired into the game yet' : 'saved! refresh the game tab to play it');
};
$('clearBtn').onclick = () => {
  localStorage.removeItem(STORE_KEY);
  for (const name in customTiles) {
    if (BUILTIN[name]) {                          // restore, don't delete
      TILE[name] = BUILTIN[name].cv;
      if (BUILTIN[name].solid) SOLID.add(name); else SOLID.delete(name);
    } else {
      delete TILE[name];
      SOLID.delete(name);
    }
  }
  for (const name in customChars) {
    if (CHAR_BUILTIN[name]) {                     // restore, don't delete
      SPR[name] = CHAR_BUILTIN[name].cv;
      if (ROTATE_FAMILIES[name]) ROTATE_FAMILIES[name]();
    } else {
      delete SPR[name];
    }
  }
  customTiles = {};
  customChars = {};
  extraTiles = {};
  selectLevel(+sel.value);
  status('all saved edits cleared');
};
$('copyBtn').onclick = () => {
  navigator.clipboard.writeText($('export').value).then(() => status('copied'));
};

// hand every saved edit (maps, custom/overridden tiles, custom/overridden
// characters) to a human, or to Claude, as one portable JSON file -
// localStorage never leaves the browser on its own, so this is the way
// edits get out to be merged into the actual source.
$('exportAllBtn').onclick = () => {
  const edits = loadEdits();
  const keys = Object.keys(edits);
  if (!keys.length) { status('no saved edits in this browser to export'); return; }

  const maps = keys.filter(k => k.indexOf('::') !== 0);
  const nTiles = Object.keys(edits['::tiles'] || {}).length;
  const nChars = Object.keys(edits['::chars'] || {}).length;
  const nLevels = Object.keys(edits['::levels'] || {}).length;

  const blob = new Blob([JSON.stringify(edits, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'bbgame-edits.json';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);

  navigator.clipboard.writeText(JSON.stringify(edits)).catch(() => {});
  status('downloaded bbgame-edits.json (also copied) - ' +
    maps.length + ' map(s), ' + nTiles + ' tile override(s), ' + nChars + ' character override(s), ' +
    nLevels + ' new level(s)');
};

// #<mapkey> in the URL preselects that map (e.g. editor.html#WORLD)
let startIdx = REGISTRY.findIndex(r => r.key === decodeURIComponent((location.hash || '').slice(1)));
if (startIdx < 0) startIdx = 0;
sel.value = startIdx;
selectLevel(startIdx);
