/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { getCurrentChannel } from "@utils/discord";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";

interface EmojiNode {
    type: "emoji";
    name: string;
    surrogate: string;
}

const { sendMessage } = findByPropsLazy("sendMessage", "editMessage");

function sendEmote(node: EmojiNode) {
    sendMessage(getCurrentChannel()?.id, {
        content: settings.store.withName ? `${node.surrogate} - ${node.name.replace(":", "\\:")}` : node.surrogate
    });
}

const settings = definePluginSettings({
    withName: {
        type: OptionType.BOOLEAN,
        description: "Include the emoji's name",
        default: false,
    }
});

export default definePlugin({
    name: "Your Plugin",
    description: "This plugin does something cool",
    authors: [{
        name: "You!",
        id: 0n
    }],

    patches: [{
        find: ".EMOJI_POPOUT_STANDARD_EMOJI_DESCRIPTION",
        replacement: {
            match: /(?<=.primaryEmoji,src:(\i).{0,400}).Messages.EMOJI_POPOUT_STANDARD_EMOJI_DESCRIPTION}\)]/,
            replace: "$&.concat([$self.EmojiButton($1)])"
        }
    }],

    settings,

    EmojiButton(node: EmojiNode) {
        return "1234";
    }
});
