/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    defaultMode: {
        type: OptionType.SELECT,
        options: [
            { label: "List", value: 1, default: true },
            { label: "Gallery", value: 2 }
        ],
        description: "Which mode to use as default"
    }
});

export default definePlugin({
    name: "OverrideForumView",
    description: "Override default forum view mode, you can still set the mode within the forum.",
    authors: [Devs.Inbestigator],
    patches: [
        {
            find: "getDefaultLayout(){",
            replacement: {
                match: /return this\.isMediaChannel\(\)\?r\.ForumLayout\.GRID:null==this\.defaultForumLayout\|\|this\.defaultForumLayout===r\.ForumLayout\.DEFAULT\?r\.ForumLayout\.LIST:this\.defaultForumLayout/,
                replace: "return $self.getMode()"
            }
        }
    ],
    getMode: (): number => { return settings.store.defaultMode ?? 0; },
    settings
});
