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


enum State {
    Sleep, Wander, Mouse, Hyper, Chase
}
const states = {
    [State.Chase]: "chase",
    [State.Hyper]: "hyper",
    [State.Mouse]: "mouse",
    [State.Sleep]: "sleep",
    [State.Wander]: "wander"
};
const stateNames = {
    chase: State.Chase,
    hyper: State.Hyper,
    mouse: State.Mouse,
    sleep: State.Sleep,
    wander: State.Wander
} as const;

type Personality = "lazy" | "chaotic" | "friendly" | "grumpy";

const skins = [
    "default", "ace", "black", "bunny", "calico", "eevee", "fox", "ghost",
    "gray", "jess", "kina", "lucy", "maia", "maria", "mike", "silversky",
    "snuupy", "spirit", "tora", "valentine"
] as const;
type Skin = (typeof skins)[number];

let cats: {
    oneko: Oneko;
    state: State;
    stateStart: number;
    personality: Personality;
    chasedCount: number;
    chasing?: number;
}[] = [];

let mouseX = 0;
let mouseY = 0;
let randomTargetInterval: NodeJS.Timeout | null = null;
let enabled = false;


const stateMinTime: Record<State, number> = {
    [State.Wander]: 5000,
    [State.Hyper]: 3000,
    [State.Chase]: 4000,
    [State.Mouse]: 4000,
    [State.Sleep]: 6000
};


const baseWeights: Record<State, Partial<Record<State, number>>> = {
    [State.Wander]: { [State.Hyper]: 0.2, [State.Sleep]: 0.1, [State.Mouse]: 0.05, [State.Chase]: 0.1 },
    [State.Hyper]: { [State.Wander]: 0.4, [State.Sleep]: 0.1, [State.Mouse]: 0.05, [State.Chase]: 0.2 },
    [State.Chase]: { [State.Wander]: 0.3, [State.Hyper]: 0.1, [State.Sleep]: 0.05, [State.Mouse]: 0.1 },
    [State.Mouse]: { [State.Wander]: 0.3, [State.Hyper]: 0.1, [State.Sleep]: 0.05, [State.Chase]: 0.1 },
    [State.Sleep]: { [State.Wander]: 0.5, [State.Mouse]: 0.05 }
};


const personalityModifiers: Record<Personality, Partial<Record<State, number>>> = {
    lazy: { [State.Sleep]: 0.5, [State.Wander]: 0.3 },
    chaotic: { [State.Hyper]: 0.4, [State.Chase]: 0.3, [State.Mouse]: 0.1 },
    friendly: { [State.Wander]: 0.4, [State.Mouse]: 0.3 },
    grumpy: { [State.Sleep]: 0.4, [State.Chase]: 0.2 }
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
                cat.oneko.source = settings.store.randomSkins ? getSkinURL(randomSkin()) : getSkinURL("default");
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
        oneko.source = settings.store.randomSkins ? getSkinURL(randomSkin()) : getSkinURL("default");
        cats.push({
            oneko,
            state: State.Wander,
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
        cats.forEach(c => c.oneko.setTarget(...(Object.values(getRandomPosition())) as [number, number]));
        randomTargetInterval = setInterval(tick, 500);
    }
}

function tick() {
    const now = Date.now();
    cats.forEach(cat => {

        const timeSec = Math.floor((now - cat.stateStart) / 1000);
        cat.oneko.element?.setAttribute("title",
            `😺 ${cat.personality} | ${states[cat.state]} (${timeSec}s)`);

        if (settings.store.devMode && cat.oneko.element) {
            cat.oneko.element.setAttribute("data-dev", `${cat.personality} | ${states[cat.state]} (${timeSec}s)`);
        } else {
            cat.oneko.element?.removeAttribute("data-dev");
        }

        if (cat.state === State.Wander && Math.random() < 0.3 && cat.oneko.idleTime > 10) {
            const { x, y } = getRandomPosition(); cat.oneko.setTarget(x, y);
        }
        if (cat.state === State.Hyper) {
            cat.oneko.speed = 20;
            if (cat.oneko.idleTime > 10) cat.oneko.setTarget(...(Object.values(getRandomPosition())) as [number, number]);
        }
        if (cat.state === State.Chase) {
            if (cat.chasing === undefined || !cats[cat.chasing]) cat.chasing = Math.floor(Math.random() * cats.length);
            const target = cats[cat.chasing];
            cat.oneko.setTarget(target.oneko.x, target.oneko.y);
            target.chasedCount++;
        }
        if (cat.state === State.Mouse) {
            cat.oneko.setTarget(mouseX, mouseY);
        }


        const dt = now - cat.stateStart;
        if (dt >= stateMinTime[cat.state]) {
            const weights: Partial<Record<State, number>> = { ...baseWeights[cat.state] };

            for (const [s, w] of Object.entries(personalityModifiers[cat.personality])) {
                weights[State[s as keyof typeof State]] = (weights[State[s as keyof typeof State]] || 0) + w!;
            }

            if (Math.hypot(cat.oneko.x - mouseX, cat.oneko.y - mouseY) < 100)
                weights[State.Mouse] = (weights[State.Mouse] || 0) + 0.2;

            if (cats.some(c => c.state === State.Chase))
                weights[State.Chase] = (weights[State.Chase] || 0) + 0.1;

            if (cat.chasedCount > 5)
                weights[State.Sleep] = (weights[State.Sleep] || 0) + 0.3;


            const entries = Object.entries(weights) as [string, number][];
            const total = entries.reduce((sum, [, w]) => sum + w, 0);
            let r = Math.random() * total;
            for (const [key, w] of entries) {
                r -= w;
                if (r <= 0) {
                    console.log(key);
                    cat.state = stateNames[key as keyof typeof State];
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
        window.addEventListener("resize", () => cats.forEach(c => c.oneko.setTarget(...(Object.values(getRandomPosition())) as [number, number])));
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
