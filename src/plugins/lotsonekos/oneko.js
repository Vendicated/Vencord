/*
 * Tallycord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// original oneko.js: https://github.com/adryd325/oneko.js/
// modified edition: https://github.com/raynecloudy/lots-o-nekos/

/**
 * ## `Oneko` class
 *
 * ### Constructors
 * `Oneko` objects are constructed using this syntax:
 * ```js
 * new Oneko();
 * ```
 *
 * ### Parameters
 * Parameter|Meaning
 * ---------|-------
 * `element`|An HTMLDivElement used to represent the Oneko in the document.
 * `frameCount`|How long the Oneko has been alive for. Measured by how many times the Oneko's `element` has been updated.
 * `idleTime`|How long the Oneko has been idle for. Measured by how many times the Oneko's `element` has been updated.
 * `source`|The path to an image file used to represent the Oneko, as a string.
 * `speed`|How far the Oneko runs per update, in pixels.
 * `spriteSets`|A keyed list of arrays of points ([number, number]), defined as animations.
 * `targetX`|The X position the Oneko is running towards, in pixels.
 * `targetY`|The Y position the Oneko is running towards, in pixels.
 * `updateSpeed`|How fast the Oneko updates its animations, in milliseconds.
 * `x`|The Oneko's `element`'s position on the X axis, in pixels.
 * `y`|The Oneko's `element`'s position on the Y axis, in pixels.
 * `_lastFrameTimestamp`|The timestamp of the last time the Oneko's `element` was updated.
 * `_events`|A keyed list of Events fired by the Oneko object.
 *
 * ### Functions
 * Function|Meaning
 * --------|-------
 * `setTarget(x: number, y: number): void`|Set the coordinates for the Oneko to run to. `x` and `y` are pixel values.
 * `_onAnimationFrame`|Runs every frame. Enables Oneko animations.
 * `_setSprite`|Sets the sprite image to a given frame of a given animation.
 * `_resetIdleAnimation`|Resets the idle animation.
 * `_idle`|Controls idle animation logic (scratching, sleeping, etc.)
 * `_frame`|Controls all animation logic.
 * `_draw`|Renders the Oneko using its `element`. Fires the `draw` event after completion.
 * ``|
 *
 * ### Events
 * Event|Fired when...
 * -----|-------------
 * `draw`|Oneko is drawn
 * `startRunning`|Target coordinate becomes outside range, after alert animation plays
 * `stopRunning`|Target coordinate becomes inside range
 */

class Oneko extends EventTarget {
    /**
     * The Oneko's `element`'s position on the X axis, in pixels.
     * @type {number}
     */
    x;

    /**
     * The Oneko's `element`'s position on the Y axis, in pixels.
     * @type {number}
     */
    y;

    /**
     * How far the Oneko runs per update, in pixels.
     * @type {number}
     */
    speed;

    /**
     * The path to an image file used to represent the Oneko.
     * @type {string}
     */
    source;

    /**
     * How fast the Oneko updates its animations, in milliseconds.
     * @type {number}
     */
    updateSpeed;

    /**
     * An HTMLDivElement used to represent the Oneko in the document.
     * @type {HTMLDivElement | null}
     */
    element;

    /**
     * The X position the Oneko is running towards, in pixels.
     * @type {number}
     */
    targetX;

    /**
     * The Y position the Oneko is running towards, in pixels.
     * @type {number}
     */
    targetY;

    /**
     * How long the Oneko has been alive for. Measured by how many times the Oneko's `element` has been updated.
     * @type {number}
     */
    frameCount;

    /**
     * How long the Oneko has been idle for. Measured by how many times the Oneko's `element` has been updated.
     * @type {number}
     */
    idleTime;

    /**
     * How long the Oneko has been idle for. Measured by how many times the Oneko's `element` has been updated.
     * @type {string | null}
     */
    idleAnimation;

    /**
     * The current frame of the playing idle animation.
     * @type {number}
     */
    idleAnimationFrame;

    /**
     * The timestamp of the last time the Oneko's `element` was updated.
     * @type {number}
     * @readonly
     */
    _lastFrameTimestamp;

    /**
     * @type {number}
     */
    minDistance = 48;
    /**
     * A keyed list of Events fired by the Oneko object.
     * @readonly
     */
    _events = {
        draw: new Event("draw"),
        startRunning: new Event("startRunning"),
        stopRunning: new Event("stopRunning"),
    };

    /**
     * A keyed list of arrays of points ([number, number]), defined as animations.
     *
     * ![image](https://raw.githubusercontent.com/raynecloudy/oneko_db/refs/heads/master/default.png)
     */
    spriteSets = {
        /**
         * The Oneko is standing still.
         *
         * ![image](https://raw.githubusercontent.com/raynecloudy/lots-o-nekos/refs/heads/master/media/anim-locations/idle.png)
         */
        idle: [[-3, -3]],
        /**
         * Shown before the Oneko starts running to the target coordinate.
         *
         * ![image](https://raw.githubusercontent.com/raynecloudy/lots-o-nekos/refs/heads/master/media/anim-locations/alert.png)
         */
        alert: [[-7, -3]],
        /**
         * Alternative idle animation - the Oneko scratches its ears.
         *
         * ![image](https://raw.githubusercontent.com/raynecloudy/lots-o-nekos/refs/heads/master/media/anim-locations/scratchSelf.png)
         */
        scratchSelf: [
            [-5, 0],
            [-6, 0],
            [-7, 0],
        ],
        /**
         * Alternative idle animation - the Oneko scratches the top of the viewport. Can only be seen when the Oneko's `element` is less than 32 pixels away from the top of the viewport.
         *
         * ![image](https://raw.githubusercontent.com/raynecloudy/lots-o-nekos/refs/heads/master/media/anim-locations/scratchWallN.png)
         */
        scratchWallN: [
            [0, 0],
            [0, -1],
        ],
        /**
         * Alternative idle animation - the Oneko scratches the bottom of the viewport. Can only be seen when the Oneko's `element` is less than 32 pixels away from the bottom of the viewport.
         *
         * ![image](https://raw.githubusercontent.com/raynecloudy/lots-o-nekos/refs/heads/master/media/anim-locations/scratchWallS.png)
         */
        scratchWallS: [
            [-7, -1],
            [-6, -2],
        ],
        /**
         * Alternative idle animation - the Oneko scratches the right side of the viewport. Can only be seen when the Oneko's `element` is less than 32 pixels away from the right side of the viewport.
         *
         * ![image](https://raw.githubusercontent.com/raynecloudy/lots-o-nekos/refs/heads/master/media/anim-locations/scratchWallE.png)
         */
        scratchWallE: [
            [-2, -2],
            [-2, -3],
        ],
        /**
         * Alternative idle animation - the Oneko scratches the left side of the viewport. Can only be seen when the Oneko's `element` is less than 32 pixels away from the left side of the viewport.
         *
         * ![image](https://raw.githubusercontent.com/raynecloudy/lots-o-nekos/refs/heads/master/media/anim-locations/scratchWallW.png)
         */
        scratchWallW: [
            [-4, 0],
            [-4, -1],
        ],
        /**
         * Alternative idle animation - the Oneko is getting ready to sleep.
         *
         * ![image](https://raw.githubusercontent.com/raynecloudy/lots-o-nekos/refs/heads/master/media/anim-locations/tired.png)
         */
        tired: [[-3, -2]],
        /**
         * Alternative idle animation - the Oneko is sleeping.
         *
         * ![image](https://raw.githubusercontent.com/raynecloudy/lots-o-nekos/refs/heads/master/media/anim-locations/sleeping.png)
         */
        sleeping: [
            [-2, 0],
            [-2, -1],
        ],
        /**
         * The Oneko is running up.
         *
         * ![image](https://raw.githubusercontent.com/raynecloudy/lots-o-nekos/refs/heads/master/media/anim-locations/N.png)
         */
        N: [
            [-1, -2],
            [-1, -3],
        ],
        /**
         * The Oneko is running up and to the right.
         *
         * ![image](https://raw.githubusercontent.com/raynecloudy/lots-o-nekos/refs/heads/master/media/anim-locations/NE.png)
         */
        NE: [
            [0, -2],
            [0, -3],
        ],
        /**
         * The Oneko is running right.
         *
         * ![image](https://raw.githubusercontent.com/raynecloudy/lots-o-nekos/refs/heads/master/media/anim-locations/E.png)
         */
        E: [
            [-3, 0],
            [-3, -1],
        ],
        /**
         * The Oneko is running down and to the right.
         *
         * ![image](https://raw.githubusercontent.com/raynecloudy/lots-o-nekos/refs/heads/master/media/anim-locations/SE.png)
         */
        SE: [
            [-5, -1],
            [-5, -2],
        ],
        /**
         * The Oneko is running down.
         *
         * ![image](https://raw.githubusercontent.com/raynecloudy/lots-o-nekos/refs/heads/master/media/anim-locations/S.png)
         */
        S: [
            [-6, -3],
            [-7, -2],
        ],
        /**
         * The Oneko is running down and to the left.
         *
         * ![image](https://raw.githubusercontent.com/raynecloudy/lots-o-nekos/refs/heads/master/media/anim-locations/SW.png)
         */
        SW: [
            [-5, -3],
            [-6, -1],
        ],
        /**
         * The Oneko is running left.
         *
         * ![image](https://raw.githubusercontent.com/raynecloudy/lots-o-nekos/refs/heads/master/media/anim-locations/W.png)
         */
        W: [
            [-4, -2],
            [-4, -3],
        ],
        /**
         * The Oneko is running up and to the left.
         *
         * ![image](https://raw.githubusercontent.com/raynecloudy/lots-o-nekos/refs/heads/master/media/anim-locations/NW.png)
         */
        NW: [
            [-1, 0],
            [-1, -1],
        ],
    };

    constructor() {
        super();

        const isReducedMotion =
            window.matchMedia("(prefers-reduced-motion: reduce)") === true ||
            window.matchMedia("(prefers-reduced-motion: reduce)").matches ===
                true;
        if (isReducedMotion) return;

        this.x = 100;
        this.y = 100;
        this.speed = 10;
        this.source =
            "https://raw.githubusercontent.com/raynecloudy/oneko_db/refs/heads/master/default.png";
        this.updateSpeed = 100;
        this.minDistance = 48;

        this.element = document.createElement("div");
        this.element = document.body.appendChild(this.element);

        this.targetX = this.x;
        this.targetY = this.y;
        this.frameCount = 0;
        this.idleTime = 0;
        this.idleAnimation = null;
        this.idleAnimationFrame = 0;
        this._lastFrameTimestamp;

        this._draw();

        this._onAnimationFrame = this._onAnimationFrame.bind(this);
        window.requestAnimationFrame(this._onAnimationFrame);
    }

    /**
     * Sets the coordinates for the Oneko to run to.
     * @param {number} x X location, in pixels.
     * @param {number} y Y location, in pixels.
     * @readonly
     */
    setTarget(x, y) {
        this.targetX = x;
        this.targetY = y;
    }

    /**
     * Runs every frame. Enables Oneko animations.
     * @param {number} timestamp Duration since last update.
     * @readonly
     */
    _onAnimationFrame(timestamp) {
        // Stops execution if the neko element is removed from DOM
        if (!this.element.isConnected) {
            return;
        }
        if (!this._lastFrameTimestamp) {
            this._lastFrameTimestamp = timestamp;
        }
        if (timestamp - this._lastFrameTimestamp > this.updateSpeed) {
            this._lastFrameTimestamp = timestamp;
            this._frame();
        }
        window.requestAnimationFrame(this._onAnimationFrame);
    }

    /**
     * Sets the sprite image to a given frame of a given animation.
     * @param {string} name Name of animation to access. The Y value on the sprite sheet.
     * @param {number} frame Frame of animation to access. The X value on the sprite sheet.
     * @readonly
     */
    _setSprite(name, frame) {
        const sprite =
            this.spriteSets[name][frame % this.spriteSets[name].length];
        this.element.style.backgroundPosition = `${sprite[0] * 32}px ${
            sprite[1] * 32
        }px`;
        this._draw();
    }

    /**
     * Resets the idle animation.
     * @readonly
     */
    _resetIdleAnimation() {
        this.idleAnimation = null;
        this.idleAnimationFrame = 0;
    }

    /**
     * Controls idle animation logic (scratching, sleeping, etc.)
     * @readonly
     */
    _idle() {
        if (this.idleTime === 1) {
            this.dispatchEvent(this._events.stopRunning);
        }

        this.idleTime += 1;

        // every ~ 20 seconds
        if (
            this.idleTime > 10 &&
            Math.floor(Math.random() * 200) === 0 &&
            this.idleAnimation == null
        ) {
            const avalibleIdleAnimations = ["sleeping", "scratchSelf"];
            if (this.x < 32) {
                avalibleIdleAnimations.push("scratchWallW");
            }
            if (this.y < 32) {
                avalibleIdleAnimations.push("scratchWallN");
            }
            if (this.x > window.innerWidth - 32) {
                avalibleIdleAnimations.push("scratchWallE");
            }
            if (this.y > window.innerHeight - 32) {
                avalibleIdleAnimations.push("scratchWallS");
            }
            this.idleAnimation =
                avalibleIdleAnimations[
                    Math.floor(Math.random() * avalibleIdleAnimations.length)
                ];
        }

        switch (this.idleAnimation) {
            case "sleeping":
                if (this.idleAnimationFrame < 8) {
                    this._setSprite("tired", 0);
                    break;
                }
                this._setSprite(
                    "sleeping",
                    Math.floor(this.idleAnimationFrame / 4)
                );
                if (this.idleAnimationFrame > 192) {
                    this._resetIdleAnimation();
                }
                break;
            case "scratchWallN":
            case "scratchWallS":
            case "scratchWallE":
            case "scratchWallW":
            case "scratchSelf":
                this._setSprite(this.idleAnimation, this.idleAnimationFrame);
                if (this.idleAnimationFrame > 9) {
                    this._resetIdleAnimation();
                }
                break;
            default:
                this._setSprite("idle", 0);
                return;
        }
        this.idleAnimationFrame += 1;
    }

    /**
     * Controls all animation logic.
     * @readonly
     */
    _frame() {
        this.frameCount += 1;
        const diffX = this.x - this.targetX;
        const diffY = this.y - this.targetY;
        const distance = Math.sqrt(diffX ** 2 + diffY ** 2);

        if (distance < this.speed || distance < this.minDistance) {
            this._idle();
            return;
        }

        this.idleAnimation = null;
        this.idleAnimationFrame = 0;

        if (this.idleTime > 1) {
            this._setSprite("alert", 0);
            // count down after being alerted before moving
            this.idleTime = Math.min(this.idleTime, 7);
            this.idleTime -= 1;
            if (this.idleTime === 1) {
                this.dispatchEvent(this._events.startRunning);
            }
            return;
        }

        let direction;
        direction = diffY / distance > 0.5 ? "N" : "";
        direction += diffY / distance < -0.5 ? "S" : "";
        direction += diffX / distance > 0.5 ? "W" : "";
        direction += diffX / distance < -0.5 ? "E" : "";
        this._setSprite(direction, this.frameCount);

        this.x -= (diffX / distance) * this.speed;
        this.y -= (diffY / distance) * this.speed;

        this.x = Math.min(Math.max(16, this.x), window.innerWidth - 16);
        this.y = Math.min(Math.max(16, this.y), window.innerHeight - 16);

        this._draw();
    }

    /**
     * Renders the Oneko using its `element`. Fires the `draw` event after completion.
     * @readonly
     */
    _draw() {
        this.element.id = "oneko";
        this.element.ariaHidden = true;
        this.element.style.width = "32px";
        this.element.style.height = "32px";
        this.element.style.position = "fixed";
        this.element.style.pointerEvents = "none";
        this.element.style.imageRendering = "pixelated";
        this.element.style.left = `${this.x - 16}px`;
        this.element.style.top = `${this.y - 16}px`;
        this.element.style.zIndex = 2147483647;
        this.element.style.backgroundImage = `url(${this.source})`;

        this.dispatchEvent(this._events.draw);
    }
}

export default Oneko;
