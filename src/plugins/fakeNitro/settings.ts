/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export const settings = definePluginSettings({
    enableEmojiBypass: {
        description: "Allows sending fake emojis (also bypasses missing permission to use custom emojis)",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true
    },
    emojiSize: {
        description: "Size of the emojis when sending",
        type: OptionType.SLIDER,
        default: 48,
        markers: [32, 48, 64, 128, 160, 256, 512]
    },
    transformEmojis: {
        description: "Whether to transform fake emojis into real ones",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true
    },
    enableStickerBypass: {
        description: "Allows sending fake stickers (also bypasses missing permission to use stickers)",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true
    },
    stickerSize: {
        description: "Size of the stickers when sending",
        type: OptionType.SLIDER,
        default: 160,
        markers: [32, 64, 128, 160, 256, 512]
    },
    transformStickers: {
        description: "Whether to transform fake stickers into real ones",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true
    },
    transformCompoundSentence: {
        description: "Whether to transform fake stickers and emojis in compound sentences (sentences with more content than just the fake emoji or sticker link)",
        type: OptionType.BOOLEAN,
        default: false
    },
    enableStreamQualityBypass: {
        description: "Allow streaming in nitro quality",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true
    },
    useHyperLinks: {
        description: "Whether to use hyperlinks when sending fake emojis and stickers",
        type: OptionType.BOOLEAN,
        default: true
    },
    hyperLinkText: {
        description: "What text the hyperlink should use. {{NAME}} will be replaced with the emoji/sticker name.",
        type: OptionType.STRING,
        default: "{{NAME}}"
    },
    disableEmbedPermissionCheck: {
        description: "Whether to disable the embed permission check when sending fake emojis and stickers",
        type: OptionType.BOOLEAN,
        default: false
    }
});
