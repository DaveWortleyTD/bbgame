# BREAKING BAD — The 8-Bit Game

A 1980s-style top-down pixel-art HTML5 game (320×240, 4:3, CRT shell).
Explore an open-world Albuquerque and play the whole story in order — from
teaching chemistry at J.P. Wynne to the machine gun in the trunk — as Walt,
Jesse, and Hank.

No build step, no dependencies, no external assets — all art, sound, and the
bitmap font are generated in code (canvas + Web Audio).

## Run

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Controls

| Key | Action |
|---|---|
| Arrows / WASD | Move / drive |
| Space / Z | Fire (when armed) |
| E / X | Interact (talk, sell, wash, siphon, plant...) |
| C | Throw fulminated mercury (when carried) |
| T | Switch Walt / Jesse in the open world (after meeting Jesse) |
| Enter | Start / advance story cards |
| M | Mute · 0 dev-skip mission |

Firing auto-aims at the nearest enemy roughly ahead of you (in range, in a
forward cone, with line of sight) — you still have to face a target, but a
near-miss facing still connects, like an old console shooter. Nothing in
your blind spot gets auto-targeted.

**Touch devices** get on-screen controls automatically (a D-pad or floating
joystick, plus FIRE/USE/BOMB buttons); tapping the screen also advances
title/story/end cards, so the whole game is playable without a keyboard.
The gear icon (top-right of the screen) opens **control settings** — swap
D-pad for a floating joystick, resize the buttons, or turn on-screen
controls on/off — saved in the browser. `?touchui=1` forces controls on
for testing on a mouse-only device.

Dev shortcuts: `?level=N` jumps to mission N (1-22); `?world` (+`&at=X,Y`)
drops you into the city.

## The story (22 missions, launched from the city)

Classroom → Car Wash shift (and collapse) → the Diagnosis → Ride Along with
Hank → Jesse's shopping list + the RV → the First Cook and the Krazy-8 ambush
→ Slingin' in the red car → Tuco (lose as Jesse, mercury as Walt) → the
Methylamine Heist → cook 2 batches + sell to Tuco at the scrapyard → Tuco's
Shack (poison as Walt, shoot-out as Hank) → the Fugue State walk of shame →
Meet Gus (after one more cook) → the $1.6M highway Deal → the Superlab with
Gale → Full Measure (race to Gale's) → One Minute (Hank vs the Cousins) →
Face Off (Casa Tranquila) → Vamanos Pest cooks → Dead Freight train heist →
Cartel Battle at the scrapyard → Ozymandias (a fight Hank can't win) →
Felina. Game over.

## The open world

Walt's house (pool + the fund), Hank's, Jesse's, Gale's apartment, high
school (with a street race), DEA, hospital, bank, the A1A car wash (Skyler
buys it for $50k late-game — then it launders money), Saul, Los Pollos
(unlocks with the story; meals heal), supermarket + parking lot, hardware
store, laundromat, Vamanos Pest and tented fumigation houses (repeatable
cooks), the meth house corner, Tuco's hideout, a warehouse, Combo's house,
the scrapyard, a highway gate, and the desert (repeatable RV cooks, Tuco's
shack, the train, To'hajiilee, and the compound). Plus filler houses,
pedestrians (Jesse can deal product to them — cooking builds stock), 8
hidden crystals ($1000 bonus), and townsfolk whose dialog changes as the
story advances.

## Level editor

Open `editor.html` (linked under the game screen). Pick any of the 31 maps —
missions, their part-2/phase-2 follow-ups, side jobs, or the whole open
world — and paint with the palette: left-drag paints, right-drag erases,
alt-click picks the char under the cursor, Ctrl+Z undoes.

- **Save to game** stores the map in your browser; the game applies it on
  next load (same server), so refresh the game tab to playtest. **Revert
  map** / **clear all saved edits** undo that.
- **Map as code** shows the `map:` snippet — paste it into `js/levels.js`
  to make the change permanent for everyone.
- **Tile library** lets any map borrow any tile from any level — pick one
  and it's auto-assigned a free map character for the current map.
- **New tile / edit** opens a 16x16 pixel designer using the game palette:
  paint, copy from an existing tile, mark it solid or walkable, save, and
  it joins the library (and works in-game via the same save-to-game flow).
  Every tile — including the game's built-in ones, not just custom
  creations — has an **edit** link, so you can repaint `sand`, `brick`,
  `rock`, etc. directly; the change applies everywhere that tile is used.
  A **revert to original** button undoes it and restores the shipped art.
- **Character library** works the same way for every character/sprite in
  the game — Walt, Jesse, every NPC and enemy, the RV, pickups — with an
  **edit** link in the library and directly in any map's palette next to
  the enemy/ally/pickup/object it belongs to. The designer adapts to each
  sprite's real size (8×8 up to 16×20), and **new character** lets you
  pick a canvas size from scratch. Saving overrides that name everywhere
  it's used in the actual game (title screen, all missions, the world);
  editing the RV or a vehicle automatically regenerates its four turning
  directions from the new art. Built-ins get the same **revert to
  original** safety net as tiles.

## Files

- `index.html`, `style.css` — CRT-styled shell around a 320×240 canvas
- `js/sprites.js` — palette, pixel sprites, procedural tiles, 3×5 bitmap font
- `js/audio.js` — chiptune SFX and music loop (Web Audio)
- `js/levels.js` — 22 missions, side jobs, and the 84×56 city
- `js/game.js` — engine: loop, input, AI, collision, cut-scenes, HUD, screens
