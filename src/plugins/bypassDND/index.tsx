/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Button, ChannelStore, Forms, GuildStore, Menu, UserStore, useState } from "@webpack/common";
import { Channel, User } from "discord-types/general";
import { ReactNode, } from "react";

type BypassedItem = `g:${string}` | `c:${string}`;

const settings = definePluginSettings({
    stats: {
        type: OptionType.COMPONENT,
        component: () => {
            const [isGuildExtended, setIsGuildExtended] = useState(false);
            const [isChannelExtended, setIsChannelExtended] = useState(false);
            const list = getList();
            const channels = list.filter(x => x.startsWith("c:"));
            const guilds = list.filter(x => x.startsWith("g:"));
            return (
                <>
                    <Forms.FormSection>
                        <Forms.FormTitle tag="h3">Allowed channels</Forms.FormTitle>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                            {(isChannelExtended ? channels : channels.slice(0, 5)).map(c => {
                                const channel = ChannelStore.getChannel(c.slice(2));
                                const guild = channel.guild_id ? GuildStore.getGuild(channel.guild_id) : { id: "@me" };
                                const recipient = channel.rawRecipients ? channel.rawRecipients[0] as typeof channel.rawRecipients[0] & { global_name: string; } : { global_name: "Unknown" };
                                return (
                                    <BypassListItem key={c} name={`${channel.name.length ? channel.name : recipient.global_name}${"name" in guild ? ` › ${guild.name}` : ""}`} id={c} />
                                );
                            })}
                        </div>
                        {channels.length > 5 && <Button style={{ marginTop: "4px" }} look={Button.Looks.LINK} color={Button.Colors.TRANSPARENT} size={Button.Sizes.TINY} onClick={_ => setIsChannelExtended(!isChannelExtended)}>Show {isChannelExtended ? "less" : "more"}</Button>}
                        {channels.length === 0 && <Forms.FormText style={{ color: "var(--text-muted)" }}>No channels are allowed to bypass yet.</Forms.FormText>}
                    </Forms.FormSection>
                    <Forms.FormDivider />
                    <Forms.FormSection>
                        <Forms.FormTitle tag="h3">Allowed guilds</Forms.FormTitle>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                            {(isGuildExtended ? guilds : guilds.slice(0, 5)).map(g => {
                                const guild = GuildStore.getGuild(g.slice(2));
                                return <BypassListItem key={g} name={guild.name} id={g} />;
                            })}
                        </div>
                        {guilds.length > 5 && <Button style={{ marginTop: "4px" }} look={Button.Looks.LINK} color={Button.Colors.TRANSPARENT} size={Button.Sizes.TINY} onClick={_ => setIsGuildExtended(!isGuildExtended)}>Show {isGuildExtended ? "less" : "more"}</Button>}
                        {guilds.length === 0 && <Forms.FormText style={{ color: "var(--text-muted)" }}>No guilds are allowed to bypass yet.</Forms.FormText>}
                    </Forms.FormSection>
                </>
            );
        }
    },
    bypasseds: {
        type: OptionType.STRING,
        description: "List of allowed channels and guilds",
        default: "[]",
        hidden: true
    }
});

function getList(): BypassedItem[] {
    return JSON.parse(settings.store.bypasseds);
}

function setList(value: BypassedItem[]) {
    settings.store.bypasseds = JSON.stringify(value);
}

export default definePlugin({
    name: "BypassDND",
    description: "Get notifications from specific sources when in do not disturb mode. Right-click on channels/guilds to allow them to bypass do not disturb mode.",
    authors: [Devs.Inbestigator, Devs.rosemary],
    patches: [{
        find: ".allowAllMessages(",
        replacement: {
            match: /(\i,\i,(\i).+?)\i.ignoreStatus/,
            replace: "$1$self.shouldNotify($2)"
        }
    }],
    settings,
    shouldNotify(channel: Channel) {
        const list = getList();
        return (list.includes(`c:${channel.id}`) || list.includes(`g:${channel.guild_id}`) || list.includes(`c:${channel.parent_id}`));
    },
    contextMenus: {
        "guild-context": patchContext,
        "channel-context": patchContext,
        "user-context": patchContext,
        "gdm-context": patchContext,
        "thread-context": patchContext
    }
});

function patchContext(children: ReactNode[], props: { channel: { id: string; }; guildId?: string; user?: User; } | { guild: { id: string; }; }) {
    // Escape user context when in a guild channel
    if ("guildId" in props && "user" in props || "user" in props && props.user?.id === UserStore.getCurrentUser().id) return;
    const id = "channel" in props ? props.channel.id : "guild" in props ? props.guild.id : undefined;
    if (!id) return;
    let list = getList();
    const isEnabled = list.some(x => x.endsWith(`:${id}`));

    children.push(
        <Menu.MenuItem
            id="toggle-dnd-bypass"
            label={`${isEnabled ? "Remove" : "Add"} DND Bypass`}
            icon={() => <Icon enabled={isEnabled} />}
            action={() => {
                if (isEnabled) {
                    list = list.filter(x => !x.endsWith(`:${id}`));
                } else {
                    list.push(`${("channel" in props) ? "c" : "g"}:${id}`);
                }
                setList(list);
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

function BypassListItem({ name, id }: { name: string; id: string; }) {
    const [isHovering, setIsHovering] = useState(false);
    return (
        <Button onMouseOver={_ => setIsHovering(true)} onMouseOut={_ => setIsHovering(false)} color={isHovering ? Button.Colors.RED : Button.Colors.TRANSPARENT} size={Button.Sizes.TINY} onClick={_ => setList(getList().filter(x => x !== id))}>
            {name}
        </Button>
    );
}
