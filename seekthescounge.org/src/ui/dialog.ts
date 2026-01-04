import Phaser from "phaser";
import {
    DIALOG_SNAP_CLOSE_DURATION,
    DIALOG_SNAP_OPEN_DURATION,
    DIALOG_FONT_SIZE,
    DIALOG_CHAR_WIDTH_GUESS,
} from "../constants";

// Theme for the pixel panel.
export interface DialogTheme {
    fill: number; // panel fill color
    borderOuter: number; // outer border color
    borderInner?: number; // optional inner border color (set undefined to skip)
    borderOuterPx?: number;
    borderInnerPx?: number;
}

// Construction options for the dialog manager/box.
export interface DialogConfig {
    rows?: number; // visible text rows per page (default 2)
    lineHeight?: number; // pixel line height (bitmap-ish spacing)
    margin?: number; // inner padding around text
    cursorPad?: number; // room reserved for the "next" cursor on bottom line
    edgeMargin?: number; // distance from screen edge
    speed?: number; // chars per tick for typewriter
    tickDelay?: number; // ms delay per tick (default 30)
    maxWidth?: number; // optional fixed wrap width (px), else auto from panel width
    theme?: DialogTheme; // panel colors
    useBitmapFontKey?: string; // if provided and loaded, uses BitmapText
}

// Per-call options when showing dialog.
export interface SayOptions {
    text: string;
    speed?: number; // override global speed
    choices?: string[]; // optional menu choices
    onChar?: (char: string) => void; // tiny hook per typed char (e.g., blip sfx)
}

// Simple facade to own a single dialog box.
export default class DialogManager {
    private scene: Phaser.Scene;
    private cfg: DialogConfig;
    private box?: DialogBox;
    private lifecycle: Promise<void>;

    constructor(scene: Phaser.Scene, cfg: DialogConfig = {}) {
        this.scene = scene;
        this.cfg = cfg;
        this.lifecycle = Promise.resolve();
    }
    // Show dialog; resolves when finished or a choice is selected. Returns selected index or void.
    async say(opts: SayOptions): Promise<number | void> {
        // Ensure calls run sequentially so each dialog fully tears down before the next.
        const waitForPrev = this.lifecycle.catch(() => {});
        const run = (async () => {
            await waitForPrev;
            this.destroyBox();
            const box = new DialogBox(this.scene, this.cfg);
            this.box = box;
            try {
                return await box.show(opts);
            } finally {
                if (this.box === box) {
                    this.box = undefined;
                }
                box.destroy();
            }
        })();
        this.lifecycle = run.then(() => {}, () => {});
        return run;
    }
    hide() {
        this.destroyBox();
    }
    setVisible(v: boolean) {
        this.box?.setVisible(v);
    }
    get active() {
        return Boolean(this.box?.active);
    }

    private destroyBox() {
        if (this.box) {
            this.box.destroy();
            this.box = undefined;
        }
    }
}

// Camera-fixed dialog box implementation.
class DialogBox {
    private scene: Phaser.Scene;
    private cfg: Required<DialogConfig>;
    private container: Phaser.GameObjects.Container;

    // Panel + text + UI
    private panel: PixelPanel;
    private textObj!: Phaser.GameObjects.BitmapText | Phaser.GameObjects.Text;
    private advanceCursor!: Phaser.GameObjects.BitmapText | Phaser.GameObjects.Text;

    // Choices (rendered on demand)
    private choiceTexts: (Phaser.GameObjects.BitmapText | Phaser.GameObjects.Text)[] = [];
    private choiceCursor?: Phaser.GameObjects.BitmapText | Phaser.GameObjects.Text;

    // Cursor tween for
    private cursorTween?: Phaser.Tweens.Tween;
    private onPointerDown!: () => void;
    private onResize!: () => void;

    // State
    public active = false;
    private awaitingAdvance = false;
    private skipping = false;
    private destroyed = false;

    // Input (local; you can later wire to your InputController)
    private keys!: {
        confirm: Phaser.Input.Keyboard.Key;
        skip: Phaser.Input.Keyboard.Key;
        up: Phaser.Input.Keyboard.Key;
        down: Phaser.Input.Keyboard.Key;
    };

    constructor(scene: Phaser.Scene, cfg: DialogConfig) {
        this.scene = scene;

        this.cfg = {
            rows: cfg.rows ?? 3,
            lineHeight: cfg.lineHeight ?? 14,
            margin: cfg.margin ?? 8,
            cursorPad: cfg.cursorPad ?? 6,
            edgeMargin: cfg.edgeMargin ?? 4,
            speed: cfg.speed ?? 2,
            tickDelay: cfg.tickDelay ?? 60,
            maxWidth: cfg.maxWidth ?? 0, // 0 = auto
            useBitmapFontKey: cfg.useBitmapFontKey ?? "pixel",
            theme: cfg.theme ?? {
                fill: 0x111122,
                borderOuter: 0xffffff,
                borderInner: undefined, // set a color like 0x6ab3ff to enable
                borderOuterPx: 2,
                borderInnerPx: 1,
            },
        };

        // Root UI container (camera-fixed)
        this.container = scene.add.container(0, 0).setDepth(1000).setVisible(false);
        this.container.setScrollFactor(0);

        // Pixel panel sized in layout()
        this.panel = new PixelPanel(scene, 10, 10, this.cfg.theme);
        this.panel.node.setScrollFactor(0);
        this.container.add(this.panel.node);

        // Create text objects (bitmap preferred)
        const useBitmap =
            !!this.cfg.useBitmapFontKey && scene.cache.bitmapFont.exists(this.cfg.useBitmapFontKey);
        if (useBitmap) {
            const bt = scene.add.bitmapText(0, 0, this.cfg.useBitmapFontKey, "", 8);
            bt.setLetterSpacing(0);
            this.textObj = bt;
        } else {
            this.textObj = scene.add.text(0, 0, "", {
                fontFamily: "monospace",
                fontSize: DIALOG_FONT_SIZE,
                wordWrap: { width: 1, useAdvancedWrap: true },
            });
            (this.textObj as Phaser.GameObjects.Text).setLineSpacing(0);
        }
        this.textObj.setOrigin(0, 0).setScrollFactor(0);
        this.container.add(this.textObj);

        // Advance cursor (blinking "▶")
        if (useBitmap) {
            this.advanceCursor = scene.add.bitmapText(0, 0, this.cfg.useBitmapFontKey, "▶", 8);
        } else {
            this.advanceCursor = scene.add.text(0, 0, "▶", {
                fontFamily: "monospace",
                fontSize: "12px",
            });
        }
        this.advanceCursor.setAlpha(0).setScrollFactor(0);
        this.container.add(this.advanceCursor);

        // Blink tween: start PAUSED; we’ll control it explicitly
        this.advanceCursor.setAlpha(0);
        this.cursorTween = scene.tweens.add({
            targets: this.advanceCursor,
            alpha: { from: 0, to: 1 },
            duration: 500,
            yoyo: true,
            repeat: -1,
            paused: true,
        });

        // Keyboard (local)
        this.keys = {
            confirm: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
            skip: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Z),
            up: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
            down: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
        };

        // Pointer acts as confirm
        this.onPointerDown = () => this.tryAdvance();
        scene.input.on("pointerdown", this.onPointerDown);

        // Layout + resize handling
        this.layout();
        this.onResize = () => this.layout();
        this.scene.scale.on("resize", this.onResize);
    }

    private animateHideSnapShut(): Promise<void> {
        return new Promise((res) => {
            // Anchor bottom edge by moving y while shrinking
            const startY = this.container.y;
            const h = this.panel.height;

            this.scene.tweens.add({
                targets: this.container,
                scaleY: 0,
                y: startY + h * 0.5, // shift so bottom edge visually "stays"
                duration: DIALOG_SNAP_CLOSE_DURATION,
                ease: "bounce.easeIn",
                onComplete: () => {
                    this.container.setScale(1).setY(startY); // reset
                    this.hide();
                    res();
                },
            });
        });
    }

    private animateShowSnapOpen(): Promise<void> {
        return new Promise((res) => {
            const startY = this.container.y;
            const h = this.panel.height;
            this.container.setScale(1, 0);
            this.container.setY(startY + h * 0.5);
            this.container.setVisible(true);

            this.scene.tweens.add({
                targets: this.container,
                scaleY: 1,
                y: startY,
                duration: DIALOG_SNAP_OPEN_DURATION,
                ease: "bounce.easeOut",
                onComplete: () => {
                    res();
                },
            });
        });
    }

    private cursorShow() {
        this.advanceCursor.setAlpha(1);
        this.cursorTween?.resume();
    }
    private cursorHide() {
        this.cursorTween?.pause();
        this.advanceCursor.setAlpha(0);
    }

    // Show dialog text; resolves when finished or selection made.
    async show({ text, speed, choices, onChar }: SayOptions): Promise<number | void> {
        // Short delay to avoid jarring instant pop-up
        await delay(this.scene, 450);

        // Animate dialog box opening
        await this.animateShowSnapOpen();

        this.active = true;
        this.setVisible(true);

        const wrapW = this.innerWidth();
        let remaining = text;
        let chosen: number | void = undefined;

        while (remaining.length > 0) {
            this.awaitingAdvance = false;
            remaining = await this.typePage(remaining, speed ?? this.cfg.speed, wrapW, onChar);

            if (remaining.length > 0) {
                this.positionAdvanceCursor();
                this.cursorShow(); // ← blink only when there’s a next page
                this.awaitingAdvance = true;
                await waitForAdvance(this.scene, this);
                this.textObj.setText("");
                this.cursorHide(); // ← stop blink immediately after advance
            } else {
                this.cursorHide(); // ← final page: no arrow
            }
        }

        if (choices && choices.length > 0) {
            chosen = await this.presentChoices(choices);
        } else {
            this.awaitingAdvance = true;
            await waitForAdvance(this.scene, this); // final confirm
        }

        // animate dialog box closing
        await this.animateHideSnapShut();

        return chosen;
    }

    hide() {
        this.setVisible(false);
        this.active = false;
    }
    setVisible(v: boolean) {
        this.container.setVisible(v);
    }

    // -------------------- Layout & sizing --------------------

    // Compute and apply layout for camera-fixed bottom box sized to 2 rows.
    private layout() {
        const cam = this.scene.cameras.main;
        const w = Math.floor(cam.width);
        const panelH =
            this.cfg.margin * 2 + this.cfg.lineHeight * this.cfg.rows + this.cfg.cursorPad;

        // Position container so panel sits near bottom with edge margin
        const y = Math.floor(cam.height - panelH - this.cfg.edgeMargin);
        const x = Math.floor(this.cfg.edgeMargin);

        // --- half-width centered layout ---
        const panelW = Math.floor(w * 0.5); // 50 % of screen width
        const panelX = Math.floor((w - panelW) / 2); // center horizontally
        const panelY = Math.floor(cam.height - panelH - this.cfg.edgeMargin);

        this.container.setPosition(panelX, panelY);
        this.panel.resize(panelW, panelH);
        this.panel.redraw();

        // Text origin at top-left inside panel
        this.textObj.setPosition(this.cfg.margin, this.cfg.margin);

        // Ensure correct wrap width on Phaser Text/BitmapText
        const wrapW = this.innerWidth();
        if (!(this.textObj instanceof Phaser.GameObjects.BitmapText)) {
            this.textObj.setWordWrapWidth(wrapW - 1, true);
        }

        // Place cursor (will be shown after typing)
        this.positionAdvanceCursor();
    }

    // Inner content width (panel minus margins).
    private innerWidth(): number {
        const w = this.panel.width - this.cfg.margin * 2 - this.cfg.cursorPad; // ← subtract cursorPad
        return Math.floor(this.cfg.maxWidth > 0 ? Math.min(this.cfg.maxWidth, w) : w);
    }

    // Bottom-right "next" cursor position inside the panel.
    private positionAdvanceCursor() {
        const cw = 8; // approximate glyph size of the cursor
        const ch = 10;
        const x = this.panel.width - this.cfg.margin - cw;
        const y = this.panel.height - this.cfg.margin - ch;
        this.advanceCursor.setPosition(x, y);
    }

    // -------------------- Typing & paging --------------------

    private async typePage(
        remainingText: string,
        speed: number,
        wrapW: number,
        onChar?: (c: string) => void,
    ): Promise<string> {
        // reset visuals for this page
        this.advanceCursor.setAlpha(0);
        this.skipping = false;

        const maxCols = Math.max(1, Math.floor(wrapW / DIALOG_CHAR_WIDTH_GUESS));
        const maxRows = this.cfg.rows;

        // tokenize: words and spaces
        const tokens = remainingText.match(/(\S+|\s+)/g) ?? [];
        let ti = 0;

        // track current line fill and row index from our own explicit '\n's
        let lineCols = 0; // columns in current line (using charWidthGuess)
        let rowIdx = 0; // 0-based

        const append = (str: string) => {
            const cur = (this.textObj.text || "") + str;
            this.textObj.setText(cur);

            // recompute lineCols/rowIdx from our explicit newlines
            const parts = cur.split("\n");
            rowIdx = Math.max(0, parts.length - 1);
            lineCols = (parts[parts.length - 1] ?? "").length;
        };

        const handleSkip = () => {
            this.skipping = true;
        };
        this.keys.skip.on("down", handleSkip);

        while (ti < tokens.length) {
            const tok = tokens[ti];

            // If this token is a word, decide wrapping BEFORE we start typing it
            const isSpace = /^\s+$/.test(tok);
            if (!isSpace) {
                const need = tok.length;
                const rem = maxCols - lineCols;

                // If it doesn't fit on this line…
                if (lineCols > 0 && need > rem) {
                    // If we still have vertical space, soft-break to next line
                    if (rowIdx < maxRows - 1) {
                        append("\n");
                        // lineCols resets via append()
                    } else {
                        // No vertical space left → stop page here and return leftovers
                        break;
                    }
                }
            }

            // Type this token char-by-char (or fast-forward when skipping)
            let k = 0;
            while (k < tok.length) {
                const chunk = this.skipping ? tok.slice(k) : tok[k];
                // If a newline chunk would exceed rows, stop before appending
                if (chunk.includes("\n") && rowIdx >= maxRows - 1) {
                    // don’t append; finish page and leave token remainder for next page
                    // keep k where it is so the remainder of this token gets returned
                    k = tok.length; // ensure we treat as leftover; ti not advanced
                    break;
                }

                append(chunk);
                if (onChar) onChar(chunk);
                // // stop when row limit reached
                // const currentLines = (this.textObj.text.match(/\n/g)?.length ?? 0) + 1;
                // if (currentLines >= this.cfg.rows) {
                //     break;
                // }
                k += this.skipping ? chunk.length : 1;

                // If we somehow reached a new row count limit exactly, also stop
                if (rowIdx >= maxRows) {
                    // rollback isn’t needed because we only create new rows via our own '\n'
                    break;
                }

                await delay(this.scene, this.cfg.tickDelay);
            }

            // If we exited early because page filled, stop before consuming this token
            if (
                rowIdx >= maxRows - 0 /* hit limit */ &&
                (ti < tokens.length - 1 || k < tok.length)
            ) {
                // leave current token (or its remainder) in leftovers
                break;
            }

            // Token fully consumed → advance to next token
            ti++;
        }

        this.keys.skip.off("down", handleSkip);

        // Leftover text (everything we didn’t consume on this page)
        const leftovers = tokens.slice(ti).join("");
        return leftovers;
    }

    // -------------------- Choices --------------------

    private async presentChoices(choices: string[]): Promise<number> {
        this.hideChoices();

        const useBitmap = this.textObj instanceof Phaser.GameObjects.BitmapText;
        const startY = Math.min(
            // ensure list stays inside panel
            this.cfg.margin + this.cfg.lineHeight, // below text rows
            Math.max(
                this.cfg.margin,
                this.panel.height - this.cfg.margin - choices.length * this.cfg.lineHeight,
            ),
        );

        // Render entries
        choices.forEach((label, idx) => {
            const y = startY + idx * this.cfg.lineHeight;
            const obj = useBitmap
                ? this.scene.add.bitmapText(
                      this.cfg.margin + 12,
                      y,
                      (this.textObj as Phaser.GameObjects.BitmapText).font,
                      label,
                      8,
                  )
                : this.scene.add.text(this.cfg.margin + 12, y, label, {
                      fontFamily: "monospace",
                      fontSize: "12px",
                  });

            obj.setOrigin(0, 0).setScrollFactor(0);
            this.container.add(obj);
            this.choiceTexts.push(obj);
        });

        this.choiceCursor = useBitmap
            ? this.scene.add.bitmapText(
                  this.cfg.margin,
                  startY,
                  (this.textObj as Phaser.GameObjects.BitmapText).font,
                  "►",
                  8,
              )
            : this.scene.add.text(this.cfg.margin, startY, "►", {
                  fontFamily: "monospace",
                  fontSize: "12px",
              });

        this.choiceCursor.setOrigin(0, 0).setScrollFactor(0);
        this.container.add(this.choiceCursor);

        let sel = 0;
        const move = (d: number) => {
            sel = (sel + d + choices.length) % choices.length;
            if (this.choiceCursor) this.choiceCursor.y = startY + sel * this.cfg.lineHeight;
        };
        move(0);

        return new Promise<number>((resolve) => {
            const confirm = () => cleanup(resolve, sel);
            const up = () => move(-1);
            const down = () => move(+1);
            const wheel = (_p: any, _go: any, dx: number, dy: number) => {
                if (dy > 0) move(+1);
                if (dy < 0) move(-1);
            };

            this.keys.up.on("down", up);
            this.keys.down.on("down", down);
            this.keys.confirm.on("down", confirm);
            this.keys.skip.on("down", confirm);
            this.scene.input.on("pointerdown", confirm);
            this.scene.input.on("wheel", wheel);

            const cleanup = (done: (n: number) => void, index: number) => {
                this.keys.up.off("down", up);
                this.keys.down.off("down", down);
                this.keys.confirm.off("down", confirm);
                this.keys.skip.off("down", confirm);
                this.scene.input.off("pointerdown", confirm);
                this.scene.input.off("wheel", wheel);
                this.hideChoices();
                done(index);
            };
        });
    }

    private hideChoices() {
        this.choiceTexts.forEach((t) => t.destroy());
        this.choiceTexts = [];
        this.choiceCursor?.destroy();
        this.choiceCursor = undefined;
    }

    // -------------------- Advance control --------------------

    private tryAdvance() {
        if (this.active && this.awaitingAdvance) this.awaitingAdvance = false;
    }

    destroy() {
        if (this.destroyed) return;
        this.destroyed = true;
        this.active = false;

        this.hideChoices();
        this.cursorTween?.stop();
        this.cursorTween?.remove();
        this.scene.tweens.killTweensOf(this.container);

        this.scene.input.off("pointerdown", this.onPointerDown);
        this.scene.scale.off("resize", this.onResize);

        this.keys.confirm.destroy();
        this.keys.skip.destroy();
        this.keys.up.destroy();
        this.keys.down.destroy();

        this.container.destroy(true);
    }
}

// -------------------- Pixel panel --------------------

class PixelPanel {
    public node: Phaser.GameObjects.Graphics;
    public width: number;
    public height: number;
    private theme: Required<DialogTheme>;

    constructor(scene: Phaser.Scene, w: number, h: number, theme: DialogTheme) {
        this.node = scene.add.graphics();
        this.width = Math.floor(w);
        this.height = Math.floor(h);
        // apply defaults
        this.theme = {
            fill: theme.fill ?? 0x111122,
            borderOuter: theme.borderOuter ?? 0xffffff,
            borderInner: theme.borderInner ?? 0x000000,
            borderOuterPx: theme.borderOuterPx ?? 2,
            borderInnerPx: theme.borderInnerPx ?? 1,
        };
        this.redraw();
    }

    resize(w: number, h: number) {
        this.width = Math.floor(w);
        this.height = Math.floor(h);
    }

    setTheme(theme: Partial<DialogTheme>) {
        this.theme = { ...this.theme, ...theme } as Required<DialogTheme>;
    }

    redraw() {
        this.node.clear();

        // Fill
        this.node.fillStyle(this.theme.fill, 1);
        this.node.fillRect(0, 0, this.width, this.height);

        // Outer border
        this.node.lineStyle(this.theme.borderOuterPx, this.theme.borderOuter, 1);
        // 0.5 offsets help 1px crisp lines in Phaser canvas
        this.node.strokeRect(0.5, 0.5, this.width - 1, this.height - 1);

        // Optional inner border for accent
        if (this.theme.borderInner !== undefined) {
            const inset = 3.5; // small inset
            this.node.lineStyle(this.theme.borderInnerPx, this.theme.borderInner, 1);
            this.node.strokeRect(inset, inset, this.width - inset * 2, this.height - inset * 2);
        }
    }
}

// -------------------- Helpers --------------------

function delay(scene: Phaser.Scene, ms: number) {
    return new Promise<void>((res) => scene.time.delayedCall(ms, () => res()));
}

function waitForAdvance(scene: Phaser.Scene, self: DialogBox) {
    return new Promise<void>((res) => {
        const onDown = () => {
            cleanup();
            res();
        };
        scene.input.on("pointerdown", onDown);
        scene.input.keyboard!.on("keydown-SPACE", onDown);
        scene.input.keyboard!.on("keydown-Z", onDown);
        function cleanup() {
            scene.input.off("pointerdown", onDown);
            scene.input.keyboard!.off("keydown-SPACE", onDown);
            scene.input.keyboard!.off("keydown-Z", onDown);
        }
    });
}

// Very simple monospace-like word wrapper by character count (fallback when not using BitmapText).
function wrapMonospace(s: string, widthPx: number, charW: number): string {
    const maxCols = Math.max(1, Math.floor(widthPx / Math.max(1, charW)));
    const words = s.split(/(\s+)/);
    let line = "",
        out = "",
        count = 0;
    for (const w of words) {
        const len = w.length;
        const isSpace = /^\s+$/.test(w);
        if (!isSpace && count + len > maxCols && count > 0) {
            out += line + "\n";
            line = "";
            count = 0;
        }
        line += w;
        count += len;
    }
    out += line;
    return out;
}

// Split into rough pages by character capacity (rows * columns).
function paginate(s: string, maxChars: number): string[] {
    const words = s.split(/(\s+)/);
    const pages: string[] = [];
    let page = "";
    let used = 0;
    for (const w of words) {
        const isSpace = /^\s+$/.test(w);
        const l = w.length;
        if (!isSpace && used + l > maxChars && used > 0) {
            pages.push(page.trim());
            page = "";
            used = 0;
        }
        page += w;
        used += l;
    }
    if (page.trim().length) pages.push(page.trim());
    return pages;
}
