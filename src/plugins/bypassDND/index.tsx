/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { getCurrentChannel } from "@utils/discord";
import definePlugin, { OptionType } from "@utils/types";
import { Menu, UserStore } from "@webpack/common";
import { Message } from "discord-types/general";
import { ReactNode } from "react";

const settings = definePluginSettings({
    bypasseds: {
        type: OptionType.STRING,
        description: "Bypassed users, channels and guilds",
        default: "[]",
        hidden: true
    }
});

function getList(): string[] {
    return JSON.parse(settings.store.bypasseds);
}

function setList(value: string[]) {
    settings.store.bypasseds = JSON.stringify(value);
}

export default definePlugin({
    name: "BypassDND",
    description: "Get notifications from specific sources even in do not disturb mode. Right-click on channels/guilds to set them to bypass do not disturb mode.",
    authors: [Devs.Inbestigator, Devs.rosemary],
    patches: [{
        find: ".getNotifyMessagesInSelectedChannel()&&",
        replacement: {
            match: /MESSAGE_CREATE:function\((\i)\).+?\(0,\i\.\i\)\(\i,\i,!(\i)\)/,
            replace: "$&||$self.shouldNotify($1,$2)"
        }
    }],
    settings,
    shouldNotify(event: { channelId: string; guildId: string; message: Message; }, focused: boolean) {
        const list = getList();
        if (!list.includes(event.channelId) && !list.includes(event.guildId)) return false;
        const currentChannel = getCurrentChannel();
        if (currentChannel && currentChannel.id === event.channelId && focused) return false;
        const user = UserStore.getCurrentUser();
        return event.message.author.id !== user.id;
    },
    contextMenus: {
        "guild-context": patchContext,
        "channel-context": patchContext,
        "user-context": patchContext,
        "gdm-context": patchContext,
        "thread-context": patchContext
    }
});

function patchContext(children: ReactNode[], props: { channel: { id: string; }; } | { guild: { id: string; }; }) {
    const id = "channel" in props ? props.channel.id : "guild" in props ? props.guild.id : undefined;
    if (!id) return;
    const list = getList();
    const isEnabled = list.includes(id);

    children.push(
        <Menu.MenuItem
            id="toggle-dnd-bypass"
            label={`${isEnabled ? "Remove" : "Add"} DND Bypass`}
            icon={() => Icon(isEnabled)}
            action={() => {
                setList(isEnabled ? list.filter(id => id !== id) : [...list, id]);
            }}
        />
    );
}

function Icon(enabled: boolean) {
    return (
        <svg width="18" height="18">
            <circle cx="9" cy="9" r="8" fill={enabled ? "currentColor" : "var(--status-danger)"} />
            <circle cx="9" cy="9" r="3.75" fill={enabled ? "black" : "white"} />
        </svg>
    );
}
