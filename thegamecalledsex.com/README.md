



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