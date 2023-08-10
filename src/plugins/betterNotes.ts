/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Settings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

export default definePlugin({
    name: "BetterNotesBox",
    description: "Hide notes or disable spellcheck (Configure in settings!!)",
    authors: [Devs.Ven],

    patches: [
        {
            find: "hideNote:",
            all: true,
            predicate: () => Vencord.Settings.plugins.BetterNotesBox.hide,
            replacement: {
                match: /hideNote:.+?(?=[,}])/g,
                replace: "hideNote:true",
            }
        }, {
            find: "Messages.NOTE_PLACEHOLDER",
            replacement: {
                match: /\.NOTE_PLACEHOLDER,/,
                replace: "$&spellCheck:!Vencord.Settings.plugins.BetterNotesBox.noSpellCheck,"
            }
        }
    ],

    options: {
        hide: {
            type: OptionType.BOOLEAN,
            description: "Hide notes",
            default: false,
            restartNeeded: true
        },
        noSpellCheck: {
            type: OptionType.BOOLEAN,
            description: "Disable spellcheck in notes",
            disabled: () => Settings.plugins.BetterNotesBox.hide,
            default: false
        }
    }
});
