/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";

import { EmojiSoundboardSettings } from "./EmojiSoundboardSettings";
import { classNameFactory } from "@api/Styles";

export type EmojiSound = {
    emoji: string;
    sound: string;
    caseSensitive: boolean;
};

export const EMPTY_SOUND = { emoji: "", sound: "", caseSensitive: false };
export const DEFAULT_SOUNDS: EmojiSound[] = [EMPTY_SOUND];

export const classFactory = classNameFactory("vc-es-");

export const settings = definePluginSettings({
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
    start() {
        if (settings.store.emojiSounds) {
            console.log(settings.store.emojiSounds);
            return;
        }
        settings.store.emojiSounds = DEFAULT_SOUNDS;
    },
    stop() { },
});
