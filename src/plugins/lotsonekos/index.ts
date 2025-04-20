/*
 * Tallycord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

import Oneko from "./oneko";

let onekos: Oneko[] = [];
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
];
let enabled = false;
const settings = definePluginSettings({
    number: {
        type: OptionType.NUMBER,
        description: "Number of onekos",
        onChange: () => {
            if (!enabled) return;
            if ((settings.store.number || 0) > onekos.length) {
                for (let index = onekos.length; index < (settings.store.number || 0); index++) {
                    onekos.push(new Oneko());
                }
            } else {
                for (let index = onekos.length; index >= (settings.store.number || 0); index--) {
                    onekos.pop()?.element?.remove();
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
                onekos.forEach(oneko => {
                    oneko.source = `https://raw.githubusercontent.com/coolesding/onekocord/refs/heads/main/skins/${skins[Math.floor(Math.random() * skins.length)]}.png`;
                });
            } else {
                onekos.forEach(oneko => {

                    oneko.source = "https://raw.githubusercontent.com/coolesding/onekocord/refs/heads/main/skins/default.png";
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
        onekos.forEach(oneko => {
            const { x, y } = getRandomPosition();
            oneko.setTarget(x, y);
        });
    }
};

const setupRandomTargets = () => {
    if (randomTargetInterval) {
        clearInterval(randomTargetInterval);
        randomTargetInterval = null;
    }

    if (!settings.store.followMouse && onekos.length > 0) {
        assignRandomTargets();

        const minMs = (settings.store.minRandomInterval || 2) * 1000;
        const maxMs = (settings.store.maxRandomInterval || 6) * 1000;
        const intervalMs = Math.max(500, minMs);

        randomTargetInterval = setInterval(() => {
            onekos.forEach(oneko => {
                if (Math.random() < 0.3) {
                    const { x, y } = getRandomPosition();
                    if (oneko.idleTime > 10)
                        oneko.setTarget(x, y);
                }
            });
        }, intervalMs);
    }
};

const mouseMoveEventListener = (e: MouseEvent) => {
    if (settings.store.followMouse) {
        onekos.forEach(oneko => {
            oneko.setTarget(e.clientX, e.clientY);
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
        for (let index = 0; index < (settings.store.number || 0); index++) {
            onekos.push(new Oneko());
        }
        document.addEventListener("mousemove", mouseMoveEventListener);

        setupRandomTargets();
        if (settings.store.randomSkins) {
            onekos.forEach(oneko => {
                oneko.source = `https://raw.githubusercontent.com/coolesding/onekocord/refs/heads/main/skins/${skins[Math.floor(Math.random() * skins.length)]}.png`;
            });
        } else {
            onekos.forEach(oneko => {

                oneko.source = "https://raw.githubusercontent.com/coolesding/onekocord/refs/heads/main/skins/default.png";
            });

        }
        window.addEventListener("resize", assignRandomTargets);
    },
    stop() {
        enabled = false;
        onekos.forEach(oneko => oneko.element?.remove());
        onekos = [];
        document.removeEventListener("mousemove", mouseMoveEventListener);
        window.removeEventListener("resize", assignRandomTargets);

        if (randomTargetInterval) {
            clearInterval(randomTargetInterval);
            randomTargetInterval = null;
        }
    }
});
