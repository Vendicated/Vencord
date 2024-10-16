/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated, nickwoah, and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import { insertTextIntoChatInputBox } from "@utils/discord";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { Menu, UserStore } from "@webpack/common";
import { Channel } from "discord-types/general";

const SortedVoiceStateStore = findByPropsLazy("getVoiceStatesForChannel");

function getVoiceChannelMentions(channel: Channel) {
    return SortedVoiceStateStore.getVoiceStatesForChannel(channel)
        .filter((value: any) => value.user.id !== UserStore.getCurrentUser().id)
        .map((value: any) => {
            return `<@${value.user.id}>`;
        })
        .join(" ");
}

function isInVoiceChannel(channel: Channel) {
    return SortedVoiceStateStore.getVoiceStatesForChannel(channel)
        .some((value: any) => value.user.id == UserStore.getCurrentUser().id);
}

export default definePlugin({
    name: "VoiceChatMention",
    description: "Adds a context menu button to put mentions of all users in your voice chat in the text box.",
    authors: [Devs.nickwoah],
    contextMenus: {
        "channel-context"(children, { channel }: { channel: Channel; }) {
            if (channel.isVocal() && isInVoiceChannel(channel)) children.push(
                <Menu.MenuItem
                    id="voice-mention-all-users"
                    label="Mention All Users"
                    action={async () => {
                        insertTextIntoChatInputBox(getVoiceChannelMentions(channel));
                    }}
                />
            );
        }
    }
});
