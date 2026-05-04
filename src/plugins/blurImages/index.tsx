/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { managedStyleRootNode } from "@api/Styles";
import { Devs } from "@utils/constants";
import { createAndAppendStyle } from "@utils/css";
import definePlugin, { makeRange, OptionType } from "@utils/types";

let style: HTMLStyleElement;

const settings = definePluginSettings({
    blurAmount: {
        type: OptionType.SLIDER,
        description: "Blur amount in pixels",
        markers: makeRange(0, 100, 5),
        stickToMarkers: false,
        default: 50,
        onChange: setCss
    },
    transitionDuration: {
        type: OptionType.SLIDER,
        description: "Transition duration in seconds",
        markers: makeRange(0, 2, 0.1),
        stickToMarkers: false,
        default: 0.2,
        onChange: setCss
    }
});

function setCss() {
    if (!style) return;

    style.textContent = `
    .vc-blur-all-images [class*=imageContainer],
    .vc-blur-all-images [class*=wrapperPaused] {
        filter: blur(${settings.store.blurAmount}px);
        transition: filter ${settings.store.transitionDuration}s;
    }

    .vc-blur-all-images [class*=imageContainer]:hover,
    .vc-blur-all-images [class*=wrapperPaused]:hover {
        filter: blur(0);
    }
`;
}

export default definePlugin({
    name: "BlurImages",
    description: "Blurs all images and GIFs in chat by default",
    tags: ["Privacy", "Appearance"],
    authors: [Devs.nikokomninos],
    settings,

    patches: [
        {
            find: "}renderStickersAccessories(",
            replacement: {
                match: /(\.renderReactions\(\i\).+?className:)/,
                replace: '$&"vc-blur-all-images "+'
            }
        }
    ],

    start() {
        style = createAndAppendStyle("VcBlurAllImages", managedStyleRootNode);
        setCss();
    },

    stop() {
        style?.remove();
    }
});
