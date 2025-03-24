/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import { classNameFactory } from "@api/Styles";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Button, ChannelStore, Forms, GuildStore, Menu, Parser, UserStore, useState } from "@webpack/common";
import { Channel, Guild, User } from "discord-types/general";
import { JSX, ReactNode, } from "react";

const cl = classNameFactory("vc-bdnd-");

type BypassedItem = `g:${string}` | `c:${string}`;

const settings = definePluginSettings({
    bypasseds: {
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
                        <div className={cl("list-container")}>
                            {(isChannelExtended ? channels : channels.slice(0, 5)).map(c => {
                                const channel = ChannelStore.getChannel(c.slice(2));
                                if (!channel) {
                                    setList(getList().filter(x => x !== c));
                                    return null;
                                }
                                const guildId = channel.guild_id ? channel.guild_id : "@me";
                                return (
                                    <BypassListItem key={c} id={c}>
                                        {Parser.parse(`https://discord.com/channels/${guildId}/${channel.id}`)}
                                    </BypassListItem>
                                );
                            })}
                        </div>
                        <ListOverflowUnderFlow length={channels.length} setIsExtended={setIsChannelExtended} isExtended={isChannelExtended} type="channel" />
                    </Forms.FormSection>
                    <Forms.FormDivider />
                    <Forms.FormSection>
                        <Forms.FormTitle tag="h3">Allowed guilds</Forms.FormTitle>
                        <div className={cl("list-container")}>
                            {(isGuildExtended ? guilds : guilds.slice(0, 5)).map(g => {
                                const guild = GuildStore.getGuild(g.slice(2));
                                if (!guild) {
                                    setList(getList().filter(x => x !== g));
                                    return null;
                                }
                                const mention = Parser.parse(`https://discord.com/channels/${guild.id}/0`);
                                (mention[0] as JSX.Element).props.children = [(mention[0] as JSX.Element).props.children[0]];
                                return <BypassListItem key={g} id={g} >{mention}</BypassListItem>;
                            })}
                        </div>
                        <ListOverflowUnderFlow length={guilds.length} setIsExtended={setIsGuildExtended} isExtended={isGuildExtended} type="guild" />
                    </Forms.FormSection>
                </>
            );
        },
        default: [] as BypassedItem[]
    },
});

function getList() {
    return settings.store.bypasseds;
}

function setList(value: BypassedItem[]) {
    settings.store.bypasseds = value;
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
        return (list.includes(`c:${channel.id}`) || list.includes(`g:${channel.guild_id}`));
    },
    contextMenus: {
        "guild-context": patchContext,
        "channel-context": patchContext,
        "user-context": patchContext,
        "gdm-context": patchContext,
        "thread-context": patchContext
    }
});

function patchContext(children: ReactNode[], props: { channel: Channel; guildId?: string; user?: User; } | { guild: Guild; }) {
    // Escape user context when in a guild channel
    if ("guildId" in props && "user" in props || "user" in props && props.user?.id === UserStore.getCurrentUser().id || "channel" in props && props.channel.type === 4) return;
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

function BypassListItem({ children, id }: { children: ReactNode; id: string; }) {
    return (
        {
            ...children![0], props: { ...children![0].props, className: `${children![0].props.className} ${cl("list-item")}`, onClick: () => setList(getList().filter(x => x !== id)) }
        }
    );
}

function ListOverflowUnderFlow({ length, setIsExtended, isExtended, type }: { length: number; setIsExtended: (val: boolean) => void; isExtended: boolean; type: string; }) {
    return (
        <>
            {length > 5 && <Button style={{ marginTop: "4px" }} look={Button.Looks.LINK} color={Button.Colors.TRANSPARENT} size={Button.Sizes.TINY} onClick={_ => setIsExtended(!isExtended)}>Show {isExtended ? "less" : "more"}</Button>}
            {length === 0 && <Forms.FormText style={{ color: "var(--text-muted)" }}>No {type}s are allowed to bypass yet.</Forms.FormText>}
        </>
    );
}
