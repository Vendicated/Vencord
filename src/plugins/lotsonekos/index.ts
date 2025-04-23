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

class Selectors {
    static classStartWith(value: string) {
        return "[class^='" + value + "']";
    }
    static classContains(value: string) {
        return "[class*='" + value + "']";
    }
    static classEndsWith(value: string) {
        return "[class$='" + value + "']";
    }
    static classExact(value: string) {
        return "[class='" + value + "']";
    }
    static idExact(value: string) {
        return "[id='" + value + "']";
    }
    static idContains(value: string) {
        return "[id*='" + value + "']";
    }
    static idStartWith(value: string) {
        return "[id^='" + value + "']";
    }
    static idEndsWith(value: string) {
        return "[id$='" + value + "']";
    }
    static children(parent: string) {
        return (child: string) => {
            return parent + " " + child;
        };
    }
    static directChildren(parent: string) {
        return (child: string) => {
            return parent + " > " + child;
        };
    }
}

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

type Personality = "lazy" | "chaotic" | "friendly" | "grumpy";

const skins = [
    "default", "ace", "black", "bunny", "calico", "eevee", "fox", "ghost",
    "gray", "jess", "kina", "lucy", "maia", "maria", "mike", "silversky",
    "snuupy", "spirit", "tora", "valentine"
] as const;
export type Skin = (typeof skins)[number];

// Predefined cat colors for dev mode
const catColors = [
    "#FF5252", "#FF4081", "#E040FB", "#7C4DFF", "#536DFE",
    "#448AFF", "#40C4FF", "#18FFFF", "#64FFDA", "#69F0AE",
    "#B2FF59", "#EEFF41", "#FFFF00", "#FFD740", "#FFAB40",
    "#FF6E40", "#8D6E63", "#78909C", "#26A69A", "#9CCC65"
];

let cats: Array<{
    targetMarker?: HTMLDivElement;
    oneko: Oneko;
    state: State;
    stateStart: number;
    personality: Personality;
    chasedCount: number;
    chasing?: number;
    targetElement?: HTMLElement;
    color: string; // Added color property for each cat
}> = [];

let mouseX = 0;
let mouseY = 0;
let randomTargetInterval: NodeJS.Timeout | null = null;
let enabled = false;

export type State = typeof allStates[number];
export const allStates = ["sleep", "wander", "mouse", "hyper", "chase", "scratch", "pfp", "annoy"] as const;

const stateMinTime: Record<State, number> = {
    wander: 50000,
    hyper: 20000,
    chase: 40000,
    mouse: 40000,
    sleep: 60000,
    scratch: 20000,
    pfp: 20000,
    annoy: 50000
};

const baseWeights: Record<State, Partial<Record<State, number>>> = {
    wander: { hyper: 0.2, sleep: 0.1, mouse: 0.05, chase: 0.1 },
    hyper: { wander: 0.4, sleep: 0.1, mouse: 0.05, chase: 0.2 },
    chase: { wander: 0.3, hyper: 0.1, sleep: 0.05, mouse: 0.1 },
    mouse: { wander: 0.3, hyper: 0.1, sleep: 0.05, chase: 0.1 },
    sleep: { wander: 0.5, mouse: 0.05 },
    scratch: { wander: 0.3, hyper: 0.1, sleep: 0.05, chase: 0.1 },
    pfp: { wander: 0.3, hyper: 0.1, sleep: 0.05, chase: 0.1 },
    annoy: { annoy: 0.4, wander: 0.3, hyper: 0.1, sleep: 0.5, chase: 0.1 }
};

const personalityModifiers: Record<Personality, Partial<Record<State, number>>> = {
    lazy: { sleep: 0.5, wander: 0.3 },
    chaotic: { hyper: 0.4, chase: 0.3, mouse: 0.1, annoy: 0.3 },
    friendly: { wander: 0.4, mouse: 0.3, annoy: 0.1 },
    grumpy: { sleep: 0.4, chase: 0.2, annoy: 0.3 },
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
    },
    ...Object.assign({}, ...allStates.map(state => ({
        [`${state}State`]: {
            type: OptionType.BOOLEAN,
            description: "allow the " + state + " state",
            default: true,
        }
    }))) as Record<string, { type: OptionType; description: string; default: boolean; }>
});

function pickPersonality(): Personality {
    const traits: Personality[] = ["lazy", "chaotic", "friendly", "grumpy"];
    return traits[Math.floor(Math.random() * traits.length)];
}

// Get a color for a new cat
function getNextColor(index: number): string {
    return catColors[index % catColors.length];
}

function ensureAllowedState(cat: typeof cats[number]) {
    const allowedStates = allStates.filter(state => settings.store[`${state}State`]);
    if (!allowedStates.includes(cat.state)) {
        const randomAllowedState = allowedStates[Math.floor(Math.random() * allowedStates.length)];
        cat.state = randomAllowedState;
        cat.stateStart = Date.now();
        cat.chasing = undefined;
        cat.oneko.speed = 10;
        cat.chasedCount = 0;
        cat.targetElement = undefined;
    }
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
            chasedCount: 0,
            color: getNextColor(cats.length) // Assign unique color to each cat
        });
    }

    while (cats.length > desired) {
        cats.pop()?.oneko.element?.remove();
    }

    cats.forEach(cat => ensureAllowedState);

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
        ensureAllowedState(cat);
        const timeSec = Math.floor((now - cat.stateStart) / 1000);

        cat.oneko.element?.setAttribute("title",
            `😺 ${cat.personality} | ${cat.state} (${timeSec}s)`);

        if (settings.store.devMode && cat.oneko.element) {
            // Add color styling to data-dev element using CSS custom property
            cat.oneko.element.style.setProperty("--cat-color", cat.color);
            cat.oneko.element.setAttribute("data-dev",
                `${cat.personality} | ${cat.state} (${timeSec}s) | Target: ${Math.round(cat.oneko.targetX)},${Math.round(cat.oneko.targetY)}`
            );

            // Apply custom style for this specific element
            if (!cat.oneko.element.hasAttribute("data-has-style")) {
                const style = document.createElement("style");
                const id = `cat-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
                cat.oneko.element.id = id;
                style.textContent = `
                    #${id}::before {
                        background: ${cat.color}99 !important; /* Using the cat's color with 60% opacity */
                    }
                `;
                document.head.appendChild(style);
                cat.oneko.element.setAttribute("data-has-style", "true");
            }

            // Optionally, you could also add a visual indicator of the target
            if (!cat.targetMarker) {
                cat.targetMarker = document.createElement("div");
                cat.targetMarker.style.cssText = `
                    position: absolute;
                    width: 10px;
                    height: 10px;
                    background-color: ${cat.color};
                    border-radius: 50%;
                    z-index: 9998;
                    pointer-events: none;
                    box-shadow: 0 0 5px ${cat.color};
                `;
                document.body.appendChild(cat.targetMarker);
            }

            cat.targetMarker.style.left = `${cat.oneko.targetX - 5}px`;
            cat.targetMarker.style.top = `${cat.oneko.targetY - 5}px`;
        } else {
            cat.oneko.element?.removeAttribute("data-dev");
            if (cat.targetMarker) {
                cat.targetMarker.remove();
                cat.targetMarker = undefined;
            }
        }

        cat.oneko.minDistance = 48;
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

        if (cat.state === "scratch") {
            const { oneko } = cat;
            oneko.targetX = oneko.x;
            oneko.targetY = oneko.y;
            oneko.idleAnimation = "scratchSelf";
            if (oneko.idleAnimationFrame < 140)
                oneko.idleAnimationFrame = 140;
        }

        if (!(["pfp", "annoy"].includes(cat.state))) {
            cat.targetElement = undefined;
        }
        if (cat.state === "pfp") handlePfpTargeting(cat);
        if (cat.state === "annoy") handleAnnoyTargeting(cat);

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
            entries.forEach(([state]) => {
                if (!allStates.filter(state => settings.store[`${state}State`]).includes(state as State)) {
                    weights[state as State] = 0;
                }
            });
            const total = entries.reduce((sum, [, w]) => sum + w, 0);
            let r = Math.random() * total;
            for (const [key, w] of entries) {
                r -= w;
                if (r <= 0) {
                    cat.state = key as State;
                    ensureAllowedState(cat);
                    break;
                }
            }

            cat.stateStart = now;
            cat.chasing = undefined;
            cat.oneko.speed = 10;
            cat.chasedCount = 0;
            cat.targetElement = undefined;
        }
    });
}

// ——— GLOBAL CACHES ———
const CACHE_INTERVAL = 500; // ms
let lastAvatarCache = 0;
let lastMessageCache = 0;
let avatarElements = [];
let messageElements = [];
let chatboxElement: Element | null = null;
function refreshCaches() {
    const now = performance.now();
    if (now - lastAvatarCache > CACHE_INTERVAL) {
        avatarElements = Array.from(
            document.querySelectorAll(Selectors.classStartWith("avatar__"))
        );
        lastAvatarCache = now;
    }
    if (now - lastMessageCache > CACHE_INTERVAL) {
        messageElements = Array.from(
            document.querySelectorAll(
                Selectors.children(
                    Selectors.idStartWith("message-content-")
                )("span")
            )
        );
        // also cache the chatbox here (same selector each time)
        chatboxElement = document.querySelector(
            Selectors.children(
                Selectors.children(Selectors.classStartWith("channelTextArea_"))(
                    Selectors.classStartWith("textArea__")
                )
            )("span")
        );
        lastMessageCache = now;
    }
}

function pickRandomVisible(list) {
    if (!list.length) return null;
    const visible = list.filter(isElementVisible);
    if (!visible.length) return null;
    return visible[Math.floor(Math.random() * visible.length)];
}

function handlePfpTargeting(cat) {
    cat.oneko.minDistance = 4;
    refreshCaches();

    // only pick a new avatar if the old one dies or goes off-screen
    if (!isElementVisible(cat.targetElement)) {
        cat.targetElement = pickRandomVisible(avatarElements);
    }

    if (cat.targetElement) {
        const r = cat.targetElement.getBoundingClientRect();
        cat.oneko.setTarget(
            r.left + r.width / 2,
            r.top + r.height * 0.75
        );
    }
}


function handleAnnoyTargeting(cat) {
    refreshCaches();
    cat.oneko.minDistance = 4;

    // build a single map of how many cats on each target
    const targetCounts = new Map();
    cats.forEach(c => {
        const t = c.targetElement;
        if (t) targetCounts.set(t, (targetCounts.get(t) || 0) + 1);
    });

    const currentCount = targetCounts.get(cat.targetElement) || 0;
    // only retarget if overcrowded or gone off-screen
    if (currentCount >= 3 || !isElementVisible(cat.targetElement)) {
        let newTarget: Element | null = null;
        let attempts = 0;

        while (attempts < 5) {
            // 40% chance to bug the chatbox if it’s visible
            if (Math.random() < 0.4 && isElementVisible(chatboxElement)) {
                newTarget = chatboxElement;
            } else {
                newTarget = pickRandomVisible(messageElements);
            }

            // accept if under crowd threshold
            if ((targetCounts.get(newTarget) || 0) < 3) {
                break;
            }
            attempts++;
        }
        cat.targetElement = newTarget;
    }

    if (cat.targetElement) {
        const r = cat.targetElement.getBoundingClientRect();
        // spread them out horizontally by a small, pseudo-random offset
        const idx = cats.indexOf(cat);
        const offset = (((cat.stateStart + idx) % 94) + 2) / 100 * r.width;
        cat.oneko.setTarget(
            r.left + offset,
            r.top + r.height / 4
        );
    }
}


function isElementVisible(element) {
    if (!element) return false;

    const rect = element.getBoundingClientRect();
    return (
        rect.width > 0 &&
        rect.height > 0 &&
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= window.innerHeight &&
        rect.right <= window.innerWidth
    );
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
        // Update the dev style to accommodate color customization
        if (styleEl) removeDevStyle();
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
        cats.forEach(cat => {
            // Remove any individual styles that were added
            if (cat.oneko.element?.id) {
                const styleEl = document.querySelector(`style[data-for="${cat.oneko.element.id}"]`);
                styleEl?.remove();
            }
            cat.oneko.element?.remove();
            cat.targetMarker?.remove();
        });
        cats = [];
        document.removeEventListener("mousemove", mouseMoveEventListener);
        window.removeEventListener("resize", assignRandomTargets);
        if (randomTargetInterval) clearInterval(randomTargetInterval);
        removeDevStyle();
    }
});
