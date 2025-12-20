/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings, Settings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { canonicalizeMatch } from "@utils/patches";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
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
});

export default definePlugin({
    name: "BetterNotesBox",
    description: "Hide notes or disable spellcheck (Configure in settings!!)",
    authors: [Devs.Ven],
    settings,

    patches: [
        {
            find: "hideNote:",
            all: true,
            // Some modules match the find but the replacement is returned untouched
            noWarn: true,
            predicate: () => settings.store.hide,
            replacement: {
                match: /hideNote:.+?(?=([,}].*?\)))/g,
                replace: (m, rest) => {
                    const destructuringMatch = rest.match(/}=.+/);
                    if (destructuringMatch) {
                        const defaultValueMatch = m.match(canonicalizeMatch(/hideNote:(\i)=!?\d/));
                        return defaultValueMatch ? `hideNote:${defaultValueMatch[1]}=!0` : m;
                    }

                    return "hideNote:!0";
                }
            }
        },
        {
            find: "#{intl::NOTE_PLACEHOLDER}",
            replacement: {
                match: /#{intl::NOTE_PLACEHOLDER}\),/,
                replace: "$&spellCheck:!$self.noSpellCheck,"
            }
        }
    ],

    get noSpellCheck() {
        return settings.store.noSpellCheck;
    }
});
