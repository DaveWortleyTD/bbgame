// ============================================================
// sprites.js — NES-style palette, pixel sprites, tiles, 3x5 font
// All art is generated in code onto offscreen canvases at load.
// ============================================================

'use strict';

// ---- Palette (NES-ish, 1980s limited colors) ----
const COL = {
  k: '#000000',  // black
  w: '#fcfcfc',  // white
  s: '#f0bc94',  // skin
  y: '#f8b800',  // hazmat yellow
  Y: '#fce454',  // light yellow
  g: '#00a844',  // green
  G: '#005824',  // dark green
  b: '#0058f8',  // blue
  n: '#00287c',  // navy
  c: '#3cbcfc',  // crystal blue
  C: '#a8e4fc',  // pale crystal
  r: '#d82800',  // red
  R: '#f87858',  // light red
  o: '#f87800',  // orange
  t: '#e0c088',  // sand tan
  T: '#c09850',  // dark tan
  d: '#7c4a10',  // brown
  e: '#404040',  // dark gray
  a: '#7c7c7c',  // gray
  l: '#bcbcbc',  // light gray
  v: '#6844fc',  // purple
  m: '#888800',  // olive
  p: '#f878f8',  // pink (neon accents)
};

// Build an offscreen canvas from rows of palette chars ('.'=transparent)
function makeSprite(rows) {
  const h = rows.length, w = rows[0].length;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const x = cv.getContext('2d');
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const ch = rows[j][i];
      if (ch === '.' || ch === ' ') continue;
      x.fillStyle = COL[ch] || '#f0f';
      x.fillRect(i, j, 1, 1);
    }
  }
  return cv;
}

// ---- Person template: parametrized 16x16 character ----
// hat: hat/hair color char or null (bald), shirt, pants, skin, eye
function makePerson(hat, shirt, pants, skin, eye, opts) {
  opts = opts || {};
  const H = hat || skin, Cc = shirt, L = pants, S = skin, E = eye || 'k';
  const rows = [
    '................',
    hat ? ('.....' + H.repeat(6) + '.....') : '................',
    hat ? ('....' + H.repeat(8) + '....') : ('.....' + S.repeat(6) + '.....'),
    '.....' + S.repeat(6) + '.....',
    '....' + S + E + S + S + S + S + E + S + '....',
    '.....' + S.repeat(6) + '.....',
    opts.beard ? ('.....' + S + 'e' + 'e' + 'e' + 'e' + S + '.....')
               : ('.....' + S.repeat(6) + '.....'),
    '.....' + Cc.repeat(6) + '.....',
    '....' + Cc.repeat(8) + '....',
    '...' + Cc.repeat(2) + '.' + Cc.repeat(4) + '.' + Cc.repeat(2) + '...',
    '...' + S + Cc + '.' + Cc.repeat(4) + '.' + Cc + S + '...',
    '......' + Cc.repeat(4) + '......',
    '.....' + L.repeat(2) + '..' + L.repeat(2) + '.....',
    '.....' + L.repeat(2) + '..' + L.repeat(2) + '.....',
    '.....kk..kk.....',
    '................',
  ];
  return makeSprite(rows);
}

const SPR = {};

// ---- Characters ----
SPR.walt    = makePerson('k', 'y', 'y', 's', 'e', { beard: true }); // Heisenberg: hat + hazmat
SPR.jesse   = makePerson('r', 'r', 'b', 's', 'k');                  // red hoodie
SPR.goon    = makePerson('e', 'e', 'b', 's', 'k');
SPR.cop     = makePerson('n', 'n', 'n', 's', 'k');
SPR.tuco    = makePerson('k', 'r', 'k', 's', 'r');
SPR.cousin  = makePerson('k', 'l', 'l', 's', 'k');
SPR.victor  = makePerson('k', 'k', 'k', 's', 'k');
SPR.guard   = makePerson('e', 'm', 'e', 's', 'k');
SPR.nazi    = makePerson(null, 'e', 'b', 's', 'r');
SPR.buyer   = makePerson('a', 'a', 'e', 's', 'k');
SPR.dealer  = makePerson('k', 'v', 'k', 's', 'k');

// Overworld NPCs
SPR.skyler  = makePerson('Y', 'c', 'e', 's', 'k');
SPR.marie   = makePerson('k', 'v', 'v', 's', 'k');
SPR.hankNpc = makePerson(null, 'o', 'd', 's', 'k');
SPR.waltjr  = makePerson('k', 'b', 'e', 's', 'k');
SPR.skinny  = makePerson('a', 'm', 'e', 's', 'k');
SPR.badger  = makePerson('o', 'g', 'd', 's', 'k');
SPR.wendy   = makePerson('Y', 'p', 'b', 's', 'k');
SPR.saul    = makePerson('d', 'b', 'n', 's', 'k');
SPR.gusNpc  = makePerson(null, 'Y', 'k', 's', 'k');
SPR.vamanos = makePerson('m', 'm', 'm', 's', 'k');

// Story cast
SPR.kid1    = makePerson('d', 'r', 'b', 's', 'k');
SPR.kid2    = makePerson('Y', 'g', 'e', 's', 'k');
SPR.kid3    = makePerson('k', 'c', 'd', 's', 'k');
SPR.doctor  = makePerson('a', 'w', 'w', 's', 'k');
SPR.nurse   = makePerson('Y', 'w', 'c', 's', 'k');
SPR.recep   = makePerson('d', 'p', 'e', 's', 'k');
SPR.gale    = makePerson('o', 'l', 'd', 's', 'k');
SPR.gomez   = makePerson('k', 'b', 'e', 's', 'k');
SPR.combo   = makePerson('k', 'c', 'e', 's', 'k');
SPR.cashier = makePerson('d', 'Y', 'k', 's', 'k');
SPR.ped1    = makePerson('e', 't', 'd', 's', 'k');
SPR.ped2    = makePerson('Y', 'v', 'e', 's', 'k');
SPR.krazy8  = makePerson('k', 'g', 'k', 's', 'k');
SPR.waltUndies = makePerson(null, 's', 'w', 's', 'e', { beard: true }); // fugue state
SPR.bogdan  = makePerson('k', 'l', 'e', 's', 'k', { beard: true });

// The roof pizza (10x8)
SPR.pizza = makeSprite([
  '...tttt...',
  '..tYYYYt..',
  '.tYYrYYYt.',
  'tYYYYYrYYt',
  'tYrYYYYYYt',
  '.tYYYrYYt.',
  '..tYYYYt..',
  '...tttt...',
]);

// Sponge (6x6)
SPR.sponge = makeSprite([
  'YYYYYY',
  'YkYYYY',
  'YYYYkY',
  'YYYYYY',
  'YkYYYY',
  'YYYYYY',
]);

// Poison vial (8x8)
SPR.vial = makeSprite([
  '..ll....',
  '..ll....',
  '.lwwl...',
  '.lwrl...',
  '.lrrl...',
  '.lrrl...',
  '.llll...',
  '........',
]);

// Barrel of methylamine handled by SPR.barrel

// Jesse's bouncing red car (16x14 top-down, facing up) + rotations
SPR.redcar = makeSprite([
  '....kkkkkkkk....',
  '...kYrrrrrrYk...',
  '..kkrnnnnnnrkk..',
  '.ekrrnnnnnnrrke.',
  '.ekrrrrrrrrrrke.',
  '..krrrrrrrrrrk..',
  '..krrkkkkkkrrk..',
  '..krrkkkkkkrrk..',
  '..krrrrrrrrrrk..',
  '..krrnnnnnnrrk..',
  '.ekrrrrrrrrrrke.',
  '.ekrrrrrrrrrrke.',
  '...krrrrrrrrk...',
  '....kkkkkkkk....',
  '................',
  '................',
]);

// Door (8x8, for overworld entrances)
SPR.door = makeSprite([
  'kkkkkkkk',
  'kddddddk',
  'kddddddk',
  'kddddddk',
  'kdddddYk',
  'kddddddk',
  'kddddddk',
  'kkkkkkkk',
]);

// Snake (16x8)
SPR.snake = makeSprite([
  '................',
  '..gg......gg.gg.',
  '.gGGg....gGGgGrg',
  '.gG.gg..gg.GGGg.',
  '..gg.gggg.gg....',
  '...ggg..ggg.....',
  '................',
  '................',
]);

// DEA jeep (16x16 top-down)
SPR.jeep = makeSprite([
  '................',
  '....kkkkkkkk....',
  '...kkeeeeeekk...',
  '...keewwwweek...',
  '...keew..week...',
  '...keeeeeeeek...',
  '..kkeeeeeeeekk..',
  '..kkeewwwweekk..',
  '..kkeew..weekk..',
  '..kkeeeeeeeekk..',
  '...keeeeeeeek...',
  '...keeknnkeek...',
  '...keeknnkeek...',
  '...kkeeeeeekk...',
  '....kkkkkkkk....',
  '................',
]);

// The RV — Krystal Ship (16x20 top-down, facing up).
// Cream roof, brown side stripes, windshield, tires, roof AC + vent.
SPR.rv = makeSprite([
  '....kkkkkkkk....',
  '...kYwwwwwwYk...',
  '..kwnnnnnnnnwk..',
  '..kwnnnnnnnnwk..',
  '.ekddwwwwwwddke.',
  '.ekddwwwwwwddke.',
  '..kddwwwwwwddk..',
  '..kddwllllwddk..',
  '..kddwlwwlwddk..',
  '..kddwllllwddk..',
  '..kddwwwwwwddk..',
  '..kddwkkwwwddk..',
  '..kddwkkwwwddk..',
  '.ekddwwwwwwddke.',
  '.ekddwwwwwwddke.',
  '..kddwwwwwwddk..',
  '..kwwwwwwwwwwk..',
  '...kllllllllk...',
  '....kkkkkkkk....',
  '................',
]);

// 90-degree-step rotations are pixel-perfect: build all 4 facings
function rotCW(cv) {
  const out = document.createElement('canvas');
  out.width = cv.height; out.height = cv.width;
  const x = out.getContext('2d');
  x.imageSmoothingEnabled = false;
  x.translate(out.width, 0);
  x.rotate(Math.PI / 2);
  x.drawImage(cv, 0, 0);
  return out;
}
SPR.rv_up = SPR.rv;
SPR.rv_right = rotCW(SPR.rv_up);
SPR.rv_down = rotCW(SPR.rv_right);
SPR.rv_left = rotCW(SPR.rv_down);

SPR.jeep_right = rotCW(SPR.jeep);
SPR.jeep_left = rotCW(rotCW(SPR.jeep_right));

SPR.redcar_up = SPR.redcar;
SPR.redcar_right = rotCW(SPR.redcar_up);
SPR.redcar_down = rotCW(SPR.redcar_right);
SPR.redcar_left = rotCW(SPR.redcar_down);

// Hector in wheelchair (16x16)
SPR.hector = makeSprite([
  '................',
  '.....llllll.....',
  '.....ssssss.....',
  '....sksssskss...',
  '.....ssssss.....',
  '...llllllllll...',
  '...l.llllll.l...',
  '...l.llllll.l...',
  '...llllllllll...',
  '..ee.llllll.ee..',
  '.e..e.llll.e..e.',
  '.e..e......e..e.',
  '.e..e..YY..e..e.',
  '..ee...YY...ee..',
  '................',
  '................',
]);

// Security camera (8x8)
SPR.camera = makeSprite([
  '.aaaa...',
  'aallaa..',
  'aalllaar',
  'aallaa..',
  '.aaaa...',
  '...a....',
  '...a....',
  '..aaa...',
]);

// ---- Pickups (8x8) ----
SPR.crystal = makeSprite([
  '...c....',
  '..cCc...',
  '.cCCcc..',
  'cCCcCCc.',
  'cCcccCc.',
  '.ccCcc..',
  '..ccc...',
  '........',
]);
SPR.cash = makeSprite([
  '........',
  'gggggggg',
  'gGGggGGg',
  'gGgwwgGg',
  'gGgwwgGg',
  'gGGggGGg',
  'gggggggg',
  '........',
]);
SPR.heart = makeSprite([
  '.rr..rr.',
  'rRRrrRRr',
  'rRRRRRRr',
  'rRRRRRRr',
  '.rRRRRr.',
  '..rRRr..',
  '...rr...',
  '........',
]);
SPR.flask = makeSprite([
  '..lll...',
  '...l....',
  '...l....',
  '..lcl...',
  '.lcccl..',
  'lcccccl.',
  'lcccccl.',
  '.lllll..',
]);
SPR.chicken = makeSprite([
  '.rrrrrr.',
  'rwwwwwwr',
  'rwrwwrwr',
  'rwwwwwwr',
  'rrrrrrrr',
  'rwrwrwrr',
  'rwrwrwrr',
  '.rrrrrr.',
]);
SPR.bomb = makeSprite([
  '.....o..',
  '....o...',
  '..kkk...',
  '.kkkkk..',
  'kkkwkkk.',
  'kkkkkkk.',
  '.kkkkk..',
  '..kkk...',
]);
SPR.bell = makeSprite([
  '...YY...',
  '..YYYY..',
  '..YYYY..',
  '.YYYYYY.',
  '.YYYYYY.',
  'YYYYYYYY',
  '...kk...',
  '........',
]);
SPR.barrel = makeSprite([
  '.kkkkkk.',
  'kmmmmmmk',
  'kmYYYYmk',
  'kmmmmmmk',
  'kmYYYYmk',
  'kmmmmmmk',
  'kmmmmmmk',
  '.kkkkkk.',
]);
SPR.m60 = makeSprite([
  '........',
  'k.......',
  'kkkkkkkk',
  '.kekkkkk',
  '..kk....',
  '..kk....',
  '........',
  '........',
]);
SPR.arrow = makeSprite([
  '...YY...',
  '..YYYY..',
  '.YYYYYY.',
  'YYYYYYYY',
  '...YY...',
  '...YY...',
  '...YY...',
  '........',
]);

// ============================================================
// Tiles: 16x16 generated procedurally with a seeded PRNG so the
// speckle pattern is stable frame to frame.
// ============================================================
function makeTile(base, speck, density, extra) {
  const cv = document.createElement('canvas');
  cv.width = 16; cv.height = 16;
  const x = cv.getContext('2d');
  x.fillStyle = COL[base]; x.fillRect(0, 0, 16, 16);
  let seed = 1234 + base.charCodeAt(0) * 7 + (speck ? speck.charCodeAt(0) : 0);
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  if (speck) {
    x.fillStyle = COL[speck];
    const n = Math.floor(256 * (density || 0.08));
    for (let i = 0; i < n; i++) x.fillRect(Math.floor(rnd() * 16), Math.floor(rnd() * 16), 1, 1);
  }
  if (extra) extra(x);
  return cv;
}

const TILE = {};
TILE.sand    = makeTile('t', 'T', 0.08);
TILE.rock    = makeTile('T', 'd', 0.2, x => {
  x.fillStyle = COL.a; x.fillRect(3, 3, 10, 10);
  x.fillStyle = COL.l; x.fillRect(4, 4, 5, 4);
  x.fillStyle = COL.e; x.fillRect(8, 9, 4, 3);
});
TILE.cactus  = makeTile('t', 'T', 0.08, x => {
  x.fillStyle = COL.G;
  x.fillRect(6, 2, 4, 12); x.fillRect(2, 4, 3, 2); x.fillRect(2, 4, 2, 5);
  x.fillRect(11, 6, 3, 2); x.fillRect(12, 3, 2, 5);
  x.fillStyle = COL.g; x.fillRect(7, 2, 2, 12);
});
TILE.road    = makeTile('e', 'k', 0.1);
TILE.roadlin = makeTile('e', 'k', 0.1, x => { x.fillStyle = COL.Y; x.fillRect(7, 2, 2, 5); x.fillRect(7, 10, 2, 5); });
TILE.walk    = makeTile('l', 'a', 0.1, x => { x.strokeStyle = COL.a; x.strokeRect(0.5, 0.5, 16, 16); });
TILE.brick   = makeTile('d', 'k', 0.05, x => {
  x.fillStyle = COL.k;
  x.fillRect(0, 4, 16, 1); x.fillRect(0, 9, 16, 1); x.fillRect(0, 14, 16, 1);
  x.fillRect(4, 0, 1, 4); x.fillRect(11, 5, 1, 4); x.fillRect(6, 10, 1, 4);
});
TILE.labfloor = makeTile('a', 'l', 0.05, x => { x.strokeStyle = COL.e; x.strokeRect(0.5, 0.5, 16, 16); });
TILE.labwall = makeTile('e', 'k', 0.1, x => { x.fillStyle = COL.c; x.fillRect(2, 2, 12, 2); });
TILE.tank    = makeTile('l', 'a', 0.1, x => {
  x.fillStyle = COL.c; x.fillRect(2, 2, 12, 12);
  x.fillStyle = COL.C; x.fillRect(3, 3, 4, 4);
  x.strokeStyle = COL.e; x.strokeRect(1.5, 1.5, 13, 13);
});
TILE.carpet  = makeTile('T', 'd', 0.06);
TILE.wallhome = makeTile('t', 'T', 0.04, x => { x.fillStyle = COL.d; x.fillRect(0, 12, 16, 4); });
TILE.rail    = makeTile('t', 'T', 0.08, x => {
  x.fillStyle = COL.d; x.fillRect(0, 3, 16, 2); x.fillRect(0, 11, 16, 2);
  x.fillStyle = COL.a; x.fillRect(2, 0, 2, 16); x.fillRect(12, 0, 2, 16);
});
TILE.train   = makeTile('e', 'k', 0.05, x => {
  x.fillStyle = COL.a; x.fillRect(0, 2, 16, 3);
  x.fillStyle = COL.k; x.fillRect(0, 13, 16, 3);
});
TILE.car     = makeTile('r', 'R', 0.05, x => {
  x.fillStyle = COL.k; x.fillRect(0, 0, 16, 2); x.fillRect(0, 14, 16, 2);
  x.fillStyle = COL.c; x.fillRect(3, 4, 10, 3);
});
TILE.crate   = makeTile('d', 'k', 0.05, x => {
  x.strokeStyle = COL.k; x.strokeRect(0.5, 0.5, 15, 15);
  x.beginPath(); x.moveTo(0, 0); x.lineTo(16, 16); x.moveTo(16, 0); x.lineTo(0, 16); x.stroke();
});
TILE.table   = makeTile('d', 'T', 0.1, x => { x.fillStyle = COL.T; x.fillRect(2, 2, 12, 12); });
TILE.bed     = makeTile('w', 'l', 0.03, x => { x.fillStyle = COL.b; x.fillRect(0, 8, 16, 8); x.fillStyle = COL.l; x.fillRect(2, 2, 12, 4); });
TILE.fence   = makeTile('t', 'T', 0.08, x => {
  x.fillStyle = COL.a;
  x.fillRect(0, 6, 16, 2); x.fillRect(2, 0, 2, 16); x.fillRect(7, 0, 2, 16); x.fillRect(12, 0, 2, 16);
});
TILE.grass   = makeTile('G', 'g', 0.15);
TILE.dirt    = makeTile('T', 'd', 0.1);
TILE.pool    = makeTile('c', 'C', 0.15, x => { x.strokeStyle = COL.C; x.strokeRect(2.5, 4.5, 11, 1); x.strokeRect(4.5, 10.5, 9, 1); });
TILE.hospfloor = makeTile('w', 'l', 0.02, x => { x.strokeStyle = COL.l; x.strokeRect(0.5, 0.5, 16, 16); });
TILE.hospwall  = makeTile('l', 'a', 0.05, x => { x.fillStyle = COL.c; x.fillRect(0, 5, 16, 2); });
TILE.shelf   = makeTile('d', 'k', 0.03, x => {
  x.fillStyle = COL.k; x.fillRect(0, 5, 16, 1); x.fillRect(0, 11, 16, 1);
  x.fillStyle = COL.r; x.fillRect(2, 2, 3, 3); x.fillRect(9, 8, 3, 3);
  x.fillStyle = COL.c; x.fillRect(7, 2, 3, 3); x.fillRect(3, 13, 3, 2);
  x.fillStyle = COL.g; x.fillRect(12, 2, 3, 3); x.fillRect(12, 13, 3, 2);
});
TILE.scrap   = makeTile('a', 'd', 0.3, x => {
  x.fillStyle = COL.e; x.fillRect(2, 3, 6, 4); x.fillRect(9, 9, 5, 4);
  x.fillStyle = COL.o; x.fillRect(3, 4, 2, 2); x.fillRect(10, 10, 2, 2);
});
TILE.board   = makeTile('G', null, 0, x => {
  x.strokeStyle = COL.d; x.strokeRect(0.5, 0.5, 15, 15);
  x.fillStyle = COL.w; x.fillRect(3, 4, 6, 1); x.fillRect(3, 7, 9, 1); x.fillRect(3, 10, 5, 1);
});
TILE.tent    = makeTile('Y', null, 0, x => {
  x.fillStyle = COL.v; x.fillRect(0, 0, 4, 16); x.fillRect(8, 0, 4, 16);
  x.fillStyle = COL.k; x.fillRect(0, 0, 16, 1);
});
TILE.exit    = makeTile('k', null, 0, x => {
  x.fillStyle = COL.Y; x.fillRect(2, 2, 12, 12);
  x.fillStyle = COL.k; x.fillRect(4, 4, 8, 8);
  x.fillStyle = COL.Y; x.fillRect(6, 6, 4, 4);
});

// ============================================================
// 3x5 bitmap font. Each glyph = 15-char string of 0/1, 5 rows x 3 cols.
// ============================================================
const FONT = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011',
  D: '110101101101110', E: '111100110100111', F: '111100110100100',
  G: '011100101101011', H: '101101111101101', I: '111010010010111',
  J: '001001001101010', K: '101101110101101', L: '100100100100111',
  M: '101111111101101', N: '110101101101101', O: '010101101101010',
  P: '110101110100100', Q: '010101101110011', R: '110101110101101',
  S: '011100010001110', T: '111010010010010', U: '101101101101111',
  V: '101101101101010', W: '101101111111101', X: '101101010101101',
  Y: '101101010010010', Z: '111001010100111',
  '0': '111101101101111', '1': '010110010010111', '2': '111001111100111',
  '3': '111001111001111', '4': '101101111001001', '5': '111100111001111',
  '6': '111100111101111', '7': '111001010010010', '8': '111101111101111',
  '9': '111101111001111',
  '$': '011110010011110', '.': '000000000000010', ',': '000000000010100',
  '!': '010010010000010', '?': '110001010000010', ':': '000010000010000',
  '-': '000000111000000', "'": '010010000000000', '/': '001001010100100',
  '>': '100010001010100', '%': '101001010100101', '(': '010100100100010',
  ')': '010001001001010', '+': '000010111010000', '"': '101101000000000',
  ' ': '000000000000000',
};

// Draw text on ctx at x,y. scale = pixel size, color = palette char or css.
function drawText(x2d, str, x, y, color, scale) {
  scale = scale || 1;
  x2d.fillStyle = COL[color] || color || COL.w;
  str = String(str).toUpperCase();
  let cx = x;
  for (const ch of str) {
    const g = FONT[ch];
    if (g) {
      for (let j = 0; j < 5; j++)
        for (let i = 0; i < 3; i++)
          if (g[j * 3 + i] === '1') x2d.fillRect(cx + i * scale, y + j * scale, scale, scale);
    }
    cx += 4 * scale;
  }
  return cx;
}
function textWidth(str, scale) { return String(str).length * 4 * (scale || 1) - (scale || 1); }
function drawTextC(x2d, str, cx, y, color, scale) {
  drawText(x2d, str, Math.floor(cx - textWidth(str, scale) / 2), y, color, scale);
}
