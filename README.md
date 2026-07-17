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

## Files

- `index.html`, `style.css` — CRT-styled shell around a 320×240 canvas
- `js/sprites.js` — palette, pixel sprites, procedural tiles, 3×5 bitmap font
- `js/audio.js` — chiptune SFX and music loop (Web Audio)
- `js/levels.js` — 22 missions, side jobs, and the 84×56 city
- `js/game.js` — engine: loop, input, AI, collision, cut-scenes, HUD, screens
