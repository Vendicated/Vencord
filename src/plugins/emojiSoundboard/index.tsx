/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";

import { EmojiSoundboardSettings } from "./EmojiSoundboardSettings";

const settings = definePluginSettings({
    emojiSounds: {
        type: OptionType.COMPONENT,
        component: EmojiSoundboardSettings,
        description: "",
    }
});

export default definePlugin({
    name: "!Emoji Soundboard",
    description: "chaos!!!",
    authors: [
        {
            id: 423699849767288853n,
            name: "battlesqui_d",
        },
    ],
    patches: [],
    settings,
    // Delete these two below if you are only using code patches
    start() { },
    stop() { },
});
