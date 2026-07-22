// ============================================================
// levels.js — 22-mission story campaign + side jobs + open world
//
// Map chars: 'P' player start, 'X' exit. Tiles come from def.tiles,
// entities/pickups/interactables from def.things:
//   {e:'type'} enemy  {a:'sprite'} ally  {p:'kind',extra:{}} pickup  {i:{...}} interactable
// Rows are auto-padded to equal width with the def's border char.
// Missions may `chain` to a follow-up map (with `chainCut` story card),
// use `playAs` (walt/jesse/hank/undies), and `onDefeat` for scripted losses.
// ============================================================

'use strict';

// ---- shared helpers ----
function orderedThing(order, sprite) {
  return { p: 'ingredient', extra: { sprite, order } };
}
function cookPickup(total, doneMsg) {
  return function (G, pk) {
    if (pk.kind !== 'ingredient') return;
    if (pk.order === G.vars.next) {
      G.vars.next++;
      AUDIO.sfx.crystal();
      floatText(pk.x, pk.y, 'STEP ' + G.vars.next);
      if (G.vars.next >= total) say(doneMsg, 2.5);
    } else {
      pk.taken = false;
      AUDIO.sfx.denied();
      say('WRONG ORDER!' + (G.timeLeft ? ' -5 SEC' : ''), 1.2);
      if (G.timeLeft) G.timeLeft = Math.max(1, G.timeLeft - 5);
      const p = G.player;
      const m = Math.hypot(p.x - pk.x, p.y - pk.y) || 1;
      moveBox(p, (p.x - pk.x) / m * 14, (p.y - pk.y) / m * 14);
    }
  };
}
function talkNpc(sprite, name, lines) {
  return { i: { sprite, label: 'E: ' + name,
    onUse(G, it) {
      it.visits = (it.visits || 0) + 1;
      say(lines[(it.visits - 1) % lines.length], 2.4);
      if (it.onTalk) it.onTalk(G, it);
    } } };
}

const LEVELS = [

// ============================================= 0: THE CLASSROOM
{
  name: 'THE CLASSROOM',
  epi: 'CHEMISTRY IS THE STUDY OF CHANGE',
  story: ['JUST ANOTHER DAY AT', 'J.P. WYNNE HIGH SCHOOL.', 'NOBODY IS LISTENING.', 'TEACH ANYWAY.'],
  playAs: 'walt',
  tiles: { '#': 'labwall', '.': 'walk', 'B': 'board', 'T': 'table' },
  things: {
    '1': { i: { sprite: 'kid1', label: 'E: STUDENT',
      onUse(G, it) { if (!it.used) { it.used = true; G.vars.talked = (G.vars.talked || 0) + 1; } say('STUDENT: IS THIS ON THE TEST?', 2); } } },
    '2': { i: { sprite: 'kid2', label: 'E: STUDENT',
      onUse(G, it) { if (!it.used) { it.used = true; G.vars.talked = (G.vars.talked || 0) + 1; } say('STUDENT: CAN I GO TO THE BATHROOM?', 2); } } },
    '3': { i: { sprite: 'kid3', label: 'E: STUDENT',
      onUse(G, it) { if (!it.used) { it.used = true; G.vars.talked = (G.vars.talked || 0) + 1; } say('STUDENT: CHEMISTRY IS BORING. NO OFFENSE.', 2); } } },
    'b': { i: { sprite: 'flask', label: 'E: TEACH',
      onUse(G, it) {
        if ((G.vars.talked || 0) < 3) { say('WAKE THE STUDENTS UP FIRST (TALK TO 3)', 2); return; }
        if (!it.used) { it.used = true; G.vars.taught = true; AUDIO.sfx.crystal(); say('CHEMISTRY IS THE STUDY OF TRANSFORMATION!', 2.5); }
      } } },
    'y': { i: { sprite: 'cash', label: 'E: PAYCHECK',
      onUse(G, it) {
        if (!G.vars.taught) { say('WORK BEFORE PAY', 1.5); return; }
        if (!it.used) { it.used = true; G.money += 40; G.vars.paid = true; AUDIO.sfx.cash(); floatText(it.x, it.y, '$40'); say('A WEEK OF WORK. FORTY BUCKS.', 2); }
      } } },
    'k': { e: 'kid' },
  },
  gun: false,
  objective: G => !G.vars.taught
    ? 'TALK TO 3 STUDENTS (' + (G.vars.talked || 0) + '/3) THEN TEACH'
    : (G.vars.paid ? 'LEAVE THE SCHOOL' : 'GRAB YOUR $40 PAYCHECK'),
  tick(G) { if (G.exit) G.exit.active = !!G.vars.paid; },
  map: [
    '########################',
    '#BBBBBBBB.XP.BBBBBBBB..#',
    '#......................#',
    '#......1...............#',
    '#......TT..TT..TT......#',
    '#......................#',
    '#..........2...........#',
    '#......TT..TT..TT......#',
    '#......................#',
    '#..............3.......#',
    '#......TT..TT..TT..y...#',
    '#......................#',
    '#...........b..........#',
    '########################',
  ],
},

// ============================================= 1: CAR WASH SHIFT
{
  name: 'CAR WASH SHIFT',
  epi: 'HAVE AN A1 DAY',
  story: ['SECOND JOB. BOGDAN WANTS', 'THE CARS HAND-WASHED.', 'THE KIDS THINK SPONGES', 'ARE PROJECTILES.'],
  playAs: 'walt',
  tiles: { '#': 'brick', '.': 'walk', 'A': 'car' },
  things: {
    'w': { i: { sprite: 'sponge', label: 'HOLD E: WASH', hold: true,
      onHold(G, it, dt) {
        it.prog = (it.prog || 0) + dt;
        AUDIO.sfx.siphon();
        if (it.prog >= 1.2 && !it.used) {
          it.used = true;
          G.money += 5; G.vars.washed = (G.vars.washed || 0) + 1;
          AUDIO.sfx.cash(); floatText(it.x, it.y, '+$5');
        }
      } } },
    's': { e: 'sponger' },
    'h': { p: 'heart' },
  },
  gun: false,
  objective: G => 'WASH THE CARS: ' + (G.vars.washed || 0) + '/6 (DODGE SPONGES!)',
  isDone() { return false; },
  tick(G) {
    if ((G.vars.washed || 0) >= 6 && !G.vars.collapsed) {
      G.vars.collapsed = true;
      cut(['WALT SUDDENLY COLLAPSES...', '', 'AN AMBULANCE RIDE HE', 'DID NOT ASK FOR.', '', 'HOSPITAL BILL: -$1000'], g => {
        g.money -= 1000;
        AUDIO.sfx.denied();
        completeLevel();
      });
    }
  },
  map: [
    '##########################',
    '#........................#',
    '#..AA...AA...AA...AA.....#',
    '#..AA...AA...AA...AA.....#',
    '#..w....w....w....w......#',
    '#........................#',
    '#..s..................s..#',
    '#........................#',
    '#..AA...AA...............#',
    '#..AA...AA......h........#',
    '#..w....w................#',
    '#........................#',
    '#...........P............#',
    '#........................#',
    '##########################',
  ],
},

// ============================================= 2: THE DIAGNOSIS
{
  name: 'THE DIAGNOSIS',
  epi: 'A SPOT ON THE LUNG',
  story: ['THE HOSPITAL WANTS TESTS.', 'THE RECEPTIONIST WANTS FORMS.', 'THE DOCTOR WANTS A WORD.'],
  playAs: 'walt',
  tiles: { '#': 'hospwall', '.': 'hospfloor', 'T': 'table', 'b': 'bed', 'a': 'mri1', },
  things: {
    'R': { i: { sprite: 'recep', label: 'E: RECEPTION',
      onUse(G, it) {
        it.visits = (it.visits || 0) + 1;
        if (G.vars.step > 0) { say('RECEPTIONIST: NEXT!', 1.5); return; }
        const lines = ['RECEPTIONIST: INSURANCE CARD?', 'WALT: I FILLED THE FORM TWICE!', 'RECEPTIONIST: ...FINE. XRAY, ROOM 1.'];
        say(lines[Math.min(it.visits - 1, 2)], 2.2);
        if (it.visits >= 3) { G.vars.step = 1; AUDIO.sfx.pickup(); }
      } } },
    'x': { i: { sprite: 'camera', label: 'HOLD E: XRAY', hold: true,
      onHold(G, it, dt) {
        if (G.vars.step !== 1) { return; }
        it.prog = (it.prog || 0) + dt; AUDIO.sfx.siphon();
        if (it.prog >= 2 && !it.used) { it.used = true; G.vars.step = 2; say('XRAY DONE. NOW THE MRI.', 2); AUDIO.sfx.pickup(); }
      } } },
    'm': { i: { sprite: 'camera', label: 'HOLD E: MRI', hold: true,
      onHold(G, it, dt) {
        if (G.vars.step !== 2) { return; }
        it.prog = (it.prog || 0) + dt; AUDIO.sfx.siphon();
        if (it.prog >= 3 && !it.used) { it.used = true; G.vars.step = 3; say('SCAN COMPLETE. SEE THE DOCTOR.', 2); AUDIO.sfx.pickup(); }
      } } },
    'D': { i: { sprite: 'doctor', label: 'E: DOCTOR',
      onUse(G, it) {
        if (G.vars.step !== 3) { say('DOCTOR: GET YOUR SCANS FIRST.', 1.8); return; }
        cut(['DOCTOR: MR WHITE. PLEASE SIT.', '', 'ITS LUNG CANCER. INOPERABLE.', 'BEST CASE, TWO YEARS.', '', 'WALT HEARS ONLY THE WORD:', 'MUSTARD. THERES MUSTARD ON', 'THE DOCTORS COAT.'], g => completeLevel());
      } } },
    'n': { e: 'kid' },
  },
  gun: false,
  start(G) { G.vars.step = 0; },
  objective: G => ['ARGUE WITH THE RECEPTIONIST', 'GET THE XRAY (ROOM 1)', 'GET THE MRI (ROOM 2)', 'SEE THE DOCTOR'][G.vars.step || 0],
  isDone() { return false; },
  map: [
    '##############################',
    '#bbbb...bb.#.bb....bb.#......#',
    '#x.........#.m........#....D.#',
    '#bbbb...bb.#.bb....bb.#...TTT#',
    '#####..#########..######..####',
    '#............................#',
    '#......R....n.......#bb.bbnbb#',
    '#..P..TT..########..#........#',
    '#.........#....n....#bb.bb.bb#',
    '##############################',
  ],
},

// ============================================= 3: RIDE ALONG
{
  name: 'RIDE ALONG',
  epi: 'GET A LITTLE EXCITEMENT IN YOUR LIFE',
  story: ['HANK: WANNA SEE A REAL', 'DEA BUST, BUDDY?', 'STAY BEHIND ME.', '...IS THAT PINKMAN?'],
  playAs: 'walt',
  tiles: { '#': 'brick', '.': 'walk', '=': 'roadlin', 'A': 'car', '%': 'wallhome', 'a': 'roadln2', 'b': 'road', 'c': 'grass', 'd': 'fence', },
  things: {
    'H': { a: 'hankNpc' },
    'G': { e: 'goon' },
    'h': { p: 'heart' },
  },
  gun: false,
  time: 120,
  timeoutText: 'JESSE GOT AWAY',
  objective: G => [' FOLLOW THE ROAD TO THE DRUG HOUSE', 'STAY BACK! LET HANK SHOOT!', 'CHASE JESSE TO HIS HOUSE! (RIGHT)'][G.vars.phase || 0],
  start(G) { G.vars.phase = 0; },
  tick(G, dt) {
    if (G.vars.phase === 0 && G.player.x > 26 * 16) {
      G.vars.phase = 1;
      spawnAt('goon', 30, 6); spawnAt('goon', 36, 8); spawnAt('goon', 33, 9);
      for (const e of G.enemies) if (e.type === 'goon') e.alerted = 99;
      say('SHOOT-OUT! STAY BEHIND HANK!', 2.5);
      AUDIO.sfx.alarm();
    }
    if (G.vars.phase === 1 && aliveCount(['goon']) === 0) {
      G.vars.phase = 2;
      G.exit.active = true;
      say('A GUY IN A RED HOODIE BOLTED! AFTER HIM!', 2.5);
    }
  },
  map: [
    '#############################################',
    '#ccccccccdcc%%%%ccccdcccc%%%%.cccccdc.%%%%.c#',
    '#c.P.Acccdcc%%%%ccccdcccc%%%%.ddddddc.%%%%.c#',
    '#..H........................................#',
    '#bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    '#aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    '#bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    '#....%%%%......%%%%.........####............#',
    '#cccc%%%%ccdccc%%%%ddddddddd#..#dddd.....ccc#',
    '#cccc%%%cccdccc%%%%ccccccccc####cccc..h.....#',
    '#ccccccccccdccccccccccccccccccccccccccccc..X#',
    '#############################################',
  ],
},

// ============================================= 4: SHOPPING LIST
{
  name: 'SHOPPING LIST',
  epi: 'YO, THIS IS A LOT OF SUPPLIES',
  story: ['JESSE HITS THE HARDWARE', 'STORE. FUNNELS, TUBING,', 'MASKS, MATCHES, A DRUM.', 'THEN: BORROW COMBOS RV.'],
  playAs: 'jesse',
  tiles: { '#': 'brick', '.': 'walk', 'S': 'shelf' },
  things: {
    'F': { p: 'supply', extra: { sprite: 'flask' } },
    'B': { p: 'supply', extra: { sprite: 'barrel' } },
    'M': { p: 'supply', extra: { sprite: 'chicken' } },
    'V': { p: 'supply', extra: { sprite: 'vial' } },
    'C': { p: 'supply', extra: { sprite: 'crystal' } },
    'T': { i: { sprite: 'cashier', label: 'E: CHECKOUT',
      onUse(G, it) {
        if ((G.vars.supplies || 0) < 5) { say('STILL NEED ' + (5 - (G.vars.supplies || 0)) + ' ITEMS, YO', 1.8); return; }
        if (!it.used) { it.used = true; G.vars.paidUp = true; AUDIO.sfx.cash(); say('CASHIER: ...SCIENCE PROJECT? SURE.', 2.2); }
      } } },
  },
  gun: false,
  onPickup(G, pk) { if (pk.kind === 'supply') { G.vars.supplies = (G.vars.supplies || 0) + 1; AUDIO.sfx.pickup(); } },
  objective: G => G.vars.paidUp ? 'HEAD TO COMBOS FOR THE RV' : 'GRAB SUPPLIES ' + (G.vars.supplies || 0) + '/5 THEN CHECKOUT',
  tick(G) { if (G.exit) G.exit.active = !!G.vars.paidUp; },
  chainCut: ['COMBO: 1400 BUCKS AND THE', 'KRYSTAL SHIP IS YOURS, BRO.', '', 'DRIVE IT HOME TO YOUR PLACE.'],
  chain: {
    playAs: 'jesse',
    drive: true, vehicle: 'rv', gun: false, exitOpen: true,
    tiles: { '#': 'brick', '.': 'road', '=': 'roadlin', 'A': 'car', '%': 'wallhome', 'a': 'roadln2', },
    things: { 'h': { p: 'heart' } },
    objective: 'PARK THE RV AT JESSES HOUSE',
    map: [
      '########################################',
      '#..%%%%....%%%%.....%%%%....%%%%.......#',
      '#......................................#',
      '#aaaaaaaaaaaaaaaaaaAaaaaaaaaaaaaaaaaaaa#',
      '#..P....................A..............#',
      '#aaaaaaaaaaaaaaaaAaaaaaaaaaaaaaaaaaaaaa#',
      '#......................................#',
      '#..%%%%....%%%%.....%%%%....%%%%....X..#',
      '########################################',
    ],
  },
  map: [
    '##########################',
    '#..SSSSSS..SSSSSS..SSSS..#',
    '#........................#',
    '#..SSSSSS..SSSSSS..SSSS..#',
    '#..F.........V.....M.....#',
    '#..SSSSSS..SSSSSS..SSSS..#',
    '#.....B.....M.......C....#',
    '#..SSSSSS..SSSSSS..SSSS..#',
    '#........................#',
    '####..SSS..SSSSSS...#T...#',
    '#P..................#..X.#',
    '##########################',
  ],
},

// ============================================= 5: THE FIRST COOK
{
  name: 'THE FIRST COOK',
  epi: 'APPLY YOURSELF',
  story: ['INSIDE THE KRYSTAL SHIP.', 'WALT RUNS THE COOK,', 'STEP BY STEP.', 'FOLLOW THE ARROW.'],
  playAs: 'walt',
  tiles: { '#': 'wallhome', '.': 'carpet', 'T': 'table', 'b': 'bed' },
  things: {
    '1': orderedThing(0, 'flask'),
    '2': orderedThing(1, 'barrel'),
    '3': orderedThing(2, 'crystal'),
  },
  gun: false,
  start(G) { G.vars.next = 0; },
  onPickup: cookPickup(3, 'THE BATCH IS... PERFECT?'),
  objective: G => 'COOK STEPS ' + (G.vars.next || 0) + '/3 - FOLLOW THE ARROW',
  isDone(G) { return (G.vars.next || 0) >= 3; },
  chainCut: ['OUTSIDE: TWO CARS PULL UP.', '', 'KRAZY-8 AND EMILIO.', 'THIS IS NOT A NEGOTIATION.', '', 'SURVIVE.'],
  chain: {
    playAs: 'walt',
    tiles: { '#': 'rock', '.': 'sand', 'C': 'cactus' },
    things: { 'K': { e: 'krazy8' }, 'E': { e: 'goon' }, 'h': { p: 'heart' }, 'V': { i: { sprite: 'rv', label: 'THE KRYSTAL SHIP' } } },
    gun: true,
    objective: G => 'SURVIVE THE AMBUSH (' + aliveCount(['krazy8', 'goon']) + ' LEFT)',
    isDone(G) { return aliveCount(['krazy8', 'goon']) === 0; },
    onClear(G) { G.worldFlags.cooks = (G.worldFlags.cooks || 0) + 1; G.worldFlags.stock = (G.worldFlags.stock || 0) + 5; },
    map: [
      '##############################',
      '#.....C..............C......#',
      '#..........K................#',
      '#....................C......#',
      '#...C.....V..................#',
      '#.........P.........E.......#',
      '#............................#',
      '#....##...........h.....##..#',
      '#.....C...............C.....#',
      '#............................#',
      '##############################',
    ],
  },
  map: [
    '############################',
    '#..........................#',
    '#....T..TTTTT...TT.....bb..#',
    '#..P.......................#',
    '#........1.2.3..TT......bb.#',
    '#..........................#',
    '############################',
  ],
},

// ============================================= 6: SLINGIN'
{
  name: 'SLINGIN',
  epi: 'THE BOUNCING RED CAR',
  story: ['JESSE TAKES THE PRODUCT', 'AROUND TOWN IN HIS RIDE.', 'SELL. DRIVE. DONT GET', 'CAUGHT.'],
  playAs: 'jesse',
  drive: true, vehicle: 'redcar',
  tiles: { '#': 'brick', '.': 'walk', '=': 'roadlin', '-': 'road', 'A': 'car', '%': 'wallhome', 'a': 'roadln2', },
  things: {
    'B': { i: { sprite: 'buyer', label: 'E: SELL',
      onUse(G, it) {
        it.used = true;
        G.money += 100; G.vars.sold = (G.vars.sold || 0) + 1;
        floatText(it.x, it.y, '$100'); AUDIO.sfx.cash();
        if (G.vars.sold >= 6) say('SOLD OUT! GET TO THE ALLEY!', 2.5);
      } } },
    'K': { e: 'cop' },
    'h': { p: 'heart' },
    '$': { p: 'cash' },
  },
  gun: false,
  objective: G => 'SELL ' + (G.vars.sold || 0) + '/6 - COPS ARE WATCHING',
  tick(G) { if (G.exit) G.exit.active = (G.vars.sold || 0) >= 6; },
  map: [
    '############################################',
    '#..B.......................B..............##',
    '#..........K...............................#',
    '#####..%%%%%%%%%%%%%%%%%%%%%%%%%%%%..%%%%%##',
    '#####..%%%%%%%%%%%%%%%%%%%%%%%%%%%%..%%%%%##',
    '#...................B......................#',
    '#.P........A...................A........$.##',
    '--------------------------------------------',
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    '--------------------------------------------',
    '#.....A............K...............A......##',
    '#...........B........................h....##',
    '#####..%%%%%%%%%%%%%%%%%%%%%%%%%%%%..%%%%%##',
    '#####..%%%%%%%%%%%%%%%%%%%%%%%%%%%%..%%%%%##',
    '#.B...........K..........................X##',
    '#..........................B..............##',
    '############################################',
  ],
},

// ============================================= 7: BOSS - TUCO
{
  name: 'TUCO',
  epi: 'FULMINATED MERCURY',
  story: ['TUCO TOOK THE METH AND', 'BEAT JESSE HALF TO DEATH.', '', 'PHASE 1: JESSE, GOOD LUCK.', 'YOU WILL NEED IT.'],
  playAs: 'jesse',
  tiles: { '#': 'brick', '.': 'carpet', 'T': 'table', 'A': 'crate' },
  things: { 'N': { e: 'henchman' }, 'h': { p: 'heart' } },
  gun: false,
  time: 25,
  timeoutText: 'TUCO GOT BORED',
  objective: 'SURVIVE... IF YOU CAN',
  isDone() { return false; },
  onDefeat(G) {
    cut(['TUCOS BOYS DRAG JESSE OUT.', 'THIS WENT EXACTLY AS', 'EXPECTED.', '', 'DAYS LATER, A BALD MAN', 'WALKS IN WITH A BAG OF', '"METH"...'], g => {
      g.playerChar = 'walt';
      loadDef(LEVELS[7].phase2);
      g.state = 'play';
      g.stateT = 0;
    });
  },
  phase2: {
    playAs: 'walt',
    tiles: { '#': 'brick', '.': 'carpet', 'T': 'table', 'A': 'crate' },
    things: { 'U': { e: 'tuco' }, 'G': { e: 'goon' } },
    gun: false,
    bombs: 3,
    objective: 'GET CLOSE TO TUCO. PRESS C.',
    isDone() { return false; },
    start(G) { for (const e of G.enemies) if (e.type === 'tuco') { e.hp = e.maxHp = 60; } },
    tick(G) {
      const tuco = G.enemies.find(e => e.type === 'tuco' && !e.dead);
      if (tuco && tuco.hp < tuco.maxHp && !G.vars.blasted) {
        G.vars.blasted = true;
        cut(['THE OFFICE WINDOWS BLOW OUT.', '', 'TUCO: YOU GOT BALLS,', 'HEISENBERG. TIGHT TIGHT TIGHT!', '', 'HE TAKES THE DEAL.', '$35000, UP FRONT.'], g => { g.money += 35000; completeLevel(); });
      }
      if (!G.vars.blasted && G.player.bombs === 0 && G.bullets.length === 0 && G.effects.length === 0) {
        say('OUT OF MERCURY! GRAB DISTANCE AND RETRY', 1);
        G.player.bombs = 1; // mercy: the bag holds more crystals
      }
    },
    map: [
      '######################',
      '#....................#',
      '#..G.....TT......G...#',
      '#........TT..........#',
      '#....................#',
      '#...AA.........AA....#',
      '#...AA....U....AA....#',
      '#....................#',
      '#........TT..........#',
      '#........TT..........#',
      '#....................#',
      '#..P.................#',
      '######################',
    ],
  },
  map: [
    '######################',
    '#....................#',
    '#..N.....TT......N...#',
    '#........TT..........#',
    '#....................#',
    '#...AA.........AA....#',
    '#...AA.........AA....#',
    '#..........h.........#',
    '#........TT..........#',
    '#........TT..........#',
    '#....................#',
    '#..P.................#',
    '######################',
  ],
},

// ============================================= 8: METHYLAMINE HEIST
{
  name: 'THE METHYLAMINE HEIST',
  epi: 'A ROBBERY, LIKE IN THE MOVIES',
  story: ['NO PSEUDO? NO PROBLEM.', 'BREAK INTO THE WAREHOUSE,', 'PLANT A CHARGE AS A', 'DISTRACTION, ROLL A BARREL.'],
  playAs: 'walt',
  tiles: { '#': 'brick', '.': 'walk', 'A': 'crate' },
  things: {
    'J': { a: 'jesse' },
    'W': { e: 'guard' },
    'c': { i: { sprite: 'bomb', label: 'E: PLANT CHARGE',
      onUse(G, it) {
        if (it.used) return;
        it.used = true;
        G.vars.lure = 7;
        G.vars.lureX = it.x; G.vars.lureY = it.y;
        boom(it.x, it.y, 30, 0);
        say('THE GUARDS RUN TO THE BLAST!', 2.2);
      } } },
    'Q': { i: { sprite: 'barrel', label: 'HOLD E: TAKE BARREL', hold: true,
      onHold(G, it, dt) {
        it.prog = (it.prog || 0) + dt; AUDIO.sfx.siphon();
        if (it.prog >= 4 && !it.used) { it.used = true; G.vars.barrel = true; say('GOT IT! OUT THE BACK!', 2); AUDIO.sfx.crystal(); }
      } } },
    'h': { p: 'heart' },
  },
  gun: false,
  time: 120,
  timeoutText: 'THE NIGHT SHIFT ARRIVED',
  objective: G => G.vars.barrel ? 'GET OUT!' : 'STEAL THE METHYLAMINE BARREL',
  tick(G, dt) {
    if (G.vars.lure > 0) {
      G.vars.lure -= dt;
      for (const e of G.enemies) {
        if (e.type !== 'guard' || e.dead) continue;
        e.alerted = 0;
        const dx = G.vars.lureX - e.x, dy = G.vars.lureY - e.y;
        const m = Math.hypot(dx, dy) || 1;
        if (m > 12) moveBox(e, dx / m * e.spd * 1.3 * dt, dy / m * e.spd * 1.3 * dt);
      }
    }
    if (G.exit) G.exit.active = !!G.vars.barrel;
  },
  onClear(G) { G.worldFlags.methylamine = true; },
  map: [
    '################################',
    '#P##.........................W.#',
    '#J.#..h..........W............##',
    '#..#.AAAA..AAAA..AA..cAAAAA...##',
    '#..#.AAAA..AAAA...A...AAAAAh...#',
    '#...........c.....A............#',
    '#................WA...AAAAA...##',
    '#......W..........A...AAAAA....#',
    '#..#..............A....h.......#',
    '#..#.AAAA..AAAA...A...AAAAA....#',
    '#..#.AAAA..AAAA..AA...AAQAA..W##',
    '#..#..c...........W............#',
    '#X##...........................#',
    '################################',
  ],
},

// ============================================= 9: BOSS - TUCO'S SHACK
{
  name: 'TUCOS SHACK',
  epi: 'GRILLED',
  story: ['TUCO DRAGGED THEM TO A', 'SHACK IN THE DESERT.', 'THE RICIN GOES IN THE', 'BURRITO. QUIETLY.'],
  playAs: 'walt',
  tiles: { '#': 'wallhome', '.': 'carpet', 'T': 'table', 'b': 'bed', 'C': 'cactus', ',': 'sand' },
  things: {
    'U': { e: 'victor' },   // re-sprited to Tuco pacing the shack
    'f': { i: { sprite: 'vial', label: 'HOLD E: POISON FOOD', hold: true,
      onHold(G, it, dt) {
        it.prog = (it.prog || 0) + dt; AUDIO.sfx.siphon();
        if (it.prog >= 2 && !it.used) { it.used = true; G.vars.poisoned = true; say('DONE. NOW ACT NATURAL.', 2); AUDIO.sfx.pickup(); }
      } } },
  },
  gun: false,
  start(G) { for (const e of G.enemies) if (e.type === 'victor') e.sprite = 'tuco'; },
  objective: G => G.vars.poisoned ? 'SLIP OUT OF THE SHACK' : 'POISON THE FOOD - DONT GET CAUGHT',
  tick(G) { if (G.exit) G.exit.active = !!G.vars.poisoned; },
  chainCut: ['TUCO SPITS IT OUT.', '"THIS TASTES LIKE CHEMICALS!"', '', 'OUTSIDE: AN ENGINE.', 'HANK FOUND THE RED CAR.', '', 'NOW PLAYING: HANK'],
  chain: {
    playAs: 'hank',
    tiles: { '#': 'rock', '.': 'sand', 'C': 'cactus', 'A': 'car', '%': 'wallhome' },
    things: { 'U': { e: 'tuco' }, 'h': { p: 'heart' } },
    gun: true,
    objective: 'TAKE TUCO DOWN',
    isDone(G) { return aliveCount(['tuco']) === 0; },
    map: [
      '##############################',
      '#........C...................#',
      '#....%%%%%%%.................#',
      '#....%%%%%%%.....U...........#',
      '#....%%%%%%%.................#',
      '#............................#',
      '#....AA...........C.....h...#',
      '#....AA.....P................#',
      '#.....C......................#',
      '#............................#',
      '##############################',
    ],
  },
  map: [
    '##########################',
    '#,,,,,,,,,,,,,,,,,,,,,,,,#',
    '#,,####################,,#',
    '#,,#.......T..........#,,#',
    '#,,#..b....f......U...#,,#',
    '#,,#..................#,,#',
    '#,,#..TT........b.....#,,#',
    '#,,#..................#,,#',
    '#,,##########.#########,,#',
    '#,,,,,,,,,,,,,,,,,,,,,,,,#',
    '#,,C,,,,,,,,P,,,,,,,C,,,,#',
    '#,,,,,,,,,,X,,,,,,,,,,,,,#',
    '##########################',
  ],
},

// ============================================= 10: FUGUE STATE
{
  name: 'FUGUE STATE',
  epi: 'WHERE IS MY HUSBAND',
  story: ['TO EXPLAIN THE MISSING DAYS,', 'WALT PULLS HIS BOLDEST MOVE:', 'NO CLOTHES, ONE SUPERMARKET.'],
  playAs: 'undies',
  tiles: { '#': 'brick', '.': 'walk', '=': 'roadlin', 'A': 'car', '%': 'wallhome', 'a': 'roadln2', },
  things: { 'K': { e: 'cop' }, 'k': { e: 'kid' }, 'h': { p: 'heart' } },
  gun: false,
  exitOpen: true,
  objective: 'GET HOME. WITH DIGNITY. (AVOID EVERYONE)',
  start(G) { G.vars.opened = false; },
  tick(G) {
    if (!G.vars.opened) {
      G.vars.opened = true;
      cut(['ONE "FUGUE STATE" LATER,', 'WALT WAKES UP IN A', 'SUPERMARKET WEARING ONLY', 'HIS UNDERWEAR.', '', 'THE HOSPITAL RELEASED HIM.', 'NOW: THE WALK HOME.'], g => { g.state = 'play'; });
    }
  },
  map: [
    '############################################',
    '#..P...........................%%%%%......##',
    '#..........k...............................#',
    '#aaaaaaaaaaaaaaaaaAaaaaaaaaaaaaaaaaaaaaaaaa#',
    '#..........................k...............#',
    '#....%%%%......K...........%%%%%..........##',
    '#....%%%%..................%%%%%.....h....##',
    '#...........................K..............#',
    '#aaaaaaaaaaaaaaaaaaaaaAaaaaaaaaaaaaaaaaaaaa#',
    '#..k........................k.............X#',
    '############################################',
  ],
},

// ============================================= 11: MEET GUS
{
  name: 'LOS POLLOS HERMANOS',
  epi: 'A MAN PROVIDES',
  story: ['A NEW DISTRIBUTOR. THE', 'CONTACT: A FAST FOOD', 'RESTAURANT. ASK FOR', 'THE MAN WHO ISNT THERE.'],
  playAs: 'walt',
  tiles: { '#': 'brick', '.': 'walk', 'T': 'table' },
  things: {
    'c': { i: { sprite: 'cashier', label: 'E: CASHIER',
      onUse(G, it) {
        it.visits = (it.visits || 0) + 1;
        if (it.visits === 1) say('CASHIER: WELCOME TO LOS POLLOS!', 2);
        else { say('CASHIER: ...MAYBE JUST ENJOY A MEAL, SIR.', 2.2); G.vars.asked = true; }
      } } },
    'm': { i: { sprite: 'chicken', label: 'E: BUY MEAL $10',
      onUse(G, it) {
        if (!G.vars.asked) { say('TALK TO THE CASHIER FIRST', 1.5); return; }
        if (!it.used) { it.used = true; G.money -= 10; G.vars.ate = true; AUDIO.sfx.pickup(); say('CRISPY. SUSPICIOUSLY GOOD.', 2); }
      } } },
    'w': { i: { sprite: 'door', label: 'HOLD E: WAIT', hold: true,
      onHold(G, it, dt) {
        if (!G.vars.ate) return;
        it.prog = (it.prog || 0) + dt;
        if (it.prog >= 2.5 && !it.used) {
          it.used = true; G.vars.gusReady = true;
          say('THE QUIET MAN BUSSING TABLES', 2);
          say('IS WATCHING YOU...', 2);
        }
      } } },
    'U': { i: { sprite: 'gusNpc', label: 'E: THE OWNER',
      onUse(G) {
        if (!G.vars.gusReady) { say('HE IS JUST... CLEANING TABLES', 1.8); return; }
        cut(['GUS: I DONT THINK WE ARE', 'ALIKE, MR WHITE.', '', 'YOU ARE NOT A CAUTIOUS MAN.', 'BUT YOUR PRODUCT...', 'YOUR PRODUCT IS THE BEST', 'I HAVE EVER SEEN.', '', 'WE WILL BE IN TOUCH.'], g => completeLevel());
      } } },
  },
  gun: false,
  objective: G => !G.vars.asked ? 'TALK TO THE CASHIER (TWICE)'
    : !G.vars.ate ? 'BUY A MEAL'
    : !G.vars.gusReady ? 'SIT AND WAIT (HOLD E AT A TABLE)'
    : 'TALK TO THE MAN BUSSING TABLES',
  isDone() { return false; },
  map: [
    '#########################',
    '#####PX###########..U.###',
    '#####..#.TT.#.TTw#.TT.###',
    '#####..#.TT.#.TT.#....###',
    '#####............#....###',
    '#####....TT.#.TT.#..#.###',
    '#####....TT.#.TT.#..#.###',
    '#####....TT.#.TT.#..#.###',
    '#####..m.........#..#.###',
    '#####..TTTTTTTTTT####.###',
    '#####...c.............###',
    '#########################',
  ],
},

// ============================================= 12: THE DEAL
{
  name: 'THE DEAL',
  epi: 'ONE POUND, ONE DROP, 1.6 MILLION',
  story: ['GUS WANTS THE FULL BATCH', 'AT THE HIGHWAY SERVICE', 'STATION. 40 MINUTES.', 'TRAFFIC IS MURDER.'],
  playAs: 'walt',
  drive: true, vehicle: 'redcar',
  tiles: { '#': 'rock', '.': 'sand', '=': 'roadlin', '-': 'road', 'C': 'cactus', 'a': 'roadln2', },
  things: { '<': { e: 'trafficL', tile: 'road' }, '>': { e: 'trafficR', tile: 'road' }, 'h': { p: 'heart' } },
  gun: false,
  exitOpen: true,
  time: 75,
  timeoutText: 'GUS DOES NOT WAIT',
  objective: 'REACH THE SERVICE STATION - DODGE TRAFFIC',
  onClear(G) {
    G.money += 1600000;
  },
  map: [
    '################################################################',
    '#...C..........C.........C..........C.............C...........##',
    '#..............................................................#',
    '#---------------<------------------<---------------------------#',
    '#--------->----------------->----------------->----------------#',
    '#Paaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    '#---------------<------------------<---------------------------#',
    '#--------->--------------------->------------------------------#',
    '#..............................................................#',
    '#....C...........h..........C.........................X.......##',
    '#..........C.......................C..........C...............##',
    '################################################################',
  ],
},

// ============================================= 13: THE SUPERLAB
{
  name: 'THE SUPERLAB',
  epi: 'GUS FRINGS PRIDE AND JOY',
  story: ['UNDER THE LAUNDRY: A LAB', 'THAT COST MILLIONS.', 'GALE HANDLES THE COFFEE.', 'RUN THE COOK IN ORDER.'],
  playAs: 'walt',
  tiles: { '#': 'labwall', '.': 'labfloor', 'T': 'tank' },
  things: {
    '1': orderedThing(0, 'flask'),
    '2': orderedThing(1, 'barrel'),
    '3': orderedThing(2, 'flask'),
    '4': orderedThing(3, 'barrel'),
    '5': orderedThing(4, 'crystal'),
    'V': { e: 'victor' },
    'O': { e: 'camera' },
    'h': { p: 'heart' },
    'g': talkNpc('gale', 'GALE', [
      'GALE: THIS IS QUITE AN HONOR, MR WHITE!',
      'GALE: I MEASURED THE COFFEE BY MASS.',
      'GALE: MAJESTIC, THE CHEMISTRY I MEAN.']),
  },
  gun: false,
  time: 110,
  timeoutText: 'GUS IS NOT PLEASED',
  objective: G => 'COOK STEPS ' + (G.vars.next || 0) + '/5 - FOLLOW THE ARROW',
  start(G) { G.vars.next = 0; },
  onPickup: cookPickup(5, 'THE BATCH IS DONE! GET OUT!'),
  tick(G) { if (G.exit) G.exit.active = (G.vars.next || 0) >= 5; },
  onClear(G) { G.money += 15000; G.worldFlags.cooks = (G.worldFlags.cooks || 0) + 1; G.worldFlags.stock = (G.worldFlags.stock || 0) + 5; },
  map: [
    '##########################',
    '#P.....................#.#',
    '#......................#.#',
    '#...TT..TT..TT..TT..TT.#.#',
    '##.gTT..TT3.TT1.TT2.TT.#.#',
    '#...T4..TT..TT..TT..TT.#.#',
    '#...TT..TT..TT..TT..TT.#.#',
    '#...TT..TT..TT..TT..TT.#.#',
    '#........................#',
    '#........................#',
    '##..TTTT5T..##..TTTTTT..##',
    '#......h....##...........#',
    '#...........##...........#',
    '#X...###############.....#',
    '##########################',
  ],
},

// ============================================= 14: BOSS - FULL MEASURE
{
  name: 'FULL MEASURE',
  epi: 'DO IT. DO IT NOW.',
  story: ['GUS HAS CHOSEN GALE AS', 'WALTS REPLACEMENT. THERE', 'IS ONLY ONE MOVE LEFT,', 'AND ITS A TERRIBLE ONE.'],
  playAs: 'walt',
  tiles: { '#': 'brick', '.': 'walk', 'A': 'crate' },
  things: {
    'p': { i: { sprite: 'door', label: 'E: PHONE',
      onUse(G) {
        if (!G.vars.called) { G.vars.called = true; }
      } } },
  },
  gun: false,
  objective: 'VICTOR IS COMING. GET TO THE PHONE.',
  isDone(G) { return !!G.vars.called; },
  chainCut: ['WALT, HELD AT THE LAUNDRY:', '"JESSE. YOU KNOW WHAT', 'YOU HAVE TO DO."', '', 'NOW PLAYING: JESSE.', 'RACE ACROSS TOWN.'],
  chain: {
    playAs: 'jesse',
    tiles: { '#': 'brick', '.': 'walk', '=': 'roadlin', 'A': 'car', '%': 'wallhome', 'a': 'roadln2', },
    things: { 'K': { e: 'cop' } },
    gun: false,
    exitOpen: true,
    time: 35,
    timeoutText: 'TOO LATE. FOR EVERYONE.',
    objective: 'GET TO GALES APARTMENT. NOW.',
    isDone() { return false; },
    tick(G) {
      if (G.vars.exited && !G.vars.ended) {
        G.vars.ended = true;
        cut(['A KNOCK. A DOOR OPENS.', '', '[FADE TO BLACK]', '', 'SOME THINGS CANNOT BE', 'UNDONE.'], g => completeLevel());
      }
    },
    map: [
      '############################################',
      '#.P.........................%%%%..........##',
      '#aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      '#..........A...............................#',
      '#....%%%%........%%%%........%%%%..........#',
      '#....%%%%........%%%%........%%%%..........#',
      '#.......................K..................#',
      '#aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      '#..............A...........................#',
      '#....%%%%..........%%%%............%%%%...X#',
      '############################################',
    ],
  },
  map: [
    '######################',
    '#....................#',
    '#..AA....AA....AA....#',
    '#....................#',
    '#..AA....AA....AA....#',
    '#..............p.....#',
    '#....................#',
    '#..P.................#',
    '######################',
  ],
},

// ============================================= 15: BOSS - ONE MINUTE
{
  name: 'ONE MINUTE',
  epi: 'TWO MEN IN SHARP SUITS',
  story: ['THE COUSINS CROSSED THE', 'BORDER FOR ONE REASON.', 'HANK GETS A ONE-MINUTE', 'WARNING. MAKE IT COUNT.'],
  playAs: 'hank',
  tiles: { '#': 'brick', '.': 'walk', '=': 'road', 'A': 'car' },
  things: {
    '2': { e: 'cousin' },
    'c': { p: 'chicken' },
    'h': { p: 'heart' },
    '$': { p: 'cash' },
  },
  gun: true,
  objective: G => 'SURVIVE THE COUSINS (' + aliveCount(['cousin']) + ' LEFT)',
  isDone(G) { return aliveCount(['cousin']) === 0; },
  map: [
    '##############################',
    '#......2..............2.....##',
    '#............................#',
    '#...AAAA..AAAA..AAAA..AAAA..##',
    '#...AAAA..AAAA..AAAA..AAAA..##',
    '#............................#',
    '#.$........................h##',
    '#...AAAA..AAAAc.AAAA..AAAA..##',
    '#...AAAA..AAAA..AAAA..AAAA..##',
    '#............................#',
    '#............................#',
    '#...AAAA..AAAA..AAAA..AAAA..##',
    '#...AAAA..AAAA..AAAA..AAAA..##',
    '#.............P..............#',
    '##############################',
  ],
},

// ============================================= 16: BOSS - FACE OFF
{
  name: 'FACE OFF',
  epi: 'DING DING DING',
  story: ['GUS VISITS OLD HECTOR', 'AT CASA TRANQUILA.', 'SNEAK IN. WIRE THE CHAIR.', 'WAIT FOR THE BELL.'],
  playAs: 'walt',
  tiles: { '#': 'wallhome', '.': 'carpet', 'b': 'bed', 'T': 'table' },
  things: {
    'W': { e: 'guard' },
    'H': { i: { sprite: 'hector', label: 'E: RING THE BELL',
      onUse(G, it) {
        it.used = true;
        G.vars.planted = true;
        G.vars.hx = it.x; G.vars.hy = it.y;
        G.timeLeft = 30;
        if (G.exit) G.exit.active = true;
        G.vars.alarm = 999;
        say('THE BELL IS WIRED! RUN!', 2);
        AUDIO.sfx.alarm();
      } } },
    'h': { p: 'heart' },
  },
  gun: false,
  time: null,
  timeoutText: 'YOU WERE IN THE BLAST',
  objective: G => G.vars.planted ? 'GET OUT BEFORE IT BLOWS!' : 'SNEAK TO HECTORS ROOM',
  isDone(G) {
    if (G.vars.exited && G.vars.planted) {
      if (!G.vars.boomed) { G.vars.boomed = true; boom(G.vars.hx, G.vars.hy, 70, 99); }
      return true;
    }
    return false;
  },
  map: [
    '###########################',
    '#..b..#....#...b.#..b..H.##',
    '#..b..#.W..#.....#.......##',
    '#.....#....#..T..#..b....##',
    '#..T..#.#####....####.#####',
    '#.....#.....#....#.......##',
    '###.###.....#.####...W...##',
    '#.........................#',
    '#..W...####.####..T..b...##',
    '#......#.h....#..........##',
    '#..b...#......#....W...b.##',
    '#..b...#..T...#..........##',
    '#......#......#....b.....##',
    '#PX....#......#..........##',
    '###########################',
  ],
},

// ============================================= 17: VAMANOS COOKS
{
  name: 'VAMANOS PEST',
  epi: 'THE BEST COVER IN TOWN',
  story: ['NO LAB? NO PROBLEM.', 'THE HOUSE IS TENTED FOR', '"FUMIGATION". COOK FAST,', 'LEAVE NO TRACE.'],
  playAs: 'walt',
  tiles: { '#': 'wallhome', '.': 'carpet', 'T': 'table', 'b': 'bed' },
  things: {
    '1': orderedThing(0, 'flask'),
    '2': orderedThing(1, 'barrel'),
    '3': orderedThing(2, 'crystal'),
    'h': { p: 'heart' },
  },
  gun: false,
  time: 60,
  timeoutText: 'THE FAMILY CAME HOME EARLY',
  objective: G => 'COOK STEPS ' + (G.vars.next || 0) + '/3 THEN GET OUT',
  start(G) { G.vars.next = 0; },
  onPickup: cookPickup(3, 'DONE! PACK IT UP!'),
  tick(G) { if (G.exit) G.exit.active = (G.vars.next || 0) >= 3; },
  onClear(G) { G.money += 8000; G.worldFlags.cooks = (G.worldFlags.cooks || 0) + 1; G.worldFlags.stock = (G.worldFlags.stock || 0) + 5; },
  map: [
    '######################',
    '#..b......T....2.....#',
    '#..b.................#',
    '#.........TT.........#',
    '#..1......TT....b....#',
    '#....................#',
    '###.####.....####.####',
    '#........h...........#',
    '#..T.....3......b....#',
    '#....................#',
    '#..P............X....#',
    '######################',
  ],
},

// ============================================= 18: DEAD FREIGHT
{
  name: 'DEAD FREIGHT',
  epi: 'THE GREAT TRAIN ROBBERY',
  story: ['A THOUSAND GALLONS OF', 'METHYLAMINE ROLLS THROUGH', 'THE DESERT. SIPHON THE TANK', 'BEFORE THE TRAIN LEAVES!'],
  playAs: 'walt',
  tiles: { '#': 'rock', '.': 'sand', 'r': 'rail', 't': 'train', 'C': 'cactus', 'a': 'roadlin', 'b': 'car3', 'c': 'truck1', 'd': 'train1', 'e': 'train2', 'f': 'trainjoin', },
  things: {
    'W': { e: 'guard' },
    'Q': { i: { sprite: 'barrel', label: 'HOLD E: SIPHON', hold: true,
      onHold(G, it, dt) {
        G.vars.siphon = (G.vars.siphon || 0) + dt;
        AUDIO.sfx.siphon();
        if (G.vars.siphon >= 4 && !it.used) {
          it.used = true;
          say('TANK FULL! GET TO THE TRUCK!', 2.5);
          AUDIO.sfx.crystal();
        }
      } } },
    'h': { p: 'heart' },
  },
  gun: false,
  time: 120,
  timeoutText: 'THE TRAIN LEFT THE VALLEY',
  objective: G => 'SIPHON: ' + Math.min(100, Math.floor((G.vars.siphon || 0) / 4 * 100)) + '% - DONT GET SPOTTED',
  tick(G) { if (G.exit) G.exit.active = (G.vars.siphon || 0) >= 4; },
  onClear(G) { G.worldFlags.stock = (G.worldFlags.stock || 0) + 10; },
  map: [
    '.a..........C.....C.....C...........C...........',
    '.a...C...............C.........C........C.C.....',
    '.a.....C...W.C..C..........W....C....C..........',
    '.a.C....................C....C..................',
    '.a..............................................',
    '.cdetttfttttfttttfttttfttttfttttfttttfttttftttt.',
    'rarrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr',
    '#a################################Q.############',
    '#a...###...W..#.#..#.#..##.#.####....#.##..#.#.#',
    '#a..C..............C.........#.#.......C#....X##',
    '#a..........................h............#..##.#',
    '#a.P.......................................#...#',
    '#a.......C.........C..........C........C..#...##',
    '################################################',
  ],
},

// ============================================= 19: CARTEL BATTLE
{
  name: 'CARTEL BATTLE',
  epi: 'SALUD',
  story: ['THE CARTEL WANTS ITS CUT.', 'THEY SENT EVERYONE THEY', 'HAVE TO THE SCRAPYARD.', 'HOLD YOUR GROUND.'],
  playAs: 'walt',
  tiles: { '#': 'scrap', '.': 'dirt', '=': 'road', 'A': 'car' },
  things: { 'c': { p: 'chicken' }, 'h': { p: 'heart' }, 'b': { p: 'bomb' } },
  gun: true,
  objective: G => 'WAVE ' + Math.min(3, (G.vars.wave || 0)) + '/3 - CARTEL LEFT: ' + aliveCount(['cartel']),
  start(G) { G.vars.wave = 0; G.vars.waveCd = 1.5; },
  tick(G, dt) {
    if (aliveCount(['cartel']) === 0) {
      if (G.vars.wave >= 3) return;
      G.vars.waveCd -= dt;
      if (G.vars.waveCd <= 0) {
        G.vars.wave++;
        G.vars.waveCd = 3;
        say('WAVE ' + G.vars.wave + '!', 1.5);
        const spots = [[2, 2], [25, 2], [2, 14], [25, 14], [13, 2], [13, 14], [2, 8], [25, 8]];
        const n = 2 + G.vars.wave;
        for (let i = 0; i < n; i++) {
          const s = spots[i % spots.length];
          spawnAt('cartel', s[0], s[1]);
        }
      }
    }
  },
  isDone(G) { return G.vars.wave >= 3 && aliveCount(['cartel']) === 0; },
  onClear(G) { G.money += 20000; },
  map: [
    '############################',
    '#..........................#',
    '#...AA...............AA....#',
    '#...AA...............AA....#',
    '#..........................#',
    '#.......####..####..........#',
    '#..b....#......h.#..........#',
    '#.......#...P....#..........#',
    '#=......#........#.........=#',
    '#.......#....c...#..........#',
    '#.......####..####..........#',
    '#..........................#',
    '#...AA...............AA....#',
    '#...AA...............AA....#',
    '#..........................#',
    '############################',
  ],
},

// ============================================= 20: BOSS - OZYMANDIAS
{
  name: 'OZYMANDIAS',
  epi: 'MY NAME IS ASAC SCHRADER',
  story: ['TO-HAJIILEE. HANK MADE', 'THE ARREST. THEN JACKS', 'CREW ARRIVED, GUNS OUT.', '', 'SOME FIGHTS CANT BE WON.'],
  playAs: 'hank',
  tiles: { '#': 'rock', '.': 'sand', 'C': 'cactus', 'A': 'car' },
  things: {
    'J': { e: 'jack' },
    'N': { e: 'nazi' },
    'G': { a: 'gomez' },
    'h': { p: 'heart' },
  },
  gun: true,
  objective: 'HOLD OUT AS LONG AS YOU CAN',
  isDone() { return false; },
  start(G) {
    G.vars.t = 0;
    for (const e of G.enemies) if (e.type === 'jack') { e.hp = e.maxHp = 999; }
  },
  tick(G, dt) {
    G.vars.t += dt;
    G.vars.spawnCd = (G.vars.spawnCd || 4) - dt;
    if (G.vars.spawnCd <= 0 && aliveCount(['nazi']) < 6) {
      G.vars.spawnCd = 6;
      const spots = [[2, 2], [27, 2], [2, 12], [27, 12]];
      const s = spots[Math.floor(Math.random() * spots.length)];
      spawnAt('nazi', s[0], s[1]);
    }
    if (G.vars.t > 35 && !G.vars.ended) {
      G.vars.ended = true;
      cut(['OUT OF AMMO.', '', 'HANK: MY NAME IS ASAC', 'SCHRADER. AND YOU CAN GO...', '', '[FADE TO BLACK]', '', 'THE DESERT KEEPS ITS SECRETS.'], g => completeLevel());
    }
  },
  onDefeat(G) {
    if (!G.vars.ended) {
      G.vars.ended = true;
      cut(['HANK IS DOWN.', '', 'HANK: MY NAME IS ASAC', 'SCHRADER. AND YOU CAN GO...', '', '[FADE TO BLACK]'], g => completeLevel());
    }
  },
  map: [
    '##############################',
    '#.#..#C..#.#.C......C.......##',
    '#C#.......#.C.#...........#.##',
    '##...C..........N.A..N..#...##',
    '#.C#....#..#...#..AN.AA..#..##',
    '#.#.........................##',
    '#C#...GA....#........A..J...##',
    '#C....PA.............AN....###',
    '##C..C...................C..##',
    '##C#....AA.........A.N.....###',
    '##...##............AN...#...##',
    '###..#C........#.....C.....###',
    '#C#C............#.N......C.CC#',
    '##############################',
  ],
},

// ============================================= 21: FINAL - FELINA
{
  name: 'FELINA',
  epi: 'THE FINAL SHOWDOWN',
  story: ['UNCLE JACKS COMPOUND.', 'ONE LAST VISIT.', 'THERES A SURPRISE', 'IN THE TRUNK.'],
  playAs: 'walt',
  tiles: { '#': 'brick', '.': 'dirt', 'F': 'fence', 'A': 'car', 'C': 'crate' },
  things: {
    'N': { e: 'nazi' },
    'J': { e: 'jack' },
    'M': { i: { sprite: 'm60', label: 'E: POP THE TRUNK',
      onUse(G, it) {
        it.used = true;
        G.vars.m60 = 12;
        G.vars.m60x = it.x; G.vars.m60y = it.y;
        say('M60 ONLINE!', 1.5);
        AUDIO.sfx.alarm();
      } } },
    'Z': { i: { sprite: 'jesse', label: 'E: FREE JESSE',
      onUse(G, it) {
        if (aliveCount(['nazi', 'jack']) === 0) {
          it.used = true;
          G.vars.freed = true;
          say('YEAH SCIENCE!', 2);
        } else {
          say('CLEAR THE COMPOUND FIRST!', 1.5);
          AUDIO.sfx.denied();
        }
      } } },
    'h': { p: 'heart' },
    'c': { p: 'chicken' },
    'b': { p: 'bomb' },
  },
  gun: true,
  bombs: 1,
  objective: G => aliveCount(['nazi', 'jack']) > 0
    ? 'CLEAR THE COMPOUND (' + aliveCount(['nazi', 'jack']) + ' LEFT)'
    : 'FREE JESSE',
  tick(G, dt) {
    if (G.vars.m60 > 0) {
      G.vars.m60 -= dt;
      G.vars.m60cd = (G.vars.m60cd || 0) - dt;
      if (G.vars.m60cd <= 0) {
        G.vars.m60cd = 0.07;
        G.vars.m60a = (G.vars.m60a || 0) + 0.45;
        fireBullet(G.vars.m60x, G.vars.m60y,
          Math.cos(G.vars.m60a), Math.sin(G.vars.m60a), 'player', 2);
      }
    }
  },
  isDone(G) { return !!G.vars.freed; },
  map: [
    'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
    'F...F............................F',
    'F...F....###############..A.hA...F',
    'F...F....#..N.........c#..A..A...F',
    'F...F....#.N.N.N.N..J..#.........F',
    'F...F....#............c#..A..A...F',
    'F...FFFF.#.......N######..A..A...F',
    'F...F...............N............F',
    'F...F.....................FFFF...F',
    'F.......AM............N...F..F...F',
    'F.......A.................F..F...F',
    'F...F.....................FF.F...F',
    'F...F........................F...F',
    'F...F.................FFFFFFFF...F',
    'F...FFFF..............N..........F',
    'F...F.....A..A...A....###..###...F',
    'F...F....hA..A..hA....#..Z...#...F',
    'F..PF.................#......#...F',
    'F...F.................########...F',
    'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
  ],
},
];

// Normalize: pad every row to the def's max width with its border char
function padMaps(def) {
  const w = Math.max(...def.map.map(r => r.length));
  const border = def.map[0][0];
  def.map = def.map.map(r => r.padEnd(w, border));
  if (def.chain) padMaps(def.chain);
  if (def.phase2) padMaps(def.phase2);
}
for (const L of LEVELS) padMaps(L);

// ============================================================
// Repeatable side jobs (launched from world doors via startSide)
// ============================================================

const SIDE_COOK = {
  name: 'DESERT COOK',
  epi: 'SIDE JOB',
  story: ['ANOTHER BATCH IN THE RV.', 'FOLLOW THE STEPS,', 'MIND THE WILDLIFE ON', 'THE WAY OUT.'],
  tiles: { '#': 'rock', '.': 'sand', 'C': 'cactus', 'T': 'tank' },
  things: {
    '1': orderedThing(0, 'flask'),
    '2': orderedThing(1, 'barrel'),
    '3': orderedThing(2, 'crystal'),
    'S': { e: 'snake' },
    'V': { i: { sprite: 'rv', label: 'THE KRYSTAL SHIP' } },
    'h': { p: 'heart' },
  },
  gun: false,
  time: 70,
  timeoutText: 'THE BATCH BOILED OVER',
  objective: G => 'COOK STEPS ' + (G.vars.next || 0) + '/3 THEN REACH THE EXIT',
  start(G) { G.vars.next = 0; },
  onPickup: cookPickup(3, 'BATCH DONE! HEAD OUT!'),
  tick(G) { if (G.exit) G.exit.active = (G.vars.next || 0) >= 3; },
  onClear(G) {
    const blue = !!G.worldFlags.methylamine;
    const pay = blue ? 4000 : 1500;
    G.money += pay;
    G.worldFlags.cooks = (G.worldFlags.cooks || 0) + 1;
    G.worldFlags.stock = (G.worldFlags.stock || 0) + 5;
    say((blue ? 'BLUE SKY' : 'PRODUCT') + ' SOLD: +$' + pay, 2.5);
  },
  map: [
    '##############################',
    '#.#..C........X.....C.#....##',
    '#......#...........#.....#...#',
    '##...........................#',
    '##...1.T.....V..........C...#',
    '#..#.......P.........2.......#',
    '#....C.............#.........#',
    '#..#......3......#..S....h..#',
    '##...........C..........#..#.#',
    '#.#...#..#............#..#...#',
    '##############################',
  ],
};

const SIDE_WASH = {
  name: 'CAR WASH SHIFT',
  epi: 'A1A - OWNED AND OPERATED',
  story: ['YOUR CAR WASH NOW.', 'THE MONEY IS CLEAN,', 'THE CARS ARE NOT.'],
  tiles: { '#': 'brick', '.': 'walk', 'A': 'car' },
  things: {
    'w': { i: { sprite: 'sponge', label: 'HOLD E: WASH', hold: true,
      onHold(G, it, dt) {
        it.prog = (it.prog || 0) + dt;
        AUDIO.sfx.siphon();
        if (it.prog >= 1.2 && !it.used) {
          it.used = true;
          G.money += 50; G.vars.washed = (G.vars.washed || 0) + 1;
          AUDIO.sfx.cash(); floatText(it.x, it.y, '+$50');
        }
      } } },
    'h': { p: 'heart' },
  },
  gun: false,
  objective: G => 'WASH THE CARS: ' + (G.vars.washed || 0) + '/6',
  isDone(G) { return (G.vars.washed || 0) >= 6; },
  onClear(G) { G.money += 200; say('DAILY TAKINGS: +$200 (LAUNDERED)', 2.5); },
  map: [
    '##########################',
    '#........................#',
    '#..AA...AA...AA...AA.....#',
    '#..AA...AA...AA...AA.....#',
    '#..w....w....w....w......#',
    '#........................#',
    '#..AA...AA......h........#',
    '#..AA...AA...............#',
    '#..w....w....P...........#',
    '#........................#',
    '##########################',
  ],
};

const SIDE_PEST = Object.assign({}, LEVELS[17], {
  name: 'VAMANOS PEST',
  epi: 'SIDE JOB',
  story: ['ANOTHER HOUSE, ANOTHER', 'TENT, ANOTHER BATCH.'],
});

// ============================================================
// THE OPEN WORLD — Albuquerque, NM (84 x 56)
// ============================================================

function buildWorldMap() {
  const W = 84, H = 56;
  const g = Array.from({ length: H }, () => Array(W).fill(','));
  const set = (x, y, c) => { if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = c; };
  const rect = (x, y, w, h, c) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) set(i, j, c); };

  // avenues (vertical), then streets (horizontal, win at crossings)
  for (const c of [20, 41, 62]) {
    rect(c - 1, 1, 1, H - 2, '.'); rect(c, 1, 2, H - 2, '-'); rect(c + 2, 1, 1, H - 2, '.');
  }
  for (const r of [9, 18, 27, 36, 45]) {
    rect(1, r - 1, W - 2, 1, '.'); rect(1, r, W - 2, 1, '='); rect(1, r + 1, W - 2, 1, '.');
  }

  // ---------- rows 1-7: north residential ----------
  rect(6, 1, 6, 2, '~'); set(13, 2, 'f'); set(4, 1, '$');       // pool + the fund
  rect(4, 3, 12, 4, '%'); set(10, 7, '3'); set(14, 7, 'S');      // Walt's house (ride along)
  set(15, 3, 'p');                                               // pizza on the roof
  set(10, 8, 'P');
  rect(24, 3, 10, 4, '%'); set(28, 7, 'M');                      // Hank & Marie
  rect(46, 3, 10, 4, '%'); set(48, 7, 'K'); set(52, 7, 'B');     // Jesse's
  set(57, 5, 'a');                                               // the RV out front (after mission 5)
  rect(68, 3, 9, 4, '#'); set(72, 7, 'D');                       // Gale's apartment
  rect(33, 3, 5, 3, '%'); rect(58, 2, 3, 4, '%');                // filler houses
  set(80, 1, 'k'); set(18, 8, 'z');

  // ---------- rows 11-16: civic ----------
  rect(3, 11, 14, 5, '&'); set(10, 16, '0'); set(15, 16, 'r');   // school + race
  rect(24, 11, 12, 5, '&'); set(30, 16, 'H');                    // DEA
  rect(46, 11, 13, 5, '#'); set(52, 16, '2');                    // hospital
  rect(68, 11, 10, 5, '#'); set(72, 16, 'Q');                    // bank
  rect(80, 11, 2, 3, '%');                                       // filler
  set(82, 13, 'k'); set(50, 10, 'z'); set(38, 12, '$');

  // ---------- rows 20-25: commercial ----------
  rect(3, 20, 10, 5, '#'); set(8, 25, '1'); set(11, 25, 'g');    // car wash + Bogdan
  set(14, 21, 'A'); set(14, 23, 'A');
  rect(24, 20, 8, 4, '#'); set(27, 25, 'G');                     // Saul
  rect(33, 20, 7, 4, '#'); set(36, 25, 'l');                     // Los Pollos
  rect(44, 20, 13, 4, '#');                                      // supermarket
  set(48, 25, 'u'); set(52, 25, 'R'); set(55, 25, 'o');
  set(46, 25, 'A'); set(57, 25, 'A');
  rect(66, 20, 9, 4, '#'); set(70, 25, '4');                     // hardware store
  rect(59, 20, 2, 4, '%');                                       // filler
  set(79, 21, 'k'); set(30, 19, 'z'); set(70, 26, 'z'); set(78, 24, '$');

  // ---------- rows 29-34: south side ----------
  rect(3, 29, 12, 5, '#'); set(9, 34, 'n');                      // laundromat
  rect(24, 29, 8, 4, '#'); set(27, 34, 'V');                     // Vamanos Pest
  rect(34, 29, 4, 3, 'T'); set(36, 32, 't');                     // tented house 1
  rect(45, 29, 4, 3, 'T'); set(47, 32, 't');                     // tented house 2
  rect(51, 29, 6, 4, '%'); set(53, 34, 'Y'); set(58, 34, '6');   // meth house + corner
  rect(66, 29, 6, 4, '#'); set(68, 34, '7');                     // Tuco's hideout
  rect(74, 29, 8, 5, '#'); set(77, 34, '8');                     // warehouse
  rect(16, 29, 3, 4, '%');                                       // filler
  set(31, 30, 'k'); set(12, 28, 'z');

  // ---------- rows 38-43: outskirts ----------
  rect(5, 38, 14, 4, '%'); set(11, 42, 'q');                     // Casa Tranquila
  rect(24, 38, 7, 4, '%'); set(27, 42, 'J');                     // Combo's house
  rect(44, 38, 14, 6, '*'); rect(46, 40, 10, 2, '.');            // scrapyard
  rect(50, 38, 2, 2, '.');                                       // yard entrance
  set(46, 43, 'y'); set(52, 41, 'e');
  rect(33, 38, 5, 4, '%'); rect(66, 38, 6, 4, '#'); rect(74, 38, 7, 4, '%'); // fillers
  set(81, 37, 'i');                                              // highway gate
  set(5, 44, 'k'); set(43, 44, 'k'); set(60, 44, 'z'); set(72, 39, '$');

  // ---------- rows 47-54: the desert ----------
  rect(1, 47, 82, 8, ':');
  for (const [cx, cy] of [[8, 49], [16, 52], [24, 48], [44, 50], [52, 53], [58, 48], [74, 52], [79, 48], [12, 53], [64, 53]]) set(cx, cy, 'C');
  rect(30, 49, 8, 4, '#'); set(33, 53, '9');                     // Tuco's shack
  set(70, 50, '5'); set(67, 50, 'O');                            // desert gate + RV
  set(10, 52, 'k'); set(78, 53, 'k'); set(40, 51, '$');

  // border last
  rect(0, 0, W, 1, 'F'); rect(0, H - 1, W, 1, 'F');
  rect(0, 0, 1, H, 'F'); rect(W - 1, 0, 1, H, 'F');
  return g.map(r => r.join(''));
}

const WORLD_HINTS = [
  'TEACH CLASS AT THE HIGH SCHOOL (NW)',
  'YOUR SHIFT AT THE CAR WASH (W)',
  'GO TO THE HOSPITAL (N)',
  'MEET HANK AT WALTS HOUSE (NW)',
  'JESSE: THE HARDWARE STORE (E)',
  'DESERT GATE (S): FIRST COOK',
  'THE CORNER BY THE METH HOUSE',
  'TUCOS HIDEOUT (SE)',
  'THE WAREHOUSE (SE)',
  'TUCOS SHACK (S DESERT)',
  'THE SUPERMARKET (E)',
  'LOS POLLOS HERMANOS',
  'HIGHWAY GATE (SE): THE DEAL',
  'THE LAUNDROMAT (SW)',
  'THE LAUNDROMAT (SW)',
  'SUPERMARKET PARKING LOT',
  'CASA TRANQUILA (SW)',
  'THE TENTED HOUSES',
  'DESERT GATE (S): TRAIN JOB',
  'THE SCRAPYARD',
  'DESERT GATE (S): MEET HANK',
  'DESERT GATE (S): FINISH IT',
];

// door factory: launches its campaign mission (with optional gate)
function worldDoor(levels, name, need, hint) {
  return { i: {
    sprite: 'door', label: 'E: ' + name, door: levels, need,
    onUse(G, it) {
      if (levels.indexOf(G.campaign) >= 0) {
        if (need && !need(G)) { say(hint || 'NOT READY YET', 2.2); AUDIO.sfx.denied(); return; }
        G.worldPos = { x: G.player.x, y: G.player.y };
        startLevel(G.campaign);
      } else if (G.campaign < levels[0]) {
        say('NOT YET. FOLLOW THE FLASHING MARKER', 1.6);
      } else {
        say('NOTHING MORE FOR YOU HERE', 1.5);
      }
    },
  } };
}

// npc factory: quips may be an array or a function of G (evolving dialog)
function worldNpc(sprite, name, lines) {
  return { i: {
    sprite, label: 'E: ' + name,
    onUse(G, it) {
      const arr = typeof lines === 'function' ? lines(G) : lines;
      it.visits = (it.visits || 0) + 1;
      say(arr[(it.visits - 1) % arr.length], 2.4);
    },
  } };
}

const RACE_CHECKPOINTS = [[30, 17], [55, 26], [70, 17]];

const WORLD = {
  name: 'ALBUQUERQUE',
  epi: 'NEW MEXICO, USA',
  story: ['EXPLORE THE CITY.', 'THE FLASHING MARKER SHOWS', 'YOUR NEXT MOVE.', 'TALK TO EVERYONE. (E)', '', 'PRESS T TO SWITCH CHARACTER', 'ONCE YOU KNOW JESSE.'],
  world: true,
  gun: false,
  objective: G => {
    if (G.campaign === 9 && !G.worldFlags.soldTuco) {
      return (G.worldFlags.cooks || 0) < 2 ? 'COOK 2 BATCHES (DESERT GATE) - ' + (G.worldFlags.cooks || 0) + '/2'
        : 'SELL TO TUCO AT THE SCRAPYARD (S)';
    }
    if (G.campaign === 11 && (G.worldFlags.cooks || 0) < 3) return 'COOK ONE MORE BATCH (DESERT GATE)';
    return 'NEXT: ' + (WORLD_HINTS[G.campaign] || 'ENJOY THE CITY');
  },
  isDone() { return false; },
  tiles: {
    'F': 'fence', ',': 'grass', '.': 'walk', '=': 'roadlin', '-': 'road',
    ':': 'sand', '~': 'pool', '%': 'wallhome', '&': 'labwall', '#': 'brick',
    'T': 'tent', 'C': 'cactus', 'A': 'car', '*': 'scrap',
    'b': 'roadln2', 'c': 'stairs', 'd': 'rock', 'h': 'car', 'j': 'car3',
  },
  labels: [
    [10, 3, 'WALTS HOUSE'], [28, 3, 'HANKS HOUSE'], [50, 3, 'JESSES HOUSE'], [72, 3, 'GALES APT'],
    [10, 11, 'HIGH SCHOOL'], [30, 11, 'DEA'], [52, 11, 'HOSPITAL'], [72, 11, 'BANK'],
    [8, 20, 'A1A CAR WASH'], [28, 20, 'SAUL'], [36, 20, 'LOS POLLOS'], [50, 20, 'SUPERMARKET'], [70, 20, 'HARDWARE'],
    [9, 29, 'LAUNDROMAT'], [28, 29, 'VAMANOS PEST'], [36, 29, 'FUMIGATION'], [47, 29, 'FUMIGATION'],
    [54, 29, 'METH HOUSE'], [69, 29, 'TUCOS'], [78, 29, 'WAREHOUSE'],
    [12, 38, 'CASA TRANQUILA'], [27, 38, 'COMBOS'], [51, 38, 'SCRAPYARD'], [81, 36, 'HIGHWAY'],
    [34, 49, 'THE SHACK'], [70, 49, 'DESERT'],
  ],
  start(G) {
    // remove hidden crystals already found; hide Pollos before its reveal
    G.pickups = G.pickups.filter(pk => !(pk.kind === 'hcrystal' && G.worldFlags['cr' + pk.x + '_' + pk.y]));
    for (const it of G.inter) {
      if (it.pollos && G.campaign < 11) it.hidden = true;
      if (it.jesseRv && G.campaign < 5) it.hidden = true;
      if (it.tucoSale && G.campaign > 9) it.hidden = true;       // Tuco is gone
      if (it.bogdan && G.worldFlags.carwashOwned) it.hidden = true;
    }
  },
  tick(G, dt) {
    if (G.vars.race) {
      G.vars.race.t -= dt;
      if (G.vars.race.t <= 0) {
        G.vars.race = null;
        for (const pk of G.pickups) if (pk.kind === 'chk') pk.taken = true;
        say('TOO SLOW! TRY AGAIN', 2);
        AUDIO.sfx.denied();
      }
    }
  },
  onPickup(G, pk) {
    if (pk.kind === 'hcrystal') {
      G.worldFlags['cr' + pk.x + '_' + pk.y] = 1;
      G.worldFlags.crystals = (G.worldFlags.crystals || 0) + 1;
      G.money += 100;
      AUDIO.sfx.crystal();
      floatText(pk.x, pk.y, 'CRYSTAL ' + G.worldFlags.crystals + '/8');
      if (G.worldFlags.crystals >= 8) { G.money += 1000; say('ALL 8 CRYSTALS! BONUS +$1000', 3); }
    } else if (pk.kind === 'chk') {
      AUDIO.sfx.pickup();
      if (G.vars.race) {
        G.vars.race.i++;
        if (G.vars.race.i >= RACE_CHECKPOINTS.length) {
          G.vars.race = null;
          const first = !G.worldFlags.race;
          G.worldFlags.race = 1;
          G.money += first ? 300 : 100;
          say('RACE COMPLETE! +$' + (first ? 300 : 100), 2.5);
          AUDIO.sfx.jingle();
        }
      }
    }
  },
  things: {
    '$': { p: 'cash' },
    'k': { p: 'hcrystal', extra: { sprite: 'crystal' } },
    // ---- campaign doors ----
    '0': worldDoor([0], 'HIGH SCHOOL'),
    '3': worldDoor([3], 'WALTS HOUSE'),
    '2': worldDoor([2], 'HOSPITAL'),
    '4': worldDoor([4], 'HARDWARE STORE'),
    '6': worldDoor([6], 'THE CORNER'),
    '7': worldDoor([7], 'TUCOS HIDEOUT'),
    '8': worldDoor([8], 'WAREHOUSE'),
    '9': worldDoor([9], 'TUCOS SHACK', G => !!G.worldFlags.soldTuco, 'FIRST: 2 COOKS + SELL AT THE SCRAPYARD'),
    'u': worldDoor([10], 'SUPERMARKET'),
    'i': worldDoor([12], 'HIGHWAY'),
    'n': worldDoor([13, 14], 'LAUNDROMAT'),
    'o': worldDoor([15], 'PARKING LOT'),
    'q': worldDoor([16], 'CASA TRANQUILA'),
    // ---- multi-purpose doors ----
    '1': { i: { sprite: 'door', label: 'E: CAR WASH', door: [1],
      onUse(G, it) {
        if (G.campaign === 1) { G.worldPos = { x: G.player.x, y: G.player.y }; startLevel(1); return; }
        if (G.campaign < 1) { say('NOT YET. FOLLOW THE FLASHING MARKER', 1.6); return; }
        if (G.campaign >= 14) {
          if (!G.worldFlags.carwashOwned) {
            if (G.money >= 50000) {
              G.money -= 50000; G.worldFlags.carwashOwned = 1;
              AUDIO.sfx.jingle(); say('SKYLER BOUGHT THE CAR WASH! (-$50000)', 3);
            } else say('SKYLER WANTS TO BUY THIS PLACE: $50000', 2.5);
            return;
          }
          G.worldPos = { x: G.player.x, y: G.player.y };
          startSide(SIDE_WASH);
          return;
        }
        say('BOGDAN SAYS YOU ARE FIRED, BY THE WAY', 2);
      } } },
    '5': { i: { sprite: 'door', label: 'E: DESERT GATE', door: [5, 18, 20, 21],
      onUse(G, it) {
        const missions = [5, 18, 20, 21];
        if (missions.indexOf(G.campaign) >= 0) {
          G.worldPos = { x: G.player.x, y: G.player.y };
          startLevel(G.campaign);
        } else if (G.campaign > 5) {
          G.worldPos = { x: G.player.x, y: G.player.y };
          startSide(SIDE_COOK);
        } else say('NOTHING OUT THERE FOR YOU. YET.', 1.8);
      } } },
    'l': { i: { sprite: 'door', label: 'E: LOS POLLOS', pollos: true, door: [11],
      need: G => (G.worldFlags.cooks || 0) >= 3,
      onUse(G, it) {
        if (G.campaign === 11) {
          if ((G.worldFlags.cooks || 0) < 3) { say('GUS ONLY MEETS PROVEN COOKS (3 BATCHES)', 2.2); return; }
          G.worldPos = { x: G.player.x, y: G.player.y };
          startLevel(11);
          return;
        }
        if (G.campaign > 11) {
          if (G.money >= 100 && G.hp < G.maxHp) {
            G.money -= 100; G.hp = G.maxHp;
            AUDIO.sfx.pickup(); say('CRISPY, DISCREET. FULL HP. (-$100)', 2);
          } else say('WE SERVE CHICKEN AND DISCRETION.', 2.2);
        }
      } } },
    't': { i: { sprite: 'door', label: 'E: TENTED HOUSE', door: [17],
      onUse(G, it) {
        if (G.campaign === 17) { G.worldPos = { x: G.player.x, y: G.player.y }; startLevel(17); return; }
        if (G.campaign > 17) { G.worldPos = { x: G.player.x, y: G.player.y }; startSide(SIDE_PEST); return; }
        say('FUMIGATION IN PROGRESS. KEEP OUT.', 2);
      } } },
    'y': { i: { sprite: 'door', label: 'E: SCRAPYARD', door: [19],
      onUse(G, it) {
        if (G.campaign === 19) { G.worldPos = { x: G.player.x, y: G.player.y }; startLevel(19); return; }
        say('RUSTY CARS AS FAR AS THE EYE CAN SEE', 2);
      } } },
    'e': { i: { sprite: 'tuco', label: 'E: MEET TUCO', tucoSale: true,
      onUse(G, it) {
        if (G.campaign === 9 && !G.worldFlags.soldTuco) {
          if ((G.worldFlags.cooks || 0) < 2) { say('TUCO WANTS 2 BATCHES. COOK FIRST.', 2.2); AUDIO.sfx.denied(); return; }
          cut(['TUCO SNORTS THE PRODUCT.', '', 'TUCO: BLUE? ITS BLUE!', 'TIGHT TIGHT TIGHT!', '', 'HE PAYS $4000... AND INVITES', 'YOU TO HIS SHACK. ITS NOT', 'REALLY AN INVITATION.'], g => {
            g.money += 4000;
            g.worldFlags.soldTuco = 1;
            AUDIO.sfx.cash();
          });
        } else say('TUCO: WHAT ARE YOU LOOKING AT?', 2);
      } } },
    'r': { i: { sprite: 'arrow', label: 'E: STREET RACE',
      onUse(G, it) {
        if (G.vars.race) { say('RACE IS ON! HIT THE MARKERS!', 1.5); return; }
        G.vars.race = { t: 40, i: 0 };
        for (const [tx, ty] of RACE_CHECKPOINTS) {
          G.pickups.push(makePickup('chk', tx * TS + 8, ty * TS + 8, { sprite: 'arrow' }));
        }
        say('GO! 3 MARKERS, 40 SECONDS!', 2);
        AUDIO.sfx.alarm();
      } } },
    // ---- pedestrians (Jesse can deal to them) ----
    'z': { i: { sprite: 'ped1', label: 'E: TALK',
      onUse(G, it) {
        if (G.playerChar === 'jesse') {
          if (it.used) { say('ALREADY SOLD TO THIS ONE', 1.5); return; }
          if ((G.worldFlags.stock || 0) > 0) {
            it.used = true;
            G.worldFlags.stock--;
            G.money += 100;
            AUDIO.sfx.cash(); floatText(it.x, it.y, '$100');
            say('SOLD. STOCK LEFT: ' + G.worldFlags.stock, 1.6);
          } else say('NO PRODUCT LEFT, YO. COOK FIRST.', 1.8);
        } else {
          const quips = ['NICE WEATHER, HUH?', 'THIS TOWN GETS WEIRDER EVERY YEAR.', 'DID YOU HEAR ABOUT THAT BLUE STUFF?'];
          say(quips[Math.floor(Math.random() * quips.length)], 2);
        }
      } } },
    // ---- people ----
    'S': worldNpc('skyler', 'SKYLER', G =>
      G.campaign < 2 ? ['SKYLER: DONT FORGET THE PAYCHECK.', 'SKYLER: WE WILL MANAGE. SOMEHOW.']
      : G.campaign < 10 ? ['SKYLER: YOU HAVE BEEN... DIFFERENT, WALT.', 'SKYLER: WHERE DO YOU GO ALL DAY?']
      : G.worldFlags.carwashOwned ? ['SKYLER: THE CAR WASH BOOKS BALANCE. BARELY.', 'SKYLER: HAVE AN A1 DAY.']
      : ['SKYLER: I HAVE A PLAN. IT INVOLVES', 'SKYLER: THIS CAR WASH. AND $50000.']),
    'M': worldNpc('marie', 'MARIE', G =>
      G.campaign < 15 ? ['MARIE: EVERYTHING IS BETTER IN PURPLE.', 'MARIE: HANK IS SO CLOSE TO A BIG CASE.']
      : ['MARIE: HANK SURVIVED THOSE MONSTERS.', 'MARIE: I PAINTED THE HOSPITAL ROOM PURPLE.']),
    'H': worldNpc('hankNpc', 'HANK', G =>
      G.campaign < 4 ? ['HANK: WANNA COME ON A RIDE ALONG, BUDDY?', 'HANK: DEA! EVERYBODY DOWN! HA!']
      : G.campaign < 10 ? ['HANK: SOME PSYCHO CALLED HEISENBERG', 'HANK: IS COOKING BLUE GLASS. I WILL FIND HIM.']
      : G.campaign < 20 ? ['HANK: THE BLUE STUFF IS BACK. EVERYWHERE.', 'HANK: WANNA SEE MY MINERALS? NOT ROCKS.']
      : ['HANK: ...']),
    'W': worldNpc('waltjr', 'WALTER JR', G =>
      G.campaign < 3 ? ['JR: DAD! DID YOU HAVE BREAKFAST?', 'JR: CAN WE GET A REAL CAR?']
      : ['JR: WHY IS EVERYONE ACTING WEIRD?', 'JR: BREAKFAST IS THE MOST IMPORTANT MEAL.']),
    'K': worldNpc('skinny', 'SKINNY PETE', G =>
      G.campaign < 6 ? ['PETE: JESSE OWES ME TEN BUCKS, YO.']
      : ['PETE: THE BLUE STUFF IS STRAIGHT ART, YO.', 'PETE: I PLAY PIANO. FOR REAL.']),
    'B': worldNpc('badger', 'BADGER', [
      'BADGER: DUDE, I WROTE A STAR TREK SCRIPT.',
      'BADGER: THIS CORNER? PRIME REAL ESTATE.']),
    'Y': worldNpc('wendy', 'WENDY', [
      'WENDY: GOT ANY BLUE, SUGAR?',
      'WENDY: I ONLY WORK THIS SIDE OF THE STREET.']),
    'V': worldNpc('vamanos', 'VAMANOS PEST', G =>
      G.campaign < 17 ? ['VAMANOS: WE TENT HOUSES. NO QUESTIONS.']
      : ['VAMANOS: BEST COVER OPERATION IN TOWN, BOSS.']),
    'D': worldNpc('gale', 'GALE', G =>
      G.campaign < 14 ? ['GALE: I BREW COFFEE BY MASS SPECTROMETRY!', 'GALE: MAJESTIC... THE CHEMISTRY I MEAN.']
      : ['THE APARTMENT IS DARK.', 'NOBODY ANSWERS.']),
    'J': worldNpc('combo', 'COMBO', [
      'COMBO: THAT RV WAS MY MOMS, BRO.',
      'COMBO: 1400 BUCKS WELL SPENT.']),
    'G': worldNpc('saul', 'SAUL', G =>
      G.campaign < 8 ? ['SAUL: BETTER CALL SAUL! FIRST CONSULT FREE.']
      : ['SAUL: I KNOW A GUY WHO KNOWS A GUY.', 'SAUL: DID YOU KNOW YOU HAVE RIGHTS?']),
    'O': { i: { sprite: 'rv', label: 'THE KRYSTAL SHIP' } },
    'a': { i: { sprite: 'rv', label: 'THE KRYSTAL SHIP', jesseRv: true } },
    'p': { i: { sprite: 'pizza', label: 'E: ROOF PIZZA',
      onUse(G) { say('WALT: WHO THREW A PIZZA ON MY ROOF?!', 2.4); } }, tile: 'wallhome' },
    'g': (() => { const d = worldNpc('bogdan', 'BOGDAN', G =>
      G.campaign < 2 ? ['BOGDAN: YOU ARE LATE. WASH FASTER.', 'BOGDAN: WIPE DOWN, NO STREAKS.']
      : G.campaign < 14 ? ['BOGDAN: YOU QUIT ON ME, REMEMBER?', 'BOGDAN: NO REFUNDS. NO REHIRES.']
      : ['BOGDAN: THIS PLACE? NOT FOR SALE...', 'BOGDAN: ...UNLESS YOU HAVE $50000.']); d.i.bogdan = true; return d; })(),
    'R': { i: { sprite: 'door', label: 'E: GROCERIES $40',
      onUse(G) {
        if (G.money >= 40 && G.hp < G.maxHp) {
          G.money -= 40; G.hp = Math.min(G.maxHp, G.hp + 2);
          AUDIO.sfx.pickup(); say('FRESH PRODUCE. +2 HP.', 1.8);
        } else say('CLEAN-UP ON AISLE 5.', 1.8);
      } } },
    'Q': { i: { sprite: 'door', label: 'E: BANK',
      onUse(G) {
        if (!G.worldFlags.bank && G.money > 0) {
          const int_ = Math.floor(G.money * 0.1);
          G.worldFlags.bank = 1; G.money += int_;
          AUDIO.sfx.cash(); say('MONEY LAUNDERED! INTEREST +$' + int_, 2.2);
        } else say('BALANCE: $' + G.money + '. ALL CLEAN, SIR.', 2.2);
      } } },
    'f': { i: { sprite: 'cash', label: 'E: THE FUND',
      onUse(G) {
        if (!G.worldFlags.fund) {
          G.worldFlags.fund = 1; G.money += 500;
          AUDIO.sfx.cash(); say('THE FAMILY FUND: +$500', 2);
        } else say('THIS IS FOR THE FAMILY. ALL OF IT.', 2.2);
      } } },
  },
  map: [
    'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
    'F,,.$...........,,,.--.,,,,,,,,,,,,,,,,,.--.,,,,,,,,,,,,,,,,,.--.,,,,,,,,,,,,,,,k,,F',
    'F,,....~~~~~.f..,,,.--.,,............,,,.--.,,............%%%.--.,,,#########,,,,,,F',
    'F,,%%%.......%%%,,,.--.,,%%%%%...%%%%,,,.--.,,%%%%..%%%%..%%%.--.,,,D........,,,,,,F',
    'F,,%%%%%%%%%%%%%,,,.--.,,%%%%%%%%%%%%,,,.--.,,%%%%..%%%%..%%%.--.,,,########.,,,,,,F',
    'F,,%%%%%%%%%%%p%,,,.--.,,,..M%%%%%%%%,,,.--.,,%%%%%%%%%%.a%%%.--.,,,.........,,,,,,F',
    'F,,%%%%%%%%%....,,,.--.,,,...%%%%%,,,,,,.--.,,%%%%%%%%%%..,,,.--.,,,.########,,,,,,F',
    'F,,,%%%,,,3,..S.,,,.--.,,,...,,,,,,,,,,,.--.,,,...,,BK.,..,,,.--.,,,.....,,,,,,,,,,F',
    'F.........P.......z.--...................--...................--...................F',
    'Fbbbbbbbbbbbbbbbbbbb--bbbbbbbbbbbbbbbbbbb--bbbbbbbbbbbbbbbbbbb--bbbbbbbbbbbbbbbbbbbF',
    'F...................--...................--.......z...........--...................F',
    'F,,&&&&&&&&&&&&&&,,.--.,&&&&&&&&&&&.,,,,.--.,,#############,,.--.,,,##########,,%%$F',
    'F,,&&&&&&&&&&&&&&,,.--.,&&&&&&&&&&&...$,.--.,,#############,,.--.,,,##########,,%%$F',
    'F,,&&&&&&&&&&&&&&,,.--.,&&&&&&&&&&&.,,,,.--.,,#############,,.--.,,,##########,,%%kF',
    'F,,&&&&&&&&&&&&&&,,.--.,&&&&&&&&&&&.,,,,.--.,,#############,,.--.,,,##########,,,,,F',
    'F,,&&&&&&&&&&&&&&,,.--.,&&&&&&&&&&&.,,,,.--.,,#############,,.--.,,,##$$#$$###,,,,,F',
    'F,,,,,,,,,0,,,,r,,,.--.,......H.....,,,,.--.,,,,,,,,2,,,,,,,,.--.,,,,,..Q..,,,,,,,,F',
    'F...................--...................--...................--...................F',
    'Fbbbbbbbbbbbbbbbbbbb--bbbbbbbbbbbbbbbbbbb--bbbbbbbbbbbbbbbbbbb--bbbbbbbbbbbbbbbbbbbF',
    'F...................--........z..........--...................--...................F',
    'F,,,,,,,,,,,,,,,,,,.--.,########,#######.--.#############,,%%.--.,#########.......,F',
    'F,,,#########.A..,,.--.,########,#######.--.#############,,%%.--.,#########.jhjkh.,F',
    'F,..#########....,,.--.,##TTTTT#,#######.--.#############,,%%.--.,#########.......,F',
    'F,..#########.A..,,.--.,.......#,#######.--.#############,,%%.--.,#########.h.hjh.,F',
    'F,..#########....,,.--.,,......,,,,,,,,,.--.,,,,,,,,,,,,,,,,,.--.,............$...,F',
    'F,.,....1..g.,,...,.--.,,..G...,,,,,l,,,.--.,,A,u,,,R,,o,h,,,.--.,.jh.4.hjh.hjh.h.,F',
    'F...................--...................--...................--......z............F',
    'Fbbbbbbbbbbbbbbbbbbb--bbbbbbbbbbbbbbbbbbb--bbbbbbbbbbbbbbbbbbb--bbbbbbbbbbbbbbbbbbbF',
    'F...........z.......--...................--...................--...................F',
    'F,,############,%%%.--.,########,,TTTT,,.--.,TTTT,,%%%%%%,,,,.--.,######,,########,F',
    'F,,############,%%%.--.,#######k,,TTTT,,.--.,TTTT,,%%%%%%,,,,.--.,######,,########,F',
    'F,,############,%%%.--.,########,,TTTT,,.--.,TTTT,,%%%%%%,,,,.--.,######,,########,F',
    'F,,############,%%%.--.,########,,,,t,,,.--.,,,t,,,%%%%%%,,,,.--.,######,,########,F',
    'F,,############,,,,.--.,,,,,,,,,,,,,,,,,.--.,,,,,,,,,,,,,,,,,.--.,,,,,,,,,...#....,F',
    'F,,,,,,,,n,,,,,,,,,.--.,,,,V,,,,,,,,,,,,.--.,,,,,,,,,Y,,,,6,,.--.,,,7,,,,,...8....,F',
    'F...................--........................................--...................F',
    'Fbbbbbbbbbbbbbbbbbbb--bbbbbbbbbbbbbbbbbbb==bbbbbbbbbbbbbbbbbbb--bbbbbbbbbbbbbbbbbbbF',
    'F...................--........................................--.................i.F',
    'F,,,,%,,%,,%%,,%,,%.--.,%%%%%%%,,%%%%%,,.--.******..******,,,.--.,######,,%%%%%%%,,F',
    'F,,,,%%%%%%%%%%%%%%.--.,%%%%%%%,,%%%%%,,.--.******..******,,,.--.,######$,%%%%%%%,,F',
    'F,,,,%%%%%%%%%%%%%%.--.,%%%%%%%,,%%%%%,,.--.**..........**,,,.--.,######,,%%%%%%%,,F',
    'F,,,,%%%%%%%%%%%%%%.--.,%%%%%%%,,%%%%%,,.--.**......e...**,,,.--.,######,,%%%%%%%,,F',
    'F,,,,,,,...q...,,,,.--.,,,,J,,,,,,,,,,,,.--.**************,,,.--.,,,,,,,,,,,,,,,,,,F',
    'F,,,,,,..,,,,,..,,,.--.,,,,,,,,,,,,,,,,,.--.**y***********,,,.--.,,,,,,,,,,,,,,,,,,F',
    'F....k..............--...................--k................z.--...................F',
    'Fbbbbbbbbbbbbbbbbbbb--bbbbbbbbbbbbbbbbbbb--bbbbbbbbbbbbbbbbbbb--bbbbbbbbbbbbbbbbbbbF',
    'F..................................................................................F',
    'F::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::F',
    'F::::::d:::d::::::::::::C:::::::::::::::::::::::::::::::::C:::::::::::::::::d::C:::F',
    'F:::d:::C:::d:::::::::::::::::########:::dd::::::::::::::::::::::::::::::::::d:::::F',
    'F:d::::::::::ddd:::::d::d:::::########:d::::C::::::::::::::::::::::O::5:::::::::d::F',
    'F::::::::::::::d:d::::::::::::########::$::::::::::::::::::::::::::::::::::d:::::::F',
    'F:::::::::k:::::C:::::d::d::::########:::::d::::::::::::::::::::::::::::::C::::::::F',
    'F:::d:::d:::C::::::::::::::::::::9::::::::d:::::::::C:::::::::::C::::::d::d:::k::::F',
    'F::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::F',
    'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
  ],
};
