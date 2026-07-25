/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

import { installDiscordHook, uninstallDiscordHook } from "./engine/discordHook";
import { installDomTranslator, uninstallDomTranslator } from "./engine/domTranslator";
import { clearDiscordLocales, getDiscordCoverage, registerDiscordPack, registerEnglishPack } from "./engine/lookup";
import {
    applyPluginOverlay,
    clearPluginPacks,
    registerPluginPack,
    removePluginOverlay,
} from "./engine/pluginStrings";
import enTextAll from "./locales/discord/en-text/_all.json";
import { discordPacks, pluginPacks } from "./locales/registry";

const FONT_CSS: Record<string, string> = {
    cairo: "https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;700&display=swap",
    tajawal: "https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap",
    amiri: "https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap",
    vazirmatn: "https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;700&display=swap",
};

const FONT_FAMILY: Record<string, string> = {
    cairo: "'Cairo', sans-serif",
    tajawal: "'Tajawal', sans-serif",
    amiri: "'Amiri', serif",
    vazirmatn: "'Vazirmatn', sans-serif",
};

const settings = definePluginSettings({
    font: {
        description: "Font for Arabic UI text",
        type: OptionType.SELECT,
        options: [
            { label: "Discord default", value: "default", default: true },
            { label: "Cairo", value: "cairo" },
            { label: "Tajawal", value: "tajawal" },
            { label: "Amiri", value: "amiri" },
            { label: "Vazirmatn", value: "vazirmatn" },
        ],
        restartNeeded: true,
    },
});

function loadPacks() {
    clearDiscordLocales();
    clearPluginPacks();

    for (const pack of discordPacks)
        registerDiscordPack(pack);

    registerEnglishPack(enTextAll as Record<string, string>);

    for (const [name, pack] of Object.entries(pluginPacks))
        registerPluginPack(name, pack);
}

function applyFont(font: string) {
    if (!font || font === "default") return;

    const href = FONT_CSS[font];
    const family = FONT_FAMILY[font];
    if (!href || !family) return;

    const fontLink = document.createElement("link");
    fontLink.rel = "stylesheet";
    fontLink.href = href;
    fontLink.id = "vc-arabic-ui-font-link";
    document.head.appendChild(fontLink);

    const style = document.createElement("style");
    style.id = "vc-arabic-ui-font-style";
    style.textContent = `
        :root, html, body, #app-mount {
            --font-primary: ${family} !important;
            --font-display: ${family} !important;
            --font-headline: ${family} !important;
            --font-header: ${family} !important;
            font-family: ${family} !important;
        }

        #app-mount, #app-mount *:not(code):not(pre):not([class*="code"]):not([class*="hljs"]):not(svg):not(path):not(canvas) {
            font-family: ${family} !important;
        }

        code, pre, [class*="codeBlock"], [class*="hljs"], [class*="monospace"] {
            font-family: var(--font-code, ui-monospace, monospace) !important;
        }

        /* End-to-end fix for custom font overflow: hide native scrollbar arrow buttons (⬍) and mini-scrollbars */
        *::-webkit-scrollbar-button {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
        }

        [class*="button"], [class*="input"], [class*="select"], [class*="option"], [class*="badge"], [class*="tag"], [class*="tab"], [class*="label"], [class*="title"], [class*="header"], [class*="text"], [class*="item"], [class*="row"], [class*="card"] {
            scrollbar-width: none;
        }

        [class*="button"]::-webkit-scrollbar,
        [class*="input"]::-webkit-scrollbar,
        [class*="select"]::-webkit-scrollbar,
        [class*="option"]::-webkit-scrollbar,
        [class*="badge"]::-webkit-scrollbar,
        [class*="tag"]::-webkit-scrollbar,
        [class*="tab"]::-webkit-scrollbar,
        [class*="label"]::-webkit-scrollbar,
        [class*="title"]::-webkit-scrollbar,
        [class*="header"]::-webkit-scrollbar,
        [class*="text"]::-webkit-scrollbar,
        [class*="item"]::-webkit-scrollbar,
        [class*="row"]::-webkit-scrollbar,
        [class*="card"]::-webkit-scrollbar {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
        }
    `;
    document.head.appendChild(style);
}

function removeFont() {
    document.getElementById("vc-arabic-ui-font-style")?.remove();
    document.getElementById("vc-arabic-ui-font-link")?.remove();
}

function injectGlobalScrollbarHygiene() {
    if (document.getElementById("vc-arabic-ui-scrollbar-style")) return;
    const style = document.createElement("style");
    style.id = "vc-arabic-ui-scrollbar-style";
    style.textContent = `
        *::-webkit-scrollbar-button {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
        }
    `;
    document.head.appendChild(style);
}

function removeGlobalScrollbarHygiene() {
    document.getElementById("vc-arabic-ui-scrollbar-style")?.remove();
}

export default definePlugin({
    name: "ArabicUI",
    description: "Arabic for Discord and Vencord UI. Turn on, restart once. Missing bits stay English.",
    authors: [Devs.mar, Devs.nyiq],
    tags: ["Appearance"],
    restartNeeded: true,
    settings,

    start() {
        loadPacks();
        installDiscordHook();
        installDomTranslator();
        applyPluginOverlay();
        injectGlobalScrollbarHygiene();
        applyFont(settings.store.font);

        const c = getDiscordCoverage();
        console.info(`[ArabicUI] intlKeys=${c.intlKeys} phrases=${c.englishPhrases}`);
    },

    stop() {
        removePluginOverlay();
        uninstallDomTranslator();
        uninstallDiscordHook();
        removeFont();
        removeGlobalScrollbarHygiene();
    },
});
