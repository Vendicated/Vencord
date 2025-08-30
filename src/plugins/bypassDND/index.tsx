/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { ChannelStore, Menu, UserStore } from "@webpack/common";
import { Channel, Guild, User } from "discord-types/general";
import { ReactNode, } from "react";

import BypassManager from "./settings";

export const settings = definePluginSettings({
    bypassManager: {
        type: OptionType.COMPONENT,
        component: BypassManager,
    },
    guilds: {
        type: OptionType.CUSTOM,
        default: [] as string[]
    },
    channels: {
        type: OptionType.CUSTOM,
        default: [] as string[]
    }
});

export default definePlugin({
    name: "BypassDND",
    description: "Receive notifications and calls from specific channels and guilds when in do not disturb mode. Right-click on channels/guilds to allow them to bypass DND mode.",
    authors: [Devs.Inbestigator],
    patches: [{
        find: ".allowAllMessages",
        replacement: [{
            match: /\i,\i,(\i).+?\i.ignoreStatus/,
            replace: "$&&&!$self.shouldNotify($1.id)"
        }, {
            match: /\(\i,(\i)\).+?.getStatus\(\)===\i\.\i\.DND/,
            replace: "$&&&!$self.shouldNotify($1)"
        }]
    }, {
        find: "getIncomingCallChannelIds()",
        replacement: {
            match: /!\i&&(\i).size>0/,
            replace: "$&||Array.from($1).some($self.shouldNotify)"
        }
    }],
    settings,
    shouldNotify(id: string) {
        const channel = ChannelStore.getChannel(id);
        return settings.store.channels.includes(id) || settings.store.guilds.includes(channel.guild_id);
    },
    contextMenus: {
        "guild-context": patchContext,
        "channel-context": patchContext,
        "user-context": patchContext,
        "gdm-context": patchContext,
        "thread-context": patchContext
    }
});

function patchContext(children: ReactNode[], props: { channel: Channel; user?: User; } | { guild: Guild; }) {
    if ("guildId" in props && "user" in props) return; // It would add the guild/current channel to be bypassed instead of that user's DMs
    if ("user" in props && props.user?.id === UserStore.getCurrentUser().id) return;
    if ("channel" in props && props.channel.type === 4) return; // This is a category

    const isChannel = "channel" in props;
    const isGuild = "guild" in props && !isChannel;
    const list = settings.store[isChannel ? "channels" : "guilds"];
    const id = isChannel ? props.channel.id : isGuild ? props.guild.id : undefined;

    if (!id) return;

    const isEnabled = list.includes(id);

    children.push(
        <Menu.MenuItem
            id="toggle-dnd-bypass"
            label={`${isEnabled ? "Remove" : "Add"} DND Bypass`}
            icon={() => <Icon enabled={isEnabled} />}
            action={() => {
                if (isEnabled) {
                    list.splice(list.indexOf(id), 1);
                } else {
                    list.push(id);
                }
            }}
        />
    );
}

function Icon({ enabled }: { enabled: boolean; }) {
    return (
        <svg width="18" height="18">
            <circle cx="9" cy="9" r="8" fill={enabled ? "currentColor" : "var(--status-danger)"} />
            <circle cx="9" cy="9" r="3.75" fill={enabled ? "black" : "white"} />
        </svg>
    );
}
