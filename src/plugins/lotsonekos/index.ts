/*
 * Tallycord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

import Oneko from "./oneko";

enum State {
    Sleep, Wander, Mouse, Hyper, Chase
}

let cats: ({ oneko: Oneko, state: State; chasing?: number; })[] = [];
let mouseX = 0;
let mouseY = 0;
let randomTargetInterval: NodeJS.Timeout | null = null;
const skins = [
    "default",
    "ace",
    "black",
    "bunny",
    "calico",
    "eevee",
    "fox",
    "ghost",
    "gray",
    "jess",
    "kina",
    "lucy",
    "maia",
    "maria",
    "mike",
    "silversky",
    "snuupy",
    "spirit",
    "tora",
    "valentine",
] as const;

type skin = (typeof skins)[number];
let enabled = false;
const settings = definePluginSettings({
    number: {
        type: OptionType.NUMBER,
        description: "Number of onekos",
        onChange: () => {
            if (!enabled) return;
            if ((settings.store.number || 0) > cats.length) {
                for (let index = cats.length; index < (settings.store.number || 0); index++) {
                    const oneko = new Oneko();
                    if (settings.store.randomSkins) {
                        oneko.source = `https://raw.githubusercontent.com/coolesding/onekocord/refs/heads/main/skins/${skins[Math.floor(Math.random() * skins.length)]}.png`;
                    } else {
                        oneko.source = "https://raw.githubusercontent.com/coolesding/onekocord/refs/heads/main/skins/default.png";
                    }
                    cats.push({ oneko, state: State.Wander });
                }
            } else {
                for (let index = cats.length; index >= (settings.store.number || 0); index--) {
                    cats.pop()?.oneko.element?.remove();
                }
            }

            setupRandomTargets();
        }
    },
    followMouse: {
        type: OptionType.BOOLEAN,
        description: "All nekos follow mouse if true, they do whatever the heck they want if false",
        onChange: () => {
            setupRandomTargets();
        }
    },
    minRandomInterval: {
        type: OptionType.NUMBER,
        description: "Minimum time (in seconds) before a cat picks a new random target",
        default: 2
    },
    maxRandomInterval: {
        type: OptionType.NUMBER,
        description: "Maximum time (in seconds) before a cat picks a new random target",
        default: 6
    },
    randomSkins: {
        type: OptionType.BOOLEAN,
        description: "All nekos follow mouse if true, they do whatever the heck they want if false",
        onChange: () => {
            if (!enabled) return;

            if (settings.store.randomSkins) {
                cats.forEach(cat => {
                    cat.oneko.source = `https://raw.githubusercontent.com/coolesding/onekocord/refs/heads/main/skins/${skins[Math.floor(Math.random() * skins.length)]}.png`;
                });
            } else {
                cats.forEach(cat => {

                    cat.oneko.source = "https://raw.githubusercontent.com/coolesding/onekocord/refs/heads/main/skins/default.png";
                });

            }
        }
    },
});

const getRandomPosition = () => {
    return {
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight
    };
};

const assignRandomTargets = () => {
    if (!settings.store.followMouse) {
        cats.forEach(cat => {
            const { x, y } = getRandomPosition();
            cat.oneko.setTarget(x, y);
        });
    }
};

const setupRandomTargets = () => {
    if (randomTargetInterval) {
        clearInterval(randomTargetInterval);
        randomTargetInterval = null;
    }

    if (!settings.store.followMouse && cats.length > 0) {
        assignRandomTargets();

        const minMs = (settings.store.minRandomInterval || 2) * 1000;
        const maxMs = (settings.store.maxRandomInterval || 6) * 1000;
        const intervalMs = Math.max(500, minMs);

        randomTargetInterval = setInterval(() => {
            cats.forEach(cat => {
                switch (cat.state) {
                    case State.Wander: {
                        if (Math.random() < 0.3) {
                            const { x, y } = getRandomPosition();
                            if (cat.oneko.idleTime > 10)
                                cat.oneko.setTarget(x, y);

                            if (Math.random() < 0.5)
                                setRandomState(cat);
                        }
                    } break;
                    case State.Hyper: {
                        const { x, y } = getRandomPosition();
                        if (cat.oneko.idleTime > 10) {
                            cat.oneko.setTarget(x, y);
                            if (Math.random() < 0.2)
                                setRandomState(cat);
                        }
                    } break;
                    case State.Chase: {
                        if (cat.chasing === undefined) cat.chasing = Math.floor(Math.random() * cats.length);
                        if (!cats[cat.chasing]) cat.chasing = Math.floor(Math.random() * cats.length);
                        const { x, y } = cats[cat.chasing].oneko!;
                        cat.oneko.setTarget(x, y);
                        if (Math.random() < 0.1) {
                            setRandomState(cat);
                            cat.chasing = undefined;
                        }

                    } break;
                    case State.Mouse: {
                        cat.oneko.setTarget(mouseX, mouseY);
                        if (Math.random() < 0.2)
                            setRandomState(cat);
                    } break;
                    case State.Sleep: {
                        if (Math.random() < 0.05)
                            setRandomState(cat);
                    } break;
                }

            });
        }, intervalMs);
    }
};

function setRandomState(cat: typeof cats[number]) {
    const states: State[] = [
        State.Chase,
        State.Hyper,
        State.Mouse,
        State.Wander, State.Chase,
        State.Hyper,
        State.Mouse,
        State.Wander, State.Chase,
        State.Hyper,
        State.Mouse,
        State.Wander, State.Chase,
        State.Hyper,
        State.Mouse,
        State.Wander,
        State.Sleep,
    ];

    cat.state = states[Math.floor(Math.random() * states.length)];
}

const mouseMoveEventListener = (e: MouseEvent) => {
    if (settings.store.followMouse) {
        cats.forEach(cat => {
            cat.oneko.setTarget(e.clientX, e.clientY);
        });
    }

    [mouseX, mouseY] = [e.clientX, e.clientY];
};



export default definePlugin({
    name: "LotsOnekos",
    description: "more cat follow mouse (real) - or they wander randomly",
    authors: [Devs.tally, Devs.adryd, Devs.rayne],
    settings,
    start() {
        enabled = true;
        for (let index = 0; index < (settings.store.number || 0); index++) {
            cats.push({ oneko: new Oneko(), state: State.Wander });
        }
        document.addEventListener("mousemove", mouseMoveEventListener);

        setupRandomTargets();
        if (settings.store.randomSkins) {
            cats.forEach(cat => {
                cat.oneko.source = `https://raw.githubusercontent.com/coolesding/onekocord/refs/heads/main/skins/${skins[Math.floor(Math.random() * skins.length)]}.png`;
            });
        } else {
            cats.forEach(cat => {

                cat.oneko.source = "https://raw.githubusercontent.com/coolesding/onekocord/refs/heads/main/skins/default.png";
            });

        }
        window.addEventListener("resize", assignRandomTargets);
    },
    stop() {
        enabled = false;
        cats.forEach(cat => cat.oneko.element?.remove());
        cats = [];
        document.removeEventListener("mousemove", mouseMoveEventListener);
        window.removeEventListener("resize", assignRandomTargets);

        if (randomTargetInterval) {
            clearInterval(randomTargetInterval);
            randomTargetInterval = null;
        }
    }
});
