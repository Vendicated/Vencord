/*
 * Tallycord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

import Oneko from "./oneko";

let styleEl: HTMLStyleElement | null = null;

function injectDevStyle() {
    if (styleEl) return;
    styleEl = document.createElement("style");
    styleEl.textContent = `
[data-dev]::before {
    content: attr(data-dev);
    position: absolute;
    font-size: 12px;
    background: rgba(0,0,0,0.7);
    color: white;
    padding: 2px 4px;
    border-radius: 4px;
    top: -16px;
    left: 0;
    white-space: nowrap;
    z-index: 9999;
    pointer-events: none;
    font-family: monospace;
}
`;
    document.head.appendChild(styleEl);
}

function removeDevStyle() {
    if (styleEl) {
        styleEl.remove();
        styleEl = null;
    }
}


export type State = "sleep" | "wander" | "mouse" | "hyper" | "chase";
export const allStates: State[] = ["sleep", "wander", "mouse", "hyper", "chase"];

type Personality = "lazy" | "chaotic" | "friendly" | "grumpy";

const skins = [
    "default", "ace", "black", "bunny", "calico", "eevee", "fox", "ghost",
    "gray", "jess", "kina", "lucy", "maia", "maria", "mike", "silversky",
    "snuupy", "spirit", "tora", "valentine"
] as const;
export type Skin = (typeof skins)[number];


let cats: Array<{
    oneko: Oneko;
    state: State;
    stateStart: number;
    personality: Personality;
    chasedCount: number;
    chasing?: number;
}> = [];

let mouseX = 0;
let mouseY = 0;
let randomTargetInterval: NodeJS.Timeout | null = null;
let enabled = false;


const stateMinTime: Record<State, number> = {
    wander: 50000,
    hyper: 20000,
    chase: 40000,
    mouse: 40000,
    sleep: 60000,
};


const baseWeights: Record<State, Partial<Record<State, number>>> = {
    wander: { hyper: 0.2, sleep: 0.1, mouse: 0.05, chase: 0.1 },
    hyper: { wander: 0.4, sleep: 0.1, mouse: 0.05, chase: 0.2 },
    chase: { wander: 0.3, hyper: 0.1, sleep: 0.05, mouse: 0.1 },
    mouse: { wander: 0.3, hyper: 0.1, sleep: 0.05, chase: 0.1 },
    sleep: { wander: 0.5, mouse: 0.05 },
};


const personalityModifiers: Record<Personality, Partial<Record<State, number>>> = {
    lazy: { sleep: 0.5, wander: 0.3 },
    chaotic: { hyper: 0.4, chase: 0.3, mouse: 0.1 },
    friendly: { wander: 0.4, mouse: 0.3 },
    grumpy: { sleep: 0.4, chase: 0.2 },
};

const getSkinURL = (skin: Skin) =>
    `https://raw.githubusercontent.com/coolesding/onekocord/refs/heads/main/skins/${skin}.png`;
const randomSkin = () => skins[Math.floor(Math.random() * skins.length)];

const settings = definePluginSettings({
    number: {
        type: OptionType.NUMBER,
        description: "Number of onekos",
        onChange: refreshCats
    },
    followMouse: {
        type: OptionType.BOOLEAN,
        description: "All nekos follow mouse if true, they do whatever the heck they want if false",
        onChange: setupRandomTargets
    },
    randomSkins: {
        type: OptionType.BOOLEAN,
        description: "if true the nekos will have random skins, not just the default",
        onChange: () => {
            if (!enabled) return;
            cats.forEach(cat => {
                cat.oneko.source = settings.store.randomSkins
                    ? getSkinURL(randomSkin())
                    : getSkinURL("default");
            });
        }
    },
    devMode: {
        type: OptionType.BOOLEAN,
        description: "Shows debug info above each neko (state, personality, etc)",
        onChange: () => {
            if (settings.store.devMode) {
                injectDevStyle();
            } else {
                removeDevStyle();
            }
        }
    }
});

function pickPersonality(): Personality {
    const traits: Personality[] = ["lazy", "chaotic", "friendly", "grumpy"];
    return traits[Math.floor(Math.random() * traits.length)];
}

function refreshCats() {
    if (!enabled) return;
    const desired = settings.store.number || 0;

    while (cats.length < desired) {
        const oneko = new Oneko();
        oneko.source = settings.store.randomSkins
            ? getSkinURL(randomSkin())
            : getSkinURL("default");
        const location = getRandomPosition();
        oneko.x = location.x;
        oneko.y = location.y;
        cats.push({
            oneko,
            state: Object.keys(stateMinTime)[Math.floor(Math.random() * Object.keys(stateMinTime).length)] as State,
            stateStart: Date.now(),
            personality: pickPersonality(),
            chasedCount: 0
        });
    }

    while (cats.length > desired) {
        cats.pop()?.oneko.element?.remove();
    }

    setupRandomTargets();
}

function getRandomPosition() {
    return { x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight };
}

function setupRandomTargets() {
    if (randomTargetInterval) clearInterval(randomTargetInterval);
    if (!settings.store.followMouse && cats.length > 0) {
        cats.forEach(c => c.oneko.setTarget(...Object.values(getRandomPosition()) as [number, number]));
        randomTargetInterval = setInterval(tick, 50);
    }
}

function tick() {
    const now = Date.now();
    cats.forEach(cat => {
        const timeSec = Math.floor((now - cat.stateStart) / 1000);


        cat.oneko.element?.setAttribute("title",
            `😺 ${cat.personality} | ${cat.state} (${timeSec}s)`);

        if (settings.store.devMode && cat.oneko.element) {
            cat.oneko.element.setAttribute("data-dev",
                `${cat.personality} | ${cat.state} (${timeSec}s)`
            );
        } else {
            cat.oneko.element?.removeAttribute("data-dev");
        }


        if (cat.state === "wander" && Math.random() < 0.3 && cat.oneko.idleTime > 10) {
            const { x, y } = getRandomPosition();
            cat.oneko.setTarget(x, y);
        }
        if (cat.state === "hyper") {
            cat.oneko.speed = 20;
            if (cat.oneko.idleTime > 10) {
                const { x, y } = getRandomPosition();
                cat.oneko.setTarget(x, y);
            }
        }
        if (cat.state === "chase") {
            if (cat.chasing === undefined || !cats[cat.chasing]) {
                cat.chasing = Math.floor(Math.random() * cats.length);
            }
            const target = cats[cat.chasing];
            cat.oneko.setTarget(target.oneko.x, target.oneko.y);
            target.chasedCount++;
        }
        if (cat.state === "mouse") {
            cat.oneko.setTarget(mouseX, mouseY);
        }

        if (cat.state === "sleep") {
            const { oneko } = cat;
            oneko.targetX = oneko.x;
            oneko.targetY = oneko.y;
            oneko.idleAnimation = "sleeping";
            if (oneko.idleAnimationFrame < 140)
                oneko.idleAnimationFrame = 140;



            if (Math.hypot(cat.oneko.x - mouseX, cat.oneko.y - mouseY) < 16) {
                cat.state = "mouse";
                oneko.setTarget(mouseX, mouseY);
                oneko.idleAnimation = null;
                cat.stateStart = Date.now();
            }
        }



        const dt = now - cat.stateStart;


        if (cat.oneko.idleTime > 10 && dt >= stateMinTime[cat.state]) {
            const weights: Partial<Record<State, number>> = { ...baseWeights[cat.state] };


            Object.entries(personalityModifiers[cat.personality]).forEach(([s, w]) => {
                weights[s as State] = (weights[s as State] || 0) + (w || 0);
            });


            if (Math.hypot(cat.oneko.x - mouseX, cat.oneko.y - mouseY) < 100) {
                weights.mouse = (weights.mouse || 0) + 0.5;
            }


            if (cats.some(c => c.state === "chase")) {
                weights.chase = (weights.chase || 0) + 0.1;
            }


            if (cat.chasedCount > 5) {
                weights.sleep = (weights.sleep || 0) + 0.3;
            }


            const entries = Object.entries(weights) as [string, number][];
            const total = entries.reduce((sum, [, w]) => sum + w, 0);
            let r = Math.random() * total;
            for (const [key, w] of entries) {
                r -= w;
                if (r <= 0) {
                    cat.state = key as State;
                    break;
                }
            }


            cat.stateStart = now;
            cat.chasing = undefined;
            cat.oneko.speed = 10;
            cat.chasedCount = 0;
        }

    });
}

const mouseMoveEventListener = (e: MouseEvent) => {
    mouseX = e.clientX; mouseY = e.clientY;
    if (settings.store.followMouse) {
        cats.forEach(cat => cat.oneko.setTarget(mouseX, mouseY));
    }
};

const assignRandomTargets = () => {
    if (!settings.store.followMouse) {
        cats.forEach(cat => {
            const { x, y } = getRandomPosition();
            cat.oneko.setTarget(x, y);
        });
    }
};

export default definePlugin({
    name: "LotsOnekos",
    description: "more cat follow mouse (real) - or they wander randomly",
    authors: [Devs.tally, Devs.adryd, Devs.rayne],
    settings,
    start() {
        enabled = true;
        refreshCats();
        document.addEventListener("mousemove", mouseMoveEventListener);
        window.addEventListener("resize", () => cats.forEach(c => c.oneko.setTarget(
            ...Object.values(getRandomPosition()) as [number, number]
        )));
        setupRandomTargets();
        if (settings.store.devMode) {
            injectDevStyle();
        }
    },
    stop() {
        enabled = false;
        cats.forEach(cat => cat.oneko.element?.remove());
        cats = [];
        document.removeEventListener("mousemove", mouseMoveEventListener);
        window.removeEventListener("resize", assignRandomTargets);
        if (randomTargetInterval) clearInterval(randomTargetInterval);
        removeDevStyle();
    }
});
