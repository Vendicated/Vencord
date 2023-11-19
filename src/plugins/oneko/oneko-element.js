/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const randomInt = (min, max) =>
    Math.floor((Math.random() * (max - min + 1)) + min);

export const tileFrames = tileList =>
    tileList.map(([x, y]) => ({ backgroundPosition: `${x * 32}px ${y * 32}px` }));

export const spriteSets = {
    idle: [
        [-3, -3]
    ],
    alert: [
        [-7, -3]
    ],
    scratch: [
        [-5, 0],
        [-6, 0],
        [-7, 0],
    ],
    tired: [
        [-3, -2]
    ],
    sleeping: [
        [-2, 0],
        [-2, -1],
    ],
    N: [
        [-1, -2],
        [-1, -3],
    ],
    NE: [
        [0, -2],
        [0, -3],
    ],
    E: [
        [-3, 0],
        [-3, -1],
    ],
    SE: [
        [-5, -1],
        [-5, -2],
    ],
    S: [
        [-6, -3],
        [-7, -2],
    ],
    SW: [
        [-5, -3],
        [-6, -1],
    ],
    W: [
        [-4, -2],
        [-4, -3],
    ],
    NW: [
        [-1, 0],
        [-1, -1],
    ],
};

export class ONekoElement extends HTMLElement {
    static get observedAttributes() { return ["speed", "x", "y", "goto-x", "goto-y", "neko-x", "neko-y"]; }

    neko = {
        x: 32,
        y: 32,
        speed: 10,
    };
    goto = {
        x: 0,
        y: 0,
    };

    frame = 0;
    idleFrame = 0;
    currAnim = null;

    constructor() {
        super();
    }

    playFrame() {
        this.frame += 1;

        const diffX = this.neko.x - this.goto.x;
        const diffY = this.neko.y - this.goto.y;
        const distance = Math.sqrt(diffX ** 2 + diffY ** 2);

        if (distance < this.neko.speed || distance < 48) {
            this.playIdleAnimation();
            return;
        }

        if (this.idleFrame > 1) {
            this.setAnimation("alert");
            this.idleFrame = Math.min(this.idleFrame, 7) - 1;
            return;
        }

        let direction;
        direction = diffY / distance > 0.5 ? "N" : "";
        direction += diffY / distance < -0.5 ? "S" : "";
        direction += diffX / distance > 0.5 ? "W" : "";
        direction += diffX / distance < -0.5 ? "E" : "";

        this.setAnimation(direction, 200, this.frame);

        this.neko.x -= (diffX / distance) * this.neko.speed;
        this.neko.y -= (diffY / distance) * this.neko.speed;

        this.updatePosition();
    }

    playIdleAnimation() {
        const playingIdleAnimation = ["sleeping", "scratch", "tired"]
            .includes(this.currAnim);

        let idleAnimation = null;
        if (this.idleFrame > 10 && !playingIdleAnimation && randomInt(0, 200) === 0) {
            idleAnimation = ["sleeping", "scratch"][randomInt(0, 1)];
            this.idleFrame = 0;
        }

        switch (idleAnimation ?? this.currAnim) {
            case "tired":
            case "sleeping":
                if (this.idleFrame < 8) {
                    this.setAnimation("tired");
                } else {
                    this.setAnimation("sleeping", 1600);
                }
                if (this.idleFrame > 192) {
                    this.idleFrame = 0;
                    this.setAnimation("idle", 0);
                }
                break;
            case "scratch":
                this.setAnimation("scratch", 300);
                if (this.idleFrame > 9) {
                    this.idleFrame = 0;
                    this.setAnimation("idle", 0);
                }
                break;
            default:
                !playingIdleAnimation && this.setAnimation("idle", 0);
        }

        this.idleFrame += 1;
    }

    setAnimation(name, duration = 200, startFrame = 0) {
        if (this.currAnim === name) return;

        this.style.backgroundPosition = "";
        this.animation?.cancel?.();

        this.currAnim = name;
        this.duration = duration;

        const frames = tileFrames(spriteSets[name]);

        if (frames.length > 1) {
            this.animation = this.animate(frames, {
                iterations: Infinity,
                duration,
                easing: `steps(${frames.length},jump-none)`,
                startTime: Math.round(
                    ((duration / frames.length) * startFrame) % frames.length
                ),
            });
        } else {
            this.animation = null;
            this.style.backgroundPosition = frames[0].backgroundPosition;
        }
    }

    // todo: use transform or similar for better performance
    // it could be possible to animate using animation api, it may be hard to get performance right with the data changing so often though
    updatePosition() {
        this.style.left = `${this.neko.x - 16}px`;
        this.style.top = `${this.neko.y - 16}px`;
    // this.style.transform = `translate(${this.neko.x - 16}px, ${this.neko.y - 16}px)`
    }

    connectedCallback() {
        this.onMouseMove = e => {
            // todo: make this better
            const [x, y] = this.style.position === "fixed"
                ? [e.clientX, e.clientY]
                : [e.offsetX, e.offsetY];

            this.goto.x = x;
            this.goto.y = y;
        };

        this.onMouseOut = () => {
            this.goto.x = this.neko.x;
            this.goto.y = this.neko.y;
        };

        // todo: use handleEvent instead
        this.parentNode.addEventListener("mousemove", this.onMouseMove, { passive: true, capture: true });
        this.parentNode.addEventListener("mouseout", this.onMouseOut, { passive: true, capture: true });

        this.interval = setInterval(() => this.playFrame(), 100);

        // `||=` so the styles can still be overriden
        this.style.backgroundImage ||= "url('https://raw.githubusercontent.com/adryd325/oneko.js/a593b1d4759d6ae79b6706353ab618b8a7c11557/oneko.gif')";
        this.style.imageRendering ||= "pixelated";
        this.style.width ||= "32px";
        this.style.height ||= "32px";
        this.style.position ||= "fixed";
        this.style.pointerEvents ||= "none";
        this.style.zIndex = Number.MAX_VALUE;
        this.updatePosition();


        this.setAnimation("idle");
    }

    disconnectedCallback() {
        document.removeEventListener(this.onMouseOut);
        document.removeEventListener(this.onMouseMove);
        clearInterval(this.interval);
    }

    attributeChangedCallback(name, _oldValue, newValue) {
        switch (name) {
            case "speed": {
                this.neko.speed = parseInt(newValue);
                break;
            }
            case "x":
            case "y": {
                const value = parseInt(newValue);
                this.goto[name] = value;
                this.neko[name] = value;
                break;
            }
            case "goto-x":
            case "goto-y": {
                this.goto[name[5]] = parseInt(newValue);
                break;
            }
            case "neko-x":
            case "neko-y": {
                this.neko[name[5]] = parseInt(newValue);
                break;
            }
        }
    }
}

customElements.define("o-neko", ONekoElement);
