/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByCodeLazy } from "@webpack";

const flashPageTitle = findByCodeLazy("=>({flashQueue:[...");
const rootTitle = { base: null as string | null };

export const settings = definePluginSettings({
    title: {
        type: OptionType.STRING,
        default: "Equicord",
        description: "Window title prefix",
        onChange: setTitle,
    },
});

function setTitle(v: string) {
    rootTitle.base = v || null;
    flashPageTitle({ messages: 0 })();
}

export default definePlugin({
    name: "Title",
    description: "Replaces the window title prefix",
    authors: [Devs.Kyuuhachi],
    settings,

    patches: [
        {
            find: 'isPlatformEmbedded?void 0:"Discord"',
            replacement: {
                match: /\{base:\i\("?\d+?"?\)\.isPlatformEmbedded\?void 0:"Discord"\}/,
                replace: "$self.rootTitle",
            },
        },
    ],

    start() {
        setTitle(settings.store.title);
    },

    rootTitle,
});
