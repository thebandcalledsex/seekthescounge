

## Assets

### Key Differences Between Images and Sprites

| Feature                | Image                          | Sprite                          |
|------------------------|--------------------------------|---------------------------------|
| **Purpose**            | Static elements (e.g., background) | Dynamic or interactive objects |
| **Physics Support**    | No                            | Yes (if added via `physics.add.sprite`) |
| **Animation Support**  | No                            | Yes (if using a sprite sheet)  |
| **Positioning**        | Fixed                         | Can be moved, rotated, scaled  |

---

### When to Use Images vs. Sprites

#### Use Images:
- For static elements like backgrounds, UI, or decorations.
- When you don’t need physics or animation.

#### Use Sprites:
- For characters, enemies, or any object that moves or interacts.
- When you need animations or physics (e.g., gravity, collisions).


## Project Structure

├── Makefile
├── README.md
├── assets
├── dist
│   ├── bundle.js
│   └── bundle.js.LICENSE.txt
├── favicon.ico
├── index.dev.html
├── index.html
├── index.prod.html
├── package-lock.json
├── package.json
├── src
│   ├── entities
│   │   └── player.ts
│   ├── main.ts
│   └── scenes
│       └── game.ts
├── tsconfig.json
├── vite.config.ts
└── webpack.config.js

## Git Shenanigans

git remote set-url origin git@github.com:thebandcalledsex/thegamecalledsex.git







# Recommended Layer Structure for Tiled + Phaser

## Background layers (no collision)
- **Background** → sky, gradients, mountains, distant scenery
- **MidBackground** → trees, clouds, parallax elements

## Gameplay layers (collidable)
- **Ground** → main walkable tiles (marked `collides = true`)
- **Platforms** → floating or secondary collidable tiles
- **Walls** (optional) → vertical collidable surfaces, if separated from ground

## Decorative layers (no collision)
- **DecoBack** → props/details drawn behind player
- **DecoFront** → props/details drawn in front of player

## Interactive/object layers
- **Objects** → enemies, pickups, coins, triggers
- **Spawns** → player/enemy spawn points
- **Hazards** → spikes, lava, kill zones

---

## Parallax in Phaser

Phaser display objects use `scrollFactor` to scale how much they react to camera movement. The value is not clamped, so you can experiment with any non-negative (or even negative) number.

- `0`: layer stays fixed relative to the camera (skybox).
- `0 < factor < 1`: moves slower than the camera, so it reads as distant.
- `1`: matches the camera and the main gameplay layer.
- `> 1`: moves faster than the camera, useful for close foreground elements.

Phaser just multiplies the camera scroll by the factor, so mix and tweak values per layer to get the depth you want. `TileSprite` layers can still adjust `tilePosition` if you need an endless loop.

## Tips
- **Collision flagging**: in Tiled, set a tile property `collides = true` for ground/platform tiles.
- **Draw order**: Background → Ground/Platforms → Player → Foreground/DecoFront.
- **Parallax**: give background layers a scroll factor < 1 in Phaser (`layer.setScrollFactor(0.5)`).
- **Organization**: keep collidable gameplay separate from decoration so you don’t accidentally collide with art.
- **Depth control**: if needed, adjust `layer.setDepth(n)` in Phaser to force draw order.
- **Objects layer**: great for spawning dynamic entities (coins, enemies) by reading properties in Phaser.
