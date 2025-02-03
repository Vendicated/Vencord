/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "MoreThemes",
    description: "Enables Darker and Midnight themes",
    authors: [Devs.Kyuuhachi],

    patches: [
        { // matches twice: the settings menu and the settings context menu
            find: '("appearance_settings")',
            replacement: {
                match: /\("appearance_settings"\)/,
                replace: "$&||true"
            },
            all: true,
        },
        { // make it actually save the setting instead of falling back to dark
            find: ')("ThemeStore"))return',
            replacement: {
                match: /(?<=\)\("ThemeStore"\))(?=\)return)/,
                replace: "&&false"
            },
        }
    ],
});
