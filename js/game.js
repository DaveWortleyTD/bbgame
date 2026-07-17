// ============================================================
// game.js — engine: loop, input, entities, AI, collision, HUD
// ============================================================

'use strict';

const TS = 16;                     // tile size
const SW = 320, SH = 240;          // screen (4:3)
const HUD_H = 16;
const VW = SW, VH = SH - HUD_H;    // world viewport (below HUD)

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// ---------------- Input ----------------
const keysDown = new Set();
const keysHit = new Set();     // pressed this frame
const KEYMAP = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  Space: 'fire', KeyZ: 'fire', KeyE: 'act', KeyX: 'act', KeyC: 'bomb',
  Enter: 'start', KeyM: 'mute', Digit0: 'skip', KeyR: 'restart', KeyT: 'char',
};
window.addEventListener('keydown', ev => {
  const k = KEYMAP[ev.code];
  if (!k) return;
  ev.preventDefault();
  AUDIO.ensure(); AUDIO.startMusic();
  if (!keysDown.has(k)) keysHit.add(k);
  keysDown.add(k);
});
window.addEventListener('keyup', ev => {
  const k = KEYMAP[ev.code];
  if (k) keysDown.delete(k);
});
const held = k => keysDown.has(k);
const hit = k => keysHit.has(k);

// ---------------- Game state ----------------
const G = {
  state: 'title',
  levelIndex: 0,
  level: null,
  campaign: 0,          // next story mission (index into LEVELS)
  inWorld: false,
  worldPos: null,       // where to respawn in the overworld
  worldIntroSeen: false,
  worldFlags: {},       // persistent one-time overworld events
  money: 0,
  moneyAtStart: 0,
  lives: 3,
  hp: 6, maxHp: 6,
  player: null,
  grid: [], mapW: 0, mapH: 0,
  enemies: [], bullets: [], pickups: [], effects: [], inter: [],
  exit: null,
  cam: { x: 0, y: 0 },
  timeLeft: null,
  vars: {},
  msg: null, msgT: 0,
  stateT: 0,
  shake: 0,
  playerChar: 'walt',   // walt | jesse | hank
  sideDef: null,        // active repeatable side mission (levelIndex === -1)
  cutLines: null, cutThen: null,
};

function say(text, t) { G.msg = text; G.msgT = t || 2; }

const CHAR_SPRITE = { walt: 'walt', jesse: 'jesse', hank: 'hankNpc', undies: 'waltUndies' };
function setPlayerChar(c) { G.playerChar = c; }

// black-screen story card; `then` runs when the player presses Enter
function cut(lines, then) {
  G.cutLines = lines;
  G.cutThen = then;
  G.state = 'cut';
  G.stateT = 0;
}

// ---------------- Entity factories ----------------
const ETYPES = {
  snake:  { ai: 'chase', spd: 20, hp: 1, dmg: 1, sprite: 'snake', w: 14, h: 7, aggro: 46, score: 25 },
  jeep:   { ai: 'chase', spd: 44, hp: 4, dmg: 1, sprite: 'jeep', w: 13, h: 13, aggro: 999, score: 50 },
  goon:   { ai: 'shooter', spd: 18, hp: 2, dmg: 1, sprite: 'goon', w: 10, h: 13, range: 80, aggro: 105, fireCd: 2.1, score: 50 },
  nazi:   { ai: 'shooter', spd: 21, hp: 2, dmg: 1, sprite: 'nazi', w: 10, h: 13, range: 90, aggro: 130, fireCd: 1.8, score: 75 },
  rival:  { ai: 'shooter', spd: 24, hp: 2, dmg: 1, sprite: 'dealer', w: 10, h: 13, range: 80, aggro: 999, fireCd: 1.8, score: 50 },
  tuco:   { ai: 'shooter', spd: 28, hp: 8, dmg: 1, sprite: 'tuco', w: 10, h: 13, range: 100, aggro: 999, fireCd: 1.1, score: 500, boss: 'TUCO' },
  cousin: { ai: 'shooter', spd: 30, hp: 6, dmg: 1, sprite: 'cousin', w: 10, h: 13, range: 95, aggro: 999, fireCd: 1.5, score: 400, boss: 'THE COUSINS' },
  jack:   { ai: 'shooter', spd: 26, hp: 7, dmg: 1, sprite: 'nazi', w: 10, h: 13, range: 100, aggro: 999, fireCd: 1.2, score: 500, boss: 'UNCLE JACK' },
  cop:    { ai: 'cone', spd: 20, hp: 3, dmg: 1, sprite: 'cop', w: 10, h: 13, vision: 50, gun: true, score: 0 },
  victor: { ai: 'cone', spd: 30, hp: 6, dmg: 1, sprite: 'victor', w: 10, h: 13, vision: 54, gun: false, score: 0 },
  guard:  { ai: 'cone', spd: 24, hp: 3, dmg: 1, sprite: 'guard', w: 10, h: 13, vision: 54, gun: true, score: 75 },
  camera: { ai: 'camera', spd: 0, hp: 999, dmg: 0, sprite: 'camera', w: 8, h: 8, vision: 60 },
  krazy8: { ai: 'shooter', spd: 26, hp: 5, dmg: 1, sprite: 'krazy8', w: 10, h: 13, range: 90, aggro: 999, fireCd: 1.4, score: 300, boss: 'KRAZY-8' },
  henchman: { ai: 'chase', spd: 34, hp: 4, dmg: 1, sprite: 'goon', w: 10, h: 13, aggro: 999, score: 0 },
  cartel: { ai: 'shooter', spd: 26, hp: 3, dmg: 1, sprite: 'dealer', w: 10, h: 13, range: 90, aggro: 999, fireCd: 1.6, score: 100 },
  kid:    { ai: 'wanderer', spd: 16, hp: 999, dmg: 0, sprite: 'kid1', w: 9, h: 12 },
  sponger:{ ai: 'shooter', spd: 0, hp: 999, dmg: 1, sprite: 'kid2', w: 9, h: 12, range: 110, aggro: 130, fireCd: 2.4, sponge: true },
  trafficL: { ai: 'lane', spd: 65, hp: 999, dmg: 1, sprite: 'jeep', w: 13, h: 13, dir: -1 },
  trafficR: { ai: 'lane', spd: 55, hp: 999, dmg: 1, sprite: 'jeep', w: 13, h: 13, dir: 1 },
};
// enemies that cannot be shot or bombed
const NO_HIT = new Set(['camera', 'lane', 'follow', 'wanderer']);

function makeAlly(sprite, x, y) {
  const e = makeEnemy('henchman', x, y);   // base stats, then override
  Object.assign(e, { type: 'ally', ai: 'follow', sprite, hp: 999, maxHp: 999, dmg: 0, spd: 56, gun: true, boss: undefined, score: 0 });
  return e;
}

function makeEnemy(type, x, y) {
  const t = ETYPES[type];
  const e = Object.assign({
    type, x, y, dx: 0, dy: 0, fx: 1, fy: 0,
    cool: Math.random() * 1.5 + 0.5, wanderT: 0,
    alerted: 0, flash: 0, dead: false, angle: 0,
  }, t);
  e.maxHp = e.hp;
  return e;
}

function makePickup(kind, x, y, extra) {
  return Object.assign({ kind, x, y, taken: false, bob: Math.random() * 6 }, extra || {});
}

// ---------------- Level parsing ----------------
function startLevel(idx, keepMoney) {
  G.inWorld = false;
  G.levelIndex = idx;
  G.sideDef = null;
  if (!keepMoney) G.moneyAtStart = G.money;
  G.money = G.moneyAtStart;
  G.hp = G.maxHp;
  G.playerChar = LEVELS[idx].playAs || 'walt';
  loadDef(LEVELS[idx]);
  G.state = 'intro';
  G.stateT = 0;
}

// repeatable side mission (not part of campaign progression)
function startSide(def, keepMoney) {
  G.inWorld = false;
  G.levelIndex = -1;
  G.sideDef = def;
  if (!keepMoney) G.moneyAtStart = G.money;
  G.money = G.moneyAtStart;
  G.hp = G.maxHp;
  G.playerChar = def.playAs || G.playerChar;
  loadDef(def);
  G.state = 'intro';
  G.stateT = 0;
}

function startWorld() {
  G.inWorld = true;
  G.moneyAtStart = G.money;   // overworld is safe ground: bank progress
  G.hp = G.maxHp;
  loadDef(WORLD);
  if (G.worldPos) { G.player.x = G.worldPos.x; G.player.y = G.worldPos.y; }
  G.state = G.worldIntroSeen ? 'play' : 'intro';
  G.worldIntroSeen = true;
  G.stateT = 0;
}

function loadDef(L) {
  G.level = L;
  G.enemies = []; G.bullets = []; G.pickups = []; G.effects = []; G.inter = [];
  G.exit = null;
  G.vars = { exited: false, kills: 0 };
  G.timeLeft = L.time || null;
  G.msg = null;
  G.shake = 0;

  const map = L.map;
  G.mapH = map.length;
  G.mapW = map[0].length;
  G.grid = [];
  let px = 32, py = 32;

  for (let j = 0; j < G.mapH; j++) {
    const row = [];
    for (let i = 0; i < G.mapW; i++) {
      const ch = map[j][i];
      let tileName = L.tiles[ch];
      const spec = L.things && L.things[ch];
      if (spec || ch === 'P' || ch === 'X') {
        tileName = L.tiles['.'];
        const cx = i * TS + 8, cy = j * TS + 8;
        if (ch === 'P') { px = cx; py = cy; }
        else if (ch === 'X') { G.exit = { x: cx, y: cy, active: !!L.exitOpen }; }
        else if (spec.e) G.enemies.push(makeEnemy(spec.e, cx, cy));
        else if (spec.a) G.enemies.push(makeAlly(spec.a, cx, cy));
        else if (spec.p) G.pickups.push(makePickup(spec.p, cx, cy, spec.extra));
        else if (spec.i) G.inter.push(Object.assign({ x: cx, y: cy, used: false }, spec.i));
        if (spec && spec.tile) tileName = spec.tile;
      }
      if (!tileName) tileName = L.tiles['.'];
      row.push(tileName);
    }
    G.grid.push(row);
  }

  G.player = {
    x: px, y: py, w: L.drive ? 13 : 9, h: L.drive ? 13 : 12,
    fx: 0, fy: -1, flip: false, rvDir: 'right',
    vx: 0, vy: 0,           // drive physics
    invuln: 0, fireCool: 0,
    gun: !!L.gun, bombs: L.bombs || 0,
  };
  if (L.start) L.start(G);
}

// ---------------- Tile collision ----------------
const SOLID = new Set(['rock', 'cactus', 'brick', 'labwall', 'tank', 'wallhome',
  'train', 'car', 'crate', 'table', 'bed', 'fence', 'pool', 'tent',
  'shelf', 'scrap', 'board', 'hospwall']);

function tileAt(px, py) {
  const i = Math.floor(px / TS), j = Math.floor(py / TS);
  if (i < 0 || j < 0 || i >= G.mapW || j >= G.mapH) return 'rock';
  return G.grid[j][i];
}
function solidAt(px, py) { return SOLID.has(tileAt(px, py)); }

function boxFree(x, y, w, h) {
  const hw = w / 2, hh = h / 2;
  return !solidAt(x - hw, y - hh) && !solidAt(x + hw, y - hh) &&
         !solidAt(x - hw, y + hh) && !solidAt(x + hw, y + hh);
}

// axis-separated move; returns true if blocked
function moveBox(o, dx, dy) {
  let blocked = false;
  if (dx) {
    if (boxFree(o.x + dx, o.y, o.w, o.h)) o.x += dx; else blocked = true;
  }
  if (dy) {
    if (boxFree(o.x, o.y + dy, o.w, o.h)) o.y += dy; else blocked = true;
  }
  return blocked;
}

function los(x1, y1, x2, y2) {
  const d = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.ceil(d / 4);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (solidAt(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t)) return false;
  }
  return true;
}

// ---------------- Combat ----------------
function fireBullet(x, y, dx, dy, team, dmg, opts) {
  opts = opts || {};
  const s = opts.spd || (team === 'player' ? 150 : 68);
  const m = Math.hypot(dx, dy) || 1;
  G.bullets.push({ x, y, dx: dx / m * s, dy: dy / m * s, team, dmg: dmg || 1,
    life: opts.life || 1.6, sponge: !!opts.sponge });
  if (team === 'player') AUDIO.sfx.shoot(); else AUDIO.sfx.enemyShoot();
}

function boom(x, y, r, dmg) {
  G.effects.push({ kind: 'boom', x, y, t: 0, r });
  AUDIO.sfx.explosion();
  G.shake = 0.35;
  for (const e of G.enemies) {
    if (!e.dead && !NO_HIT.has(e.ai) && Math.hypot(e.x - x, e.y - y) < r) hurtEnemy(e, dmg);
  }
}

function hurtEnemy(e, dmg) {
  if (e.dead || NO_HIT.has(e.ai)) return;
  e.hp -= dmg;
  e.flash = 0.15;
  e.alerted = 6;
  AUDIO.sfx.hit();
  if (e.hp <= 0) {
    e.dead = true;
    G.vars.kills++;
    if (e.score) { G.money += e.score; floatText(e.x, e.y, '$' + e.score); }
    if (Math.random() < 0.2) G.pickups.push(makePickup('heart', e.x, e.y));
    G.effects.push({ kind: 'poof', x: e.x, y: e.y, t: 0 });
    AUDIO.sfx.die();
  }
}

function hurtPlayer(dmg, fromX, fromY) {
  const p = G.player;
  if (p.invuln > 0 || G.state !== 'play') return;
  G.hp -= dmg;
  p.invuln = 1.6;
  AUDIO.sfx.hurt();
  G.shake = 0.25;
  if (fromX !== undefined) {
    const m = Math.hypot(p.x - fromX, p.y - fromY) || 1;
    moveBox(p, (p.x - fromX) / m * 8, (p.y - fromY) / m * 8);
  }
  if (G.hp <= 0) killPlayer();
}

function killPlayer(reason) {
  if (G.level && G.level.onDefeat && !G.vars.defeated) {
    G.vars.defeated = true;
    G.hp = G.maxHp;
    G.level.onDefeat(G);
    return;
  }
  G.lives--;
  G.vars.deathReason = reason || null;
  AUDIO.sfx.gameover();
  G.state = G.lives < 0 ? 'gameover' : 'dead';
  G.stateT = 0;
}

function floatText(x, y, text) {
  G.effects.push({ kind: 'text', x, y, t: 0, text });
}

function completeLevel() {
  AUDIO.sfx.jingle();
  G.state = 'clear';
  G.stateT = 0;
}

// ---------------- Enemy AI ----------------
function wander(e, dt) {
  e.wanderT -= dt;
  if (e.wanderT <= 0) {
    e.wanderT = 0.8 + Math.random() * 1.5;
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [0, 0]];
    const d = dirs[Math.floor(Math.random() * dirs.length)];
    e.dx = d[0]; e.dy = d[1];
  }
  if (e.dx || e.dy) {
    if (moveBox(e, e.dx * e.spd * 0.5 * dt, e.dy * e.spd * 0.5 * dt)) e.wanderT = 0;
    if (e.dx) { e.fx = e.dx; e.fy = 0; }
    else if (e.dy) { e.fx = 0; e.fy = e.dy; }
  }
}

function seek(e, dt, spd) {
  const p = G.player;
  const dx = p.x - e.x, dy = p.y - e.y;
  const m = Math.hypot(dx, dy) || 1;
  e.fx = Math.abs(dx) > Math.abs(dy) ? Math.sign(dx) : 0;
  e.fy = e.fx ? 0 : Math.sign(dy);
  // move on both axes so walls don't fully stop pursuit
  if (!boxFree(e.x + dx / m * spd * dt, e.y, e.w, e.h)) {
    moveBox(e, 0, Math.sign(dy) * spd * dt);
  } else e.x += dx / m * spd * dt;
  if (!boxFree(e.x, e.y + dy / m * spd * dt, e.w, e.h)) {
    moveBox(e, Math.sign(dx) * spd * dt, 0);
  } else e.y += dy / m * spd * dt;
}

function tryShoot(e, dt) {
  const p = G.player;
  e.cool -= dt;
  if (e.cool <= 0) {
    e.cool = e.fireCd * (0.8 + Math.random() * 0.4);
    // imperfect aim: enemies lead a little off-target
    const miss = 14;
    fireBullet(e.x, e.y,
      p.x - e.x + (Math.random() - 0.5) * miss,
      p.y - e.y + (Math.random() - 0.5) * miss, 'enemy', e.dmg,
      e.sponge ? { spd: 45, sponge: true, life: 2.2 } : null);
  }
}

function inCone(e) {
  const p = G.player;
  const dx = p.x - e.x, dy = p.y - e.y;
  const d = Math.hypot(dx, dy);
  if (d > e.vision) return false;
  const dot = (dx * e.fx + dy * e.fy) / (d || 1);
  if (dot < 0.45) return false;
  return los(e.x, e.y, p.x, p.y);
}

function updateEnemy(e, dt) {
  const p = G.player;
  e.flash = Math.max(0, e.flash - dt);
  const dist = Math.hypot(p.x - e.x, p.y - e.y);

  if (e.ai === 'camera') {
    // slowly rotating cone
    e.angle += dt * 0.9;
    e.fx = Math.cos(e.angle); e.fy = Math.sin(e.angle);
    if (inCone(e)) { triggerAlarm(); }
    return;
  }

  if (e.ai === 'wanderer') { wander(e, dt); return; }

  if (e.ai === 'lane') {
    e.x += e.dir * e.spd * dt;
    e.fx = e.dir; e.fy = 0;
    if (e.x < -20) e.x = G.mapW * TS + 20;
    if (e.x > G.mapW * TS + 20) e.x = -20;
    if (Math.abs(e.x - p.x) < (e.w + p.w) / 2 + 2 && Math.abs(e.y - p.y) < (e.h + p.h) / 2 + 2) {
      hurtPlayer(e.dmg, e.x, e.y);
    }
    return;
  }

  if (e.ai === 'follow') {
    if (dist > 26) seek(e, dt, e.spd);
    // ally covering fire at the nearest live hostile
    if (e.gun) {
      e.cool -= dt;
      if (e.cool <= 0) {
        let best = null, bd = 110;
        for (const o of G.enemies) {
          if (o.dead || o === e || NO_HIT.has(o.ai)) continue;
          const d = Math.hypot(o.x - e.x, o.y - e.y);
          if (d < bd && los(e.x, e.y, o.x, o.y)) { bd = d; best = o; }
        }
        if (best) { e.cool = 1.3; fireBullet(e.x, e.y, best.x - e.x, best.y - e.y, 'player', 1); }
      }
    }
    return;
  }

  if (e.ai === 'chase') {
    if (dist < e.aggro) seek(e, dt, e.spd); else wander(e, dt);
    if (dist < (e.w + p.w) / 2 + 2) hurtPlayer(e.dmg, e.x, e.y);
    return;
  }

  if (e.ai === 'shooter') {
    if (dist < e.aggro && los(e.x, e.y, p.x, p.y)) {
      e.alerted = 5;
    }
    if (e.alerted > 0) {
      e.alerted -= dt;
      if (dist > e.range * 0.8) seek(e, dt, e.spd);
      else if (dist < e.range * 0.4) seek(e, dt, -e.spd * 0.6); // back off
      if (dist < e.range && los(e.x, e.y, p.x, p.y)) tryShoot(e, dt);
    } else wander(e, dt);
    if (dist < (e.w + p.w) / 2 + 2) hurtPlayer(e.dmg, e.x, e.y);
    return;
  }

  if (e.ai === 'cone') {
    if (G.vars.alarm > 0) e.alerted = Math.max(e.alerted, 3);
    if (inCone(e)) {
      if (e.alerted <= 0) AUDIO.sfx.alarm();
      e.alerted = 4;
    }
    if (e.alerted > 0) {
      e.alerted -= dt;
      seek(e, dt, e.spd * 1.15);
      if (e.gun && dist < 90 && los(e.x, e.y, p.x, p.y)) tryShoot(e, dt);
    } else {
      wander(e, dt);
    }
    if (dist < (e.w + p.w) / 2 + 2) hurtPlayer(e.dmg, e.x, e.y);
  }
}

function triggerAlarm() {
  if (!G.vars.alarm || G.vars.alarm <= 0) { AUDIO.sfx.alarm(); say('SPOTTED!', 1.2); }
  G.vars.alarm = 4;
}

// ---------------- Player update ----------------
function updatePlayer(dt) {
  const p = G.player;
  const L = G.level;
  p.invuln = Math.max(0, p.invuln - dt);
  p.fireCool = Math.max(0, p.fireCool - dt);

  let ix = (held('right') ? 1 : 0) - (held('left') ? 1 : 0);
  let iy = (held('down') ? 1 : 0) - (held('up') ? 1 : 0);

  if (L.drive) {
    // momentum driving
    const ACC = 220, FRI = 1.8, MAX = 110;
    p.vx += ix * ACC * dt; p.vy += iy * ACC * dt;
    p.vx -= p.vx * FRI * dt; p.vy -= p.vy * FRI * dt;
    const sp = Math.hypot(p.vx, p.vy);
    if (sp > MAX) { p.vx *= MAX / sp; p.vy *= MAX / sp; }
    const bx = !boxFree(p.x + p.vx * dt, p.y, p.w, p.h);
    const by = !boxFree(p.x, p.y + p.vy * dt, p.w, p.h);
    if (bx) { if (Math.abs(p.vx) > 95) { hurtPlayer(1); } p.vx *= -0.4; }
    if (by) { if (Math.abs(p.vy) > 95) { hurtPlayer(1); } p.vy *= -0.4; }
    moveBox(p, p.vx * dt, p.vy * dt);
    // face the direction of travel
    if (Math.hypot(p.vx, p.vy) > 12) {
      p.rvDir = Math.abs(p.vx) >= Math.abs(p.vy)
        ? (p.vx > 0 ? 'right' : 'left')
        : (p.vy > 0 ? 'down' : 'up');
    }
  } else {
    if (ix && iy) { ix *= 0.7071; iy *= 0.7071; }
    const spd = 62;
    moveBox(p, ix * spd * dt, iy * spd * dt);
    if (ix || iy) {
      if (Math.abs(ix) >= Math.abs(iy)) { p.fx = Math.sign(ix); p.fy = 0; }
      else { p.fx = 0; p.fy = Math.sign(iy); }
      if (ix) p.flip = ix < 0;
    }
  }

  // shooting
  if (p.gun && held('fire') && p.fireCool <= 0) {
    p.fireCool = 0.22;
    fireBullet(p.x, p.y - 2, p.fx, p.fy, 'player', 1);
  }
  // bomb (fulminated mercury)
  if (p.bombs > 0 && hit('bomb')) {
    p.bombs--;
    boom(p.x + p.fx * 24, p.y + p.fy * 24, 55, 6);
    say(p.bombs + ' MERCURY LEFT', 1.2);
  }

  // pickups
  for (const pk of G.pickups) {
    if (pk.taken) continue;
    if (Math.hypot(pk.x - p.x, pk.y - p.y) < 12) {
      pk.taken = true;
      applyPickup(pk);
    }
  }

  // exit
  if (G.exit && G.exit.active && Math.hypot(G.exit.x - p.x, G.exit.y - p.y) < 14) {
    G.vars.exited = true;
  }
}

function applyPickup(pk) {
  switch (pk.kind) {
    case 'cash': G.money += 50; floatText(pk.x, pk.y, '$50'); AUDIO.sfx.cash(); break;
    case 'heart': G.hp = Math.min(G.maxHp, G.hp + 1); AUDIO.sfx.pickup(); break;
    case 'chicken': G.hp = G.maxHp; floatText(pk.x, pk.y, 'LOS POLLOS!'); AUDIO.sfx.pickup(); break;
    case 'crystal': G.vars.crystals = (G.vars.crystals || 0) + 1; AUDIO.sfx.crystal(); break;
    case 'flask': G.vars.flasks = (G.vars.flasks || 0) + 1; AUDIO.sfx.crystal(); break;
    case 'bomb': G.player.bombs++; AUDIO.sfx.pickup(); say('FULMINATED MERCURY! PRESS C', 2); break;
    default:
      if (G.level.onPickup) G.level.onPickup(G, pk);
      else AUDIO.sfx.pickup();
  }
}

// nearest usable interactable within reach
function nearInteract() {
  const p = G.player;
  let best = null, bd = 22;
  for (const it of G.inter) {
    if (it.used || it.hidden) continue;
    const d = Math.hypot(it.x - p.x, it.y - p.y);
    if (d < bd) { bd = d; best = it; }
  }
  return best;
}

// ---------------- Bullets, effects ----------------
function updateBullets(dt) {
  const p = G.player;
  for (const b of G.bullets) {
    b.life -= dt;
    b.x += b.dx * dt; b.y += b.dy * dt;
    if (b.life <= 0) { b.dead = true; continue; }
    if (solidAt(b.x, b.y)) { b.dead = true; G.effects.push({ kind: 'spark', x: b.x, y: b.y, t: 0 }); continue; }
    if (b.team === 'player') {
      for (const e of G.enemies) {
        if (e.dead || NO_HIT.has(e.ai)) continue;
        if (Math.abs(e.x - b.x) < e.w / 2 + 2 && Math.abs(e.y - b.y) < e.h / 2 + 2) {
          b.dead = true; hurtEnemy(e, b.dmg); break;
        }
      }
    } else {
      if (Math.abs(p.x - b.x) < p.w / 2 + 2 && Math.abs(p.y - b.y) < p.h / 2 + 2) {
        b.dead = true; hurtPlayer(b.dmg, b.x, b.y);
      }
    }
  }
  G.bullets = G.bullets.filter(b => !b.dead);
}

function updateEffects(dt) {
  for (const f of G.effects) f.t += dt;
  G.effects = G.effects.filter(f => f.t < (f.kind === 'text' ? 1 : f.kind === 'boom' ? 0.5 : 0.25));
}

// ---------------- Main update ----------------
let last = 0;
function frame(ts) {
  const dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
  last = ts;
  update(dt);
  render(dt);
  keysHit.clear();
  requestAnimationFrame(frame);
}

function update(dt) {
  G.stateT += dt;
  G.msgT = Math.max(0, G.msgT - dt);
  G.shake = Math.max(0, G.shake - dt);
  if (G.vars.alarm) G.vars.alarm = Math.max(0, G.vars.alarm - dt);

  switch (G.state) {
    case 'title':
      if (hit('start')) {
        G.money = 0; G.lives = 3; G.campaign = 0; G.playerChar = 'walt';
        G.worldPos = null; G.worldIntroSeen = false; G.worldFlags = {};
        startWorld();
      }
      break;
    case 'intro':
      if (hit('start') && G.stateT > 0.4) { G.state = 'play'; G.stateT = 0; }
      break;
    case 'play': playUpdate(dt); break;
    case 'cut':
      if (hit('start') && G.stateT > 0.6) {
        const then = G.cutThen;
        G.cutLines = null; G.cutThen = null;
        if (then) then(G);
        if (G.state === 'cut') G.state = 'play';
      }
      break;
    case 'clear':
      if (G.stateT > 2.2) {
        const L = G.level;
        if (G.levelIndex === LEVELS.length - 1) { G.state = 'victory'; G.stateT = 0; AUDIO.sfx.victory(); break; }
        if (G.levelIndex >= 0) G.campaign = Math.max(G.campaign, G.levelIndex + 1);
        if (L.onClear) L.onClear(G);
        startWorld();
      }
      break;
    case 'dead':
      if (G.stateT > 2) startLevel(G.levelIndex, true);
      break;
    case 'gameover':
      if (hit('start') || hit('restart')) { G.state = 'title'; G.stateT = 0; }
      break;
    case 'victory':
      if (hit('start') && G.stateT > 2) { G.state = 'title'; G.stateT = 0; }
      break;
  }
  if (hit('mute')) AUDIO.toggleMute();
}

function playUpdate(dt) {
  if (hit('skip') && !G.inWorld) { completeLevel(); return; }  // dev: skip level

  // switch Walt <-> Jesse in the overworld (once Jesse is met)
  if (G.inWorld && hit('char')) {
    if (G.campaign >= 5) {
      setPlayerChar(G.playerChar === 'walt' ? 'jesse' : 'walt');
      say('NOW PLAYING: ' + G.playerChar.toUpperCase(), 1.5);
    } else say('YOU HAVE NOT MET JESSE YET', 1.5);
  }

  updatePlayer(dt);
  for (const e of G.enemies) if (!e.dead) updateEnemy(e, dt);
  updateBullets(dt);
  updateEffects(dt);

  // interact
  const it = nearInteract();
  G.vars.nearIt = it;
  if (it && hit('act') && !it.hold) {
    it.onUse && it.onUse(G, it);
  }
  if (it && it.hold && held('act')) {
    it.onHold && it.onHold(G, it, dt);
  }

  // timer
  if (G.timeLeft !== null) {
    G.timeLeft -= dt;
    if (G.timeLeft <= 0) { G.timeLeft = 0; killPlayer(G.level.timeoutText || 'OUT OF TIME'); return; }
  }

  const L = G.level;
  if (L.tick) L.tick(G, dt);
  if (G.state !== 'play') return;
  const done = L.isDone ? L.isDone(G) : G.vars.exited;
  if (done) {
    if (L.chain) {
      // mission continues on another map (possibly as another character)
      const nx = L.chain;
      cut(L.chainCut || ['MEANWHILE...'], () => {
        if (nx.playAs) G.playerChar = nx.playAs;
        loadDef(nx);
        G.state = 'play';
        G.stateT = 0;
      });
    } else completeLevel();
  }

  // camera follows player; maps smaller than the viewport get centered
  const p = G.player;
  G.cam.x = G.mapW * TS <= VW ? -(VW - G.mapW * TS) / 2
    : Math.max(0, Math.min(G.mapW * TS - VW, p.x - VW / 2));
  G.cam.y = G.mapH * TS <= VH ? -(VH - G.mapH * TS) / 2
    : Math.max(0, Math.min(G.mapH * TS - VH, p.y - VH / 2));
}

// helper for levels: count of living enemies of given types
function aliveCount(types) {
  return G.enemies.filter(e => !e.dead && (!types || types.indexOf(e.type) >= 0)).length;
}

// helper: spawn enemy at tile coords
function spawnAt(type, ti, tj) {
  G.enemies.push(makeEnemy(type, ti * TS + 8, tj * TS + 8));
}

// ---------------- Rendering ----------------
function render(dt) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, SW, SH);

  switch (G.state) {
    case 'title': renderTitle(); return;
    case 'intro': renderIntro(); return;
    case 'gameover': renderGameOver(); return;
    case 'victory': renderVictory(); return;
    case 'cut': renderCut(); return;
  }
  renderWorld();
  renderHUD();
  if (G.state === 'clear') renderBanner('LEVEL CLEAR!', 'g');
  if (G.state === 'dead') {
    renderBanner(G.vars.deathReason || 'YOU DIED', 'r');
    drawTextC(ctx, G.lives + ' LIVES LEFT', SW / 2, 140, 'w', 1);
  }
}

function renderWorld() {
  const sx = G.shake > 0 ? Math.round((Math.random() - 0.5) * 4) : 0;
  const sy = G.shake > 0 ? Math.round((Math.random() - 0.5) * 4) : 0;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, HUD_H, VW, VH);
  ctx.clip();
  ctx.translate(-Math.round(G.cam.x) + sx, HUD_H - Math.round(G.cam.y) + sy);

  // tiles
  const i0 = Math.floor(G.cam.x / TS), j0 = Math.floor(G.cam.y / TS);
  for (let j = j0; j <= j0 + VH / TS && j < G.mapH; j++) {
    for (let i = i0; i <= i0 + VW / TS && i < G.mapW; i++) {
      if (j < 0 || i < 0) continue;
      const t = TILE[G.grid[j][i]];
      if (t) ctx.drawImage(t, i * TS, j * TS);
    }
  }

  // exit
  if (G.exit) {
    ctx.drawImage(TILE.exit, G.exit.x - 8, G.exit.y - 8);
    if (G.exit.active && Math.floor(performance.now() / 250) % 2) {
      ctx.drawImage(SPR.arrow, G.exit.x - 4, G.exit.y - 18 + Math.sin(performance.now() / 150) * 2);
    }
  }

  // vision cones (under sprites)
  for (const e of G.enemies) {
    if (e.dead || (e.ai !== 'cone' && e.ai !== 'camera') || !e.vision) continue;
    ctx.save();
    ctx.globalAlpha = 0.13;
    ctx.fillStyle = e.alerted > 0 || (e.ai === 'camera' && G.vars.alarm > 0) ? COL.r : COL.Y;
    const px = e.fy * -0.6, py = e.fx * 0.6;
    ctx.beginPath();
    ctx.moveTo(e.x, e.y);
    ctx.lineTo(e.x + (e.fx + px) * e.vision, e.y + (e.fy + py) * e.vision);
    ctx.lineTo(e.x + (e.fx - px) * e.vision, e.y + (e.fy - py) * e.vision);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // interactables
  for (const it of G.inter) {
    if (it.hidden) continue;
    const s = SPR[it.sprite];
    if (s) {
      ctx.save();
      if (it.used) ctx.globalAlpha = 0.35;
      ctx.drawImage(s, Math.round(it.x - s.width / 2), Math.round(it.y - s.height / 2));
      ctx.restore();
    }
    // flashing marker over the door that starts the next mission
    if (it.door && it.door.indexOf(G.campaign) >= 0 && (!it.need || it.need(G)) &&
        Math.floor(performance.now() / 300) % 2) {
      ctx.drawImage(SPR.arrow, it.x - 4, it.y - 18 + Math.sin(performance.now() / 150) * 2);
    }
  }

  // overworld building labels
  if (G.level.labels) {
    for (const [tx, ty, t] of G.level.labels) {
      const lx = tx * TS + 8, ly = ty * TS - 10;
      const w = textWidth(t, 1) + 4;
      ctx.fillStyle = 'rgba(0,0,0,.6)';
      ctx.fillRect(lx - w / 2, ly - 1, w, 7);
      drawTextC(ctx, t, lx, ly, 'w', 1);
    }
  }

  // pickups (bobbing)
  for (const pk of G.pickups) {
    if (pk.taken) continue;
    const s = SPR[pk.sprite || pk.kind] || SPR.crystal;
    const bob = Math.sin(performance.now() / 220 + pk.bob) * 1.5;
    ctx.drawImage(s, Math.round(pk.x - s.width / 2), Math.round(pk.y - s.height / 2 + bob));
    if (pk.order !== undefined && G.vars.next === pk.order) {
      ctx.drawImage(SPR.arrow, pk.x - 4, pk.y - 16 + bob);
    }
  }

  // enemies
  for (const e of G.enemies) {
    if (e.dead) continue;
    let s = SPR[e.sprite];
    if (e.ai === 'lane') s = e.dir < 0 ? SPR.jeep_left : SPR.jeep_right;
    ctx.save();
    if (e.flash > 0) ctx.globalAlpha = 0.5;
    if (e.fx < 0 && e.ai !== 'camera' && e.ai !== 'lane') {
      ctx.translate(Math.round(e.x + s.width / 2), Math.round(e.y - s.height / 2));
      ctx.scale(-1, 1);
      ctx.drawImage(s, 0, 0);
    } else {
      ctx.drawImage(s, Math.round(e.x - s.width / 2), Math.round(e.y - s.height / 2));
    }
    ctx.restore();
    if (e.boss) {
      // boss hp pips above head
      const w = 16;
      ctx.fillStyle = COL.k; ctx.fillRect(e.x - w / 2 - 1, e.y - 14, w + 2, 4);
      ctx.fillStyle = COL.r; ctx.fillRect(e.x - w / 2, e.y - 13, w * e.hp / e.maxHp, 2);
    }
  }

  // player
  const p = G.player;
  if (!(p.invuln > 0 && Math.floor(performance.now() / 80) % 2)) {
    const s = G.level.drive
      ? SPR[(G.level.vehicle || 'rv') + '_' + p.rvDir]
      : SPR[CHAR_SPRITE[G.playerChar] || 'walt'];
    ctx.save();
    if (p.flip && !G.level.drive) {
      ctx.translate(Math.round(p.x + s.width / 2), Math.round(p.y - s.height / 2 - 1));
      ctx.scale(-1, 1);
      ctx.drawImage(s, 0, 0);
    } else {
      ctx.drawImage(s, Math.round(p.x - s.width / 2), Math.round(p.y - s.height / 2 - 1));
    }
    ctx.restore();
  }

  // bullets
  for (const b of G.bullets) {
    if (b.sponge) {
      ctx.drawImage(SPR.sponge, Math.round(b.x - 3), Math.round(b.y - 3));
    } else {
      ctx.fillStyle = b.team === 'player' ? COL.C : COL.o;
      ctx.fillRect(Math.round(b.x - 1), Math.round(b.y - 1), 3, 3);
    }
  }

  // effects
  for (const f of G.effects) {
    if (f.kind === 'boom') {
      const r = (f.r || 40) * Math.min(1, f.t / 0.4);
      ctx.strokeStyle = f.t % 0.1 < 0.05 ? COL.o : COL.Y;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, 7); ctx.stroke();
      ctx.strokeStyle = COL.r;
      ctx.beginPath(); ctx.arc(f.x, f.y, r * 0.6, 0, 7); ctx.stroke();
      ctx.lineWidth = 1;
    } else if (f.kind === 'poof') {
      ctx.fillStyle = COL.l;
      const r = 6 * (1 - f.t / 0.25);
      ctx.fillRect(f.x - r / 2, f.y - r / 2, r, r);
    } else if (f.kind === 'spark') {
      ctx.fillStyle = COL.Y;
      ctx.fillRect(f.x - 1, f.y - 1, 2, 2);
    } else if (f.kind === 'text') {
      drawTextC(ctx, f.text, f.x, f.y - 10 - f.t * 12, 'Y', 1);
    }
  }

  // interact prompt
  const near = G.vars.nearIt;
  if (near && G.state === 'play') {
    const lbl = near.label || 'E';
    const w = textWidth(lbl, 1) + 4;
    ctx.fillStyle = 'rgba(0,0,0,.7)';
    ctx.fillRect(near.x - w / 2, near.y - 18, w, 9);
    drawTextC(ctx, lbl, near.x, near.y - 16, 'w', 1);
  }

  ctx.restore();
}

function renderHUD() {
  ctx.fillStyle = COL.k;
  ctx.fillRect(0, 0, SW, HUD_H);
  ctx.fillStyle = COL.e;
  ctx.fillRect(0, HUD_H - 1, SW, 1);

  // hearts
  for (let i = 0; i < G.maxHp; i++) {
    ctx.save();
    if (i >= G.hp) ctx.globalAlpha = 0.25;
    ctx.drawImage(SPR.heart, 4 + i * 9, 4);
    ctx.restore();
  }
  // lives
  drawText(ctx, 'x' + Math.max(0, G.lives), 62, 6, 'l', 1);

  // money
  drawTextC(ctx, '$' + G.money, SW / 2, 6, G.money < 0 ? 'r' : 'g', 1);

  // right side: timer or level number
  if (G.timeLeft !== null) {
    const t = Math.ceil(G.timeLeft);
    drawText(ctx, 'TIME:' + t, SW - 58, 6, t < 10 ? 'r' : 'w', 1);
  } else {
    drawText(ctx, G.inWorld ? 'ABQ' : (G.levelIndex < 0 ? 'JOB' : 'LVL ' + (G.levelIndex + 1)), SW - 38, 6, 'l', 1);
  }

  // objective line (bottom)
  ctx.fillStyle = COL.k;
  ctx.fillRect(0, SH - 8, SW, 8);
  const obj = typeof G.level.objective === 'function' ? G.level.objective(G) : G.level.objective;
  drawTextC(ctx, obj, SW / 2, SH - 7, 'Y', 1);

  // transient message (dark backing so it reads on light floors)
  if (G.msgT > 0 && G.msg) {
    const w = textWidth(G.msg, 1) + 8;
    ctx.fillStyle = 'rgba(0,0,0,.7)';
    ctx.fillRect(SW / 2 - w / 2, 96, w, 11);
    drawTextC(ctx, G.msg, SW / 2, 99, 'w', 1);
  }
}

function renderCut() {
  ctx.fillStyle = COL.k; ctx.fillRect(0, 0, SW, SH);
  let y = Math.max(40, 110 - (G.cutLines ? G.cutLines.length * 7 : 0));
  for (const line of (G.cutLines || [])) { drawTextC(ctx, line, SW / 2, y, 'w', 1); y += 14; }
  if (Math.floor(performance.now() / 400) % 2 && G.stateT > 0.6) drawTextC(ctx, 'PRESS ENTER', SW / 2, 210, 'a', 1);
}

function renderBanner(text, color) {
  ctx.fillStyle = 'rgba(0,0,0,.6)';
  ctx.fillRect(0, 96, SW, 40);
  drawTextC(ctx, text, SW / 2, 112, color, 2);
}

// ---------------- Screens ----------------
function renderTitle() {
  // periodic-table style tiles
  const t = performance.now() / 1000;
  ctx.fillStyle = COL.k; ctx.fillRect(0, 0, SW, SH);

  // desert horizon
  ctx.fillStyle = '#1a0f24'; ctx.fillRect(0, 0, SW, 150);
  ctx.fillStyle = COL.T; ctx.fillRect(0, 150, SW, 90);
  ctx.fillStyle = COL.t; ctx.fillRect(0, 150, SW, 4);
  // stars
  ctx.fillStyle = COL.w;
  for (let i = 0; i < 30; i++) {
    const x = (i * 97) % SW, y = (i * 53) % 130;
    if ((i + Math.floor(t * 2)) % 7) ctx.fillRect(x, y, 1, 1);
  }
  // Br / Ba boxes
  function elemBox(x, y, sym, num) {
    ctx.fillStyle = COL.G; ctx.fillRect(x, y, 30, 30);
    ctx.strokeStyle = COL.g; ctx.strokeRect(x + 0.5, y + 0.5, 29, 29);
    drawText(ctx, num, x + 3, y + 3, 'g', 1);
    drawText(ctx, sym, x + 6, y + 12, 'w', 2);
  }
  elemBox(48, 40, 'BR', '35');
  elemBox(SW - 78, 40, 'BA', '56');
  drawTextC(ctx, 'BREAKING', SW / 2, 44, 'g', 2);
  drawTextC(ctx, 'BAD', SW / 2, 60, 'g', 2);
  drawTextC(ctx, 'THE 8-BIT GAME', SW / 2, 84, 'l', 1);

  // rv on the horizon
  ctx.drawImage(Math.cos(t / 2) > 0 ? SPR.rv_right : SPR.rv_left,
    SW / 2 - 8 + Math.sin(t / 2) * 90, 142);
  ctx.drawImage(SPR.walt, 70, 170);
  ctx.drawImage(SPR.crystal, 105, 180);
  ctx.drawImage(SPR.crystal, 215, 175);

  if (Math.floor(t * 2) % 2) drawTextC(ctx, 'PRESS ENTER', SW / 2, 205, 'w', 1);
  drawTextC(ctx, 'ARROWS/WASD MOVE  SPACE FIRE  E USE', SW / 2, 222, 'a', 1);
  drawTextC(ctx, 'C BOMB  M MUTE', SW / 2, 230, 'a', 1);
}

function renderIntro() {
  const L = G.level;
  ctx.fillStyle = COL.k; ctx.fillRect(0, 0, SW, SH);
  drawTextC(ctx, G.inWorld ? 'WELCOME TO' : (G.levelIndex < 0 ? 'SIDE JOB' : 'MISSION ' + (G.levelIndex + 1) + ' OF ' + LEVELS.length), SW / 2, 40, 'a', 1);
  drawTextC(ctx, L.name, SW / 2, 60, 'g', 2);
  if (L.epi) drawTextC(ctx, L.epi, SW / 2, 80, 'l', 1);
  let y = 110;
  for (const line of L.story) { drawTextC(ctx, line, SW / 2, y, 'w', 1); y += 12; }
  drawTextC(ctx, 'OBJECTIVE:', SW / 2, y + 14, 'a', 1);
  const obj = typeof L.objective === 'function' ? L.objective(G) : L.objective;
  drawTextC(ctx, obj, SW / 2, y + 26, 'Y', 1);
  if (Math.floor(performance.now() / 400) % 2) drawTextC(ctx, 'PRESS ENTER', SW / 2, 210, 'w', 1);
}

function renderGameOver() {
  ctx.fillStyle = COL.k; ctx.fillRect(0, 0, SW, SH);
  drawTextC(ctx, 'GAME OVER', SW / 2, 80, 'r', 3);
  drawTextC(ctx, 'YOU ARE NOT THE ONE WHO KNOCKS', SW / 2, 120, 'l', 1);
  drawTextC(ctx, 'FINAL SCORE: $' + G.money, SW / 2, 140, 'g', 1);
  if (Math.floor(performance.now() / 400) % 2) drawTextC(ctx, 'PRESS ENTER', SW / 2, 190, 'w', 1);
}

function renderVictory() {
  ctx.fillStyle = COL.k; ctx.fillRect(0, 0, SW, SH);
  const t = performance.now() / 1000;
  ctx.fillStyle = COL.c;
  for (let i = 0; i < 20; i++) {
    const x = (i * 89 + t * 30) % SW, y = (i * 61 + t * 40) % SH;
    ctx.drawImage(SPR.crystal, x, y);
  }
  ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(32, 60, SW - 64, 120);
  drawTextC(ctx, 'YOU WON', SW / 2, 75, 'g', 3);
  drawTextC(ctx, 'I DID IT FOR ME.', SW / 2, 105, 'w', 1);
  drawTextC(ctx, 'I LIKED IT.', SW / 2, 117, 'w', 1);
  drawTextC(ctx, 'I WAS GOOD AT IT.', SW / 2, 129, 'w', 1);
  drawTextC(ctx, 'FINAL SCORE: $' + G.money, SW / 2, 150, 'Y', 2);
  if (t % 1 > 0.5) drawTextC(ctx, 'PRESS ENTER', SW / 2, 200, 'w', 1);
}

// ---------------- boot ----------------
// dev: ?level=N jumps straight into level N
if (typeof location !== 'undefined') {
  const m = /[?&]level=(\d+)/.exec(location.search);
  if (m) {
    const n = Math.min(LEVELS.length, Math.max(1, +m[1]));
    G.campaign = n - 1;
    startLevel(n - 1);
    G.state = 'play';
  } else if (/[?&]world\b/.test(location.search)) {
    startWorld();
    G.state = 'play';
    const at = /[?&]at=(\d+),(\d+)/.exec(location.search);  // dev: tile coords
    if (at) { G.player.x = +at[1] * TS + 8; G.player.y = +at[2] * TS + 8; }
  }
}
requestAnimationFrame(frame);
