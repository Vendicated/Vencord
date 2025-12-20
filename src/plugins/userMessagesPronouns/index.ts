/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { migratePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import { CompactPronounsChatComponentWrapper, PronounsChatComponentWrapper } from "./PronounsChatComponent";
import { settings } from "./settings";

migratePluginSettings("UserMessagesPronouns", "PronounDB");
export default definePlugin({
    name: "UserMessagesPronouns",
    authors: [Devs.Tyman, Devs.TheKodeToad, Devs.Ven, Devs.Elvyra],
    description: "Adds pronouns to chat user messages",
    settings,

    patches: [
        {
            find: "showCommunicationDisabledStyles",
            replacement: {
                // Add next to timestamp (normal mode)
                match: /(?<=return\s*\(0,\i\.jsxs?\)\(.+!\i&&)(\(0,\i.jsxs?\)\(.+?\{.+?\}\))/,
                replace: "[$1, $self.PronounsChatComponentWrapper(arguments[0])]"
            }
        },
        {
            find: '="SYSTEM_TAG"',
            replacement: [
                {
                    // Add next to username (compact mode)
                    match: /className:\i\(\)\(\i\.className(?:,\i\.clickable)?,\i\)}\)\),(?=\i)/g,
                    replace: "$&$self.CompactPronounsChatComponentWrapper(arguments[0]),",
                },
            ]
        }
    ],

    PronounsChatComponentWrapper,
    CompactPronounsChatComponentWrapper,
});
