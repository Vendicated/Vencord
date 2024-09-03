/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classes, Margins } from "@utils/index";
import { findByPropsLazy } from "@webpack";
import { ChannelStore, GuildMemberStore, i18n, Popout, Text, Tooltip } from "@webpack/common";
import { Message } from "discord-types/general";
import { FunctionComponent, ReactNode } from "react";

import { CountDown, DisplayStyle, settings } from "..";
import { useTimeoutReason } from "../TimeoutReasonStore";
import TimeoutDetailsPopout from "./TimeoutDetailsPopout";

const clickableClasses = findByPropsLazy("clickable", "avatar", "username");

export default function TooltipWrapper({ message, children, text }: { message: Message; children: FunctionComponent<any>; text: ReactNode; }) {
    const guildId = ChannelStore.getChannel(message.channel_id)?.guild_id;
    const timeoutReason = useTimeoutReason(guildId, message.author.id);

    if (settings.store.displayStyle === DisplayStyle.Tooltip) return <Tooltip
        tooltipClassName="vc-std-tooltip"
        text={renderTimeout(message, false)}
        children={(props: any) => (
            <Popout
                position="top"
                align="left"
                renderPopout={p => <TimeoutDetailsPopout {...p} guildId={guildId} userId={message.author.id} message={message} />}
            >
                {popoutProps => <span
                    {...popoutProps}
                    className={classes("vc-std-icon", clickableClasses.clickable, timeoutReason.automod && "vc-std-automod")}
                    onClick={e => { e.stopPropagation(); popoutProps.onClick(e); }} // stop double click to reply/edit
                >
                    {children(props)}
                </span>}
            </Popout>
        )}
    />;
    return (
        <Popout
            position="top"
            align="left"
            renderPopout={p => <TimeoutDetailsPopout {...p} guildId={guildId} userId={message.author.id} message={message} />}
        >
            {popoutProps => <div
                {...popoutProps}
                className={classes("vc-std-wrapper", clickableClasses.clickable, timeoutReason.automod && "vc-std-automod")}
                onClick={e => { e.stopPropagation(); popoutProps.onClick(e); }} // stop double click to reply/edit
            >
                <Tooltip text={text} children={children} />
                <span className={Margins.right8} />
                <Text variant="text-md/normal" className="vc-std-wrapper-text">
                    {renderTimeout(message, true)} timeout remaining
                </Text>
            </div>}
        </Popout>
    );
}

function renderTimeout(message: Message, inline: boolean) {
    const guildId = ChannelStore.getChannel(message.channel_id)?.guild_id;
    if (!guildId) return null;

    const member = GuildMemberStore.getMember(guildId, message.author.id);
    if (!member?.communicationDisabledUntil) return null;

    const countdown = () => <>
        <wbr />
        <span style={{ whiteSpace: "nowrap" }}>
            <CountDown
                deadline={new Date(member.communicationDisabledUntil!)}
                showUnits
                stopAtOneSec
            />
        </span>
        <wbr />
    </>;

    return inline
        ? countdown()
        : <>
            {i18n.Messages.GUILD_ENABLE_COMMUNICATION_TIME_REMAINING.format({
                username: message.author.username,
                countdown
            })}
            <br />
            Click for more details.
        </>;
}
