/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { makeRange, OptionType } from "@utils/types";

import { apiConstants } from "./lib/api";
import Settings from "./ui/settings";

export default definePluginSettings({
    collapseSongList: {
        type: OptionType.BOOLEAN,
        description: "Collapses the song list on user profiles to a button which opens a separate menu",
        default: false,
    },
    profileSongsLimit: {
        type: OptionType.SLIDER,
        description: "How many songs are shown when initially clicking on a user",
        default: apiConstants.songLimit,
        markers: makeRange(1, 3),
    },
    manager: {
        type: OptionType.COMPONENT,
        component: () => <Settings />,
    },
}, {
    profileSongsLimit: {
        disabled() {
            return this.store.collapseSongList;
        },
    },
});
