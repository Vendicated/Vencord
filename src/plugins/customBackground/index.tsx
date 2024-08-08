/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated, FieryFlames and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType, StartAt } from "@utils/types";
import { Forms } from "@webpack/common";

const settings = definePluginSettings({
    backgroundImage: {
        description: "URL to the background image",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true
    },
});

const updateBackground = () => {
    const bg = settings.store.backgroundImage;
        try {
            if (bg) {
                const { styleSheets } = document;
                for(let i = 0 ; i < styleSheets.length ; i++) {
                    const { cssRules } = styleSheets[i];
                    for(let j = 0 ; j < cssRules.length ; j++) {
                        const rule = cssRules[j];
                        if(rule instanceof CSSStyleRule && rule.selectorText === ".custom-theme-background") {
                            const { style } = rule;
                            style.setProperty("--custom-theme-background", `url(${bg})`);
                        }
                    }
                }
            }
        }catch(e) {
            console.error("Some error occurred while updating background", e);
        }
};

const resetBackground = () => {
    const { styleSheets } = document;
    for(let i = 0 ; i < styleSheets.length ; i++) {
        const { cssRules } = styleSheets[i];
        for(let j = 0 ; j < cssRules.length ; j++) {
            const rule = cssRules[j];
            if(rule instanceof CSSStyleRule && rule.selectorText === ".custom-theme-background") {
                const { style } = rule;
                style.setProperty("--custom-theme-background", "none");
            }
        }
    }
};

export default definePlugin({
    name: "Custom Background",
    description: "Set a custom background for your Discord client.",
    authors: [Devs.NexWan],
    settings,
    enabledByDefault: true,
    startAt: StartAt.WebpackReady,
    settingsAboutComponent: () => {
        return (
            <>
            <Forms.FormText>
                <p>This plugin allows you to set a custom background, the image has to be hosted somewhere in order to be accepted </p>
                <p>When you disable the plugin it won't change until you reset it, I'm still looking forward to fix it.</p>
            </Forms.FormText>
            </>
        );
    },

    start() {
        setTimeout(() => {
            updateBackground();
        }, 1000);
    },

    stop() {
        setTimeout(() => {
            resetBackground();
        }, 1000);
    }
});
