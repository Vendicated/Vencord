/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Margins } from "@utils/margins";
import definePlugin, { OptionType } from "@utils/types";
import { Button, Forms, Select, useMemo } from "@webpack/common";

const settings = definePluginSettings({
    fontUrl: {
        type: OptionType.STRING,
        description: "External font URL Google Fonts",
        default: "",
        onChange: applyStyles,
    },
    fontSelector: {
        type: OptionType.COMPONENT,
        component: FontSelectorComponent,
    },
    fontFamily: {
        type: OptionType.STRING,
        description: "Font family name",
        default: "gg sans, Noto Sans, Helvetica Neue, Helvetica, Arial, sans-serif",
        onChange: applyStyles,
    },
    fontSize: {
        type: OptionType.SLIDER,
        description: "Font size in pixels",
        markers: [10, 12, 14, 16, 18, 20, 24, 28, 32],
        default: 16,
        stickToMarkers: false,
        onChange: applyStyles,
    },
    fontWeight: {
        type: OptionType.SELECT,
        description: "Font weight",
        options: [
            { label: "Normal (400)", value: "400", default: true },
            { label: "Medium (500)", value: "500" },
            { label: "SemiBold (600)", value: "600" },
            { label: "Bold (700)", value: "700" },
            { label: "ExtraBold (800)", value: "800" },
        ],
        onChange: applyStyles,
    },
    lineHeight: {
        type: OptionType.SLIDER,
        description: "Line height multiplier",
        markers: [1, 1.2, 1.4, 1.6, 1.8, 2, 2.5],
        default: 1.4,
        stickToMarkers: false,
        onChange: applyStyles,
    },
    letterSpacing: {
        type: OptionType.SLIDER,
        description: "Letter spacing in pixels",
        markers: [-1, -0.5, 0, 0.5, 1, 2],
        default: 0,
        stickToMarkers: false,
        onChange: applyStyles,
    },
    applyToCodeBlocks: {
        type: OptionType.BOOLEAN,
        description: "Apply custom font to code blocks",
        default: false,
        onChange: applyStyles,
    },
    applyToUsernames: {
        type: OptionType.BOOLEAN,
        description: "Apply custom font to usernames",
        default: true,
        onChange: applyStyles,
    },
    resetSettings: {
        type: OptionType.COMPONENT,
        component: ResetSettingsComponent,
    },
});

let styleEl: HTMLStyleElement | null = null;
let linkEl: HTMLLinkElement | null = null;

function quoteFontFamily(font: string): string {
    const trimmed = font.trim();
    return trimmed.includes(" ") ? `"${trimmed}"` : trimmed;
}

function extractGoogleFontsUrl(input: string): string {
    if (!input) return "";
    if (input.includes("fonts.googleapis.com/css2")) {
        const match = input.match(
            /https:\/\/fonts\.googleapis\.com\/css2[^"'\s>]*/
        );
        return match ? match[0] : input;
    }
    const match = input.match(/href="([^"]*fonts\.googleapis\.com\/css2[^"]*)"/);
    if (match) return match[1];
    return input;
}

function applyStyles() {
    const {
        fontUrl,
        fontFamily,
        fontSize,
        fontWeight,
        lineHeight,
        letterSpacing,
        applyToCodeBlocks,
        applyToUsernames,
    } = settings.store;

    const processedFontUrl = extractGoogleFontsUrl(fontUrl);

    if (processedFontUrl) {
        if (!linkEl) {
            linkEl = document.createElement("link");
            linkEl.rel = "stylesheet";
            linkEl.id = "vc-custom-font-link";
            document.head.appendChild(linkEl);
        }
        if (linkEl.href !== processedFontUrl) {
            linkEl.href = processedFontUrl;
        }
    } else if (linkEl) {
        linkEl.remove();
        linkEl = null;
    }

    if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = "vc-custom-font";
        document.head.appendChild(styleEl);
    }

    const quotedFontFamily = fontFamily
        .split(",")
        .map(f => quoteFontFamily(f))
        .join(", ");

    const baseSelectors = `
body, input, textarea, button, [contenteditable],
[class*="message"], [class*="markup"], [class*="text"],
[class*="title"], [class*="header"] `.trim();

    const usernameSelectors = applyToUsernames
        ? ', [class*="username"], [class*="name"], [class*="nickname"]'
        : "";
    const codeBlockSelectors = applyToCodeBlocks
        ? ', [class*="code"], [class*="inline"], code, pre'
        : "";

    const allSelectors = `${baseSelectors}${usernameSelectors}${codeBlockSelectors}`;
    styleEl.textContent = `
${allSelectors} {
    font-family: ${quotedFontFamily} !important;
    font-size: ${fontSize}px !important;
    font-weight: ${fontWeight} !important;
    line-height: ${lineHeight} !important;
    letter-spacing: ${letterSpacing}px !important;
}
`;
}

function parseGoogleFontFamilies(url: string): string[] {
    if (!url.includes("fonts.googleapis.com")) return [];
    const families: string[] = [];
    const regex = /family=([^&]+)/g;
    let match;
    while ((match = regex.exec(url)) !== null) {
        const raw = decodeURIComponent(match[1]);
        const baseName = raw.split(":")[0].trim();
        if (baseName) families.push(baseName);
    }
    return [...new Set(families)];
}

function FontSelectorComponent() {
    const { fontUrl, fontFamily } = settings.use(["fontUrl", "fontFamily"]);
    const families = useMemo(() => parseGoogleFontFamilies(fontUrl), [fontUrl]);
    if (families.length === 0) {
        return (
            <Forms.FormText className={Margins.top8}>
                Enter a valid Google Fonts URL to select fonts
            </Forms.FormText>
        );
    }

    return (
        <div className={Margins.top8}>
            <Forms.FormTitle tag="h5">Select Font Family</Forms.FormTitle>
            <Select
                options={families.map(f => ({
                    label: f,
                    value: f,
                    default: fontFamily === f,
                }))}
                select={v => {
                    settings.store.fontFamily = v;
                    applyStyles();
                }}
                isSelected={v => v === fontFamily}
                serialize={v => v}
                closeOnSelect={true}
            />
        </div>
    );
}

function ResetSettingsComponent() {
    const s = settings.use();

    return (
        <div className={Margins.top8}>
            <Button
                color={Button.Colors.RED}
                onClick={() => {
                    s.fontUrl = "";
                    s.fontFamily = "gg sans, Noto Sans, Helvetica Neue, Helvetica, Arial, sans-serif";
                    s.fontSize = 16;
                    s.fontWeight = "400";
                    s.lineHeight = 1.4;
                    s.letterSpacing = 0;
                    s.applyToCodeBlocks = false;
                    s.applyToUsernames = true;
                    applyStyles();
                }}
            >
                Reset All Settings
            </Button>
        </div>
    );
}

export default definePlugin({
    name: "FontStyler",
    description:
        "Customize Discord font family, size, weight, and import external fonts",
    authors: [{ name: "mgv-hub", id: 1379675201616347259n }],
    settings,
    start() {
        applyStyles();
    },
    stop() {
        styleEl?.remove();
        styleEl = null;
        linkEl?.remove();
        linkEl = null;
    },
});
