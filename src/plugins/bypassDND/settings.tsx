/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import { Button, ChannelStore, Forms, GuildStore, Parser, useState } from "@webpack/common";

import { settings } from "./index";

interface MentionElement { children: MentionElement[]; className: string; }
type ParsedMention = React.ReactElement<MentionElement>;

const cl = classNameFactory("vc-bdnd-");

export default function BypassManager() {
    const [isGuildExtended, setIsGuildExtended] = useState(false);
    const [isChannelExtended, setIsChannelExtended] = useState(false);
    const { channels, guilds } = settings.store;

    return (
        <>
            <Forms.FormSection title="Allowed channels">
                <div className={cl("list-container")}>
                    {(isChannelExtended ? channels : channels.slice(0, 5)).map(c => {
                        const channel = ChannelStore.getChannel(c);
                        if (!channel) {
                            channels.splice(channels.indexOf(c), 1);
                            return null;
                        }
                        const guildId = channel.guild_id ? channel.guild_id : "@me";
                        const [mention] = Parser.parse(`https://discord.com/channels/${guildId}/${channel.id}`) as ParsedMention[];
                        return (
                            <BypassListItem key={c} id={c} list={channels}>
                                {mention}
                            </BypassListItem>
                        );
                    })}
                </div>
                <ListOverflowUnderFlow length={channels.length} setIsExtended={setIsChannelExtended} isExtended={isChannelExtended} type="channel" />
            </Forms.FormSection>
            <Forms.FormSection title="Allowed guilds">
                <div className={cl("list-container")}>
                    {(isGuildExtended ? guilds : guilds.slice(0, 5)).map(g => {
                        const guild = GuildStore.getGuild(g);
                        if (!guild) {
                            guilds.splice(guilds.indexOf(g), 1);
                            return null;
                        }
                        const [mention] = Parser.parse(`https://discord.com/channels/${guild.id}/0`) as ParsedMention[];
                        mention.props.children = [mention.props.children[0]];
                        return <BypassListItem key={g} id={g} list={guilds} >{mention}</BypassListItem>;
                    })}
                </div>
                <ListOverflowUnderFlow length={guilds.length} setIsExtended={setIsGuildExtended} isExtended={isGuildExtended} type="guild" />
            </Forms.FormSection>
        </>
    );
}

function BypassListItem({ children, id, list }: { children: ParsedMention; id: string; list: string[]; }) {
    if (!children) return null;
    const child = children;
    return (
        {
            ...child, props: { ...child.props, className: `${child.props.className} ${cl("list-item")}`, onClick: () => list.splice(list.indexOf(id), 1) }
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
