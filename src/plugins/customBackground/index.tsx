/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated, FieryFlames and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { enableStyle } from "@api/Styles";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType, StartAt } from "@utils/types";
import { Forms } from "@webpack/common";

import styles from "./styles.css?managed";

const settings = definePluginSettings({
    backgroundImage: {
        description: "URL to the background image",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true
    },
});

let htmlObserver: MutationObserver | null = null;
let rootObserver: MutationObserver | null = null;

const addCustomClassToHtml = () => {
    const html = document.querySelector("html");
    if (html) {
        html.classList.add("custom-theme-background");
        // Discord removes the class from the html element each time it state changes, so we need to observe it and add it back
        htmlObserver = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.type === "attributes" && mutation.attributeName === "class") {
                    if (!html.classList.contains("custom-theme-background")) {
                        html.classList.add("custom-theme-background");
                    }
                }
            });
        });

        htmlObserver.observe(html, { attributes: true });
    }
};

const setCustomTheme = (bg: string) => {
    const root = document.documentElement;
    root.style.setProperty("--custom-theme", `url(${bg})`);
};

const observeCustomTheme = (bg: string) => {
    const root = document.documentElement;
    // same shit happens with most of the root components, need to observe it so it can be added back
    rootObserver = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.type === "attributes" && mutation.attributeName === "style") {
                const currentBg = root.style.getPropertyValue("--custom-theme");
                if (currentBg !== `url(${bg})`) {
                    setCustomTheme(bg);
                }
            }
        });
    });

    rootObserver.observe(root, { attributes: true });
};

const updateBackground = () => {
    const bg = settings.store.backgroundImage;
        try {
            if (bg.length > 1) {
                setCustomTheme(bg);
                observeCustomTheme(bg);
            }
        }catch(e) { // it haven't crashed as far as I've been testing, but you never know
            console.error("Some error occurred while updating background", e);
        }
};
// Stop observing the custom classes when this hit is off
const stopObservingCustomTheme = () => {
    if(rootObserver) rootObserver.disconnect();
    if(htmlObserver) htmlObserver.disconnect();
    rootObserver = null;
    htmlObserver = null;
};

// Reset the background to the default one, I think when using custom themes it kinda bugs out, but it fixes itself when you change the theme again
const resetBackground = () => {
    stopObservingCustomTheme();
    const root = document.documentElement;
    root.style.removeProperty("--custom-theme");
    const html = document.querySelector("html");
    if (html) {
        html.classList.remove("custom-theme-background");
    }
};

export default definePlugin({
    name: "Custom Background",
    description: "Set a custom background for your Discord client.",
    authors: [Devs.NexWan],
    settings,
    enabledByDefault: true,
    startAt: StartAt.DOMContentLoaded,
    settingsAboutComponent: () => {
        return (
            <>
            <Forms.FormText>
                <p>This plugin allows you to set a custom background, the image has to be hosted somewhere in order to be accepted &nbsp;
                    <a href="https://imgur.com/upload" target="_blank" rel="noreferrer">Imgur</a> is a good place to host images.
                </p>
            </Forms.FormText>
            </>
        );
    },

    start() {
        try {
            enableStyle(styles); // Enable the custom style, which in reality is just the custom theme class Discord uses
            addCustomClassToHtml();
        }catch(e) {
            console.error("Some error occurred while starting the plugin", e);
        }
        setTimeout(() => { // just in case the plugin is started before the DOM is loaded
            console.log("Trying to start the plugin again");
            updateBackground();
        }, 1000);
    },

    stop() {
        setTimeout(() => { // idk why but it doesn't work if it's not delayed
            resetBackground();
        }, 1000);
    }
});
