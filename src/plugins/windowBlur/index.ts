/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 0kamiyasha
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { managedStyleRootNode } from "@api/Styles";
import { Devs } from "@utils/constants";
import { createAndAppendStyle } from "@utils/css";
import definePlugin, { OptionType } from "@utils/types";
import { WindowStore } from "@webpack/common";

const CLASS = "vc-unfocused-blur";

let style: HTMLStyleElement;
let timer: ReturnType<typeof setTimeout> | undefined;
let mouseInside = false;

const settings = definePluginSettings({
    blurAmount: {
        type: OptionType.NUMBER,
        description: "How strong the blur is when Discord is unfocused. 0 disables the blur.",
        default: 10,
        onChange: setCss
    },
    transitionDuration: {
        type: OptionType.NUMBER,
        description: "How long the blur takes to fade in or out, in milliseconds.",
        default: 150,
        onChange: setCss
    },
    blurDelay: {
        type: OptionType.NUMBER,
        description: "How long Discord must remain unfocused before the blur starts, in milliseconds.",
        default: 100,
        onChange: () => schedule()
    },
    unblurDelay: {
        type: OptionType.NUMBER,
        description: "How long to wait before removing the blur after focus or mouse hover, in milliseconds.",
        default: 0,
        onChange: () => schedule()
    },
    blurWhenUnfocused: {
        type: OptionType.BOOLEAN,
        description: "Blur Discord when the application loses focus.",
        default: true,
        onChange: () => schedule()
    },
    unblurOnHover: {
        type: OptionType.BOOLEAN,
        description: "Remove the blur when the mouse enters Discord while it is unfocused.",
        default: true,
        onChange: () => schedule()
    }
});

function setCss() {
    if (!style) return;
    style.textContent = `
        html.${CLASS} {
            filter: blur(${settings.store.blurAmount}px);
            transition: filter ${settings.store.transitionDuration}ms ease-in-out;
        }
    `;
}

function shouldBlur() {
    const { blurWhenUnfocused, blurAmount, unblurOnHover } = settings.store;
    if (!blurWhenUnfocused || blurAmount <= 0 || WindowStore.isFocused()) return false;
    if (unblurOnHover && mouseInside) return false;
    return true;
}

function schedule(skipDelay = false) {
    if (!style) return;
    if (timer != null) {
        clearTimeout(timer);
        timer = undefined;
    }

    const blur = shouldBlur();
    const delay = skipDelay ? 0 : blur ? settings.store.blurDelay : settings.store.unblurDelay;
    const apply = () => {
        setCss();
        document.documentElement.classList.toggle(CLASS, shouldBlur());
    };

    if (delay <= 0) apply();
    else timer = setTimeout(apply, delay);
}

const onFocus = () => {
    if (!WindowStore.isFocused()) mouseInside = false;
    schedule();
};
const onEnter = () => {
    mouseInside = true;
    if (!WindowStore.isFocused()) schedule();
};
const onLeave = () => {
    mouseInside = false;
    if (!WindowStore.isFocused()) schedule();
};
const onMove = () => {
    if (!mouseInside) onEnter();
};

export default definePlugin({
    name: "WindowBlur",
    description: "Blurs Discord when the application window loses focus",
    tags: ["Privacy", "Appearance"],
    authors: [Devs.Okamiyasha],
    settings,

    start() {
        style = createAndAppendStyle("VcWindowBlur", managedStyleRootNode);
        setCss();
        mouseInside = false;
        if (!WindowStore.isFocused()) schedule(true);

        document.documentElement.addEventListener("mouseenter", onEnter);
        document.documentElement.addEventListener("mouseleave", onLeave);
        window.addEventListener("mousemove", onMove);
        WindowStore.addChangeListener(onFocus);
    },

    stop() {
        WindowStore.removeChangeListener(onFocus);
        document.documentElement.removeEventListener("mouseenter", onEnter);
        document.documentElement.removeEventListener("mouseleave", onLeave);
        window.removeEventListener("mousemove", onMove);
        if (timer != null) clearTimeout(timer);
        document.documentElement.classList.remove(CLASS);
        style?.remove();
        mouseInside = false;
    }
});
