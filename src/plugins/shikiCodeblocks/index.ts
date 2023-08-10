/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./shiki.css";

import { enableStyle } from "@api/Styles";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import previewExampleText from "~fileContent/previewExample.tsx";

import { shiki } from "./api/shiki";
import { createHighlighter } from "./components/Highlighter";
import deviconStyle from "./devicon.css?managed";
import { settings } from "./settings";
import { DeviconSetting } from "./types";
import { clearStyles } from "./utils/createStyle";

export default definePlugin({
    name: "ShikiCodeblocks",
    description: "Brings vscode-style codeblocks into Discord, powered by Shiki",
    authors: [Devs.Vap],
    patches: [
        {
            find: "codeBlock:{react:function",
            replacement: {
                match: /codeBlock:\{react:function\((\i),(\i),(\i)\)\{/,
                replace: "$&return $self.renderHighlighter($1,$2,$3);",
            },
        },
    ],
    start: async () => {
        if (settings.store.useDevIcon !== DeviconSetting.Disabled)
            enableStyle(deviconStyle);

        await shiki.init(settings.store.customTheme || settings.store.theme);
    },
    stop: () => {
        shiki.destroy();
        clearStyles();
    },
    settingsAboutComponent: ({ tempSettings }) => createHighlighter({
        lang: "tsx",
        content: previewExampleText,
        isPreview: true,
        tempSettings,
    }),
    settings,

    // exports
    shiki,
    createHighlighter,
    renderHighlighter: ({ lang, content }: { lang: string; content: string; }) => {
        return createHighlighter({
            lang,
            content,
            isPreview: false,
        });
    },
});
