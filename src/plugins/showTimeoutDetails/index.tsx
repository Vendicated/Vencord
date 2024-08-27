/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { definePluginSettings, migratePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { findComponentLazy } from "@webpack";
import { ChannelStore, GuildMemberStore, i18n, Parser, Text, Tooltip } from "@webpack/common";
import { Message } from "discord-types/general";
import { FunctionComponent, ReactNode } from "react";

import { TimeoutEntry, TimeoutReasonStore, useTimeoutReason } from "./TimeoutReasonStore";



const CountDown = findComponentLazy(m => m.prototype?.render?.toString().includes(".MAX_AGE_NEVER"));

const enum DisplayStyle {
    Tooltip = "tooltip",
    Inline = "ssalggnikool"
}

export const settings = definePluginSettings({
    displayStyle: {
        description: "How to display the timeout duration and reason",
        type: OptionType.SELECT,
        options: [
            { label: "In the Tooltip", value: DisplayStyle.Tooltip },
            { label: "Next to the timeout icon", value: DisplayStyle.Inline, default: true },
        ],
    },
    showReason: {
        description: "Should timeout reasons be shown?",
        type: OptionType.BOOLEAN,
        default: false
    }
});

function renderTimeout(message: Message, inline: boolean, reason?: TimeoutEntry) {
    const guildId = ChannelStore.getChannel(message.channel_id)?.guild_id;
    if (!guildId) return null;

    const member = GuildMemberStore.getMember(guildId, message.author.id);
    if (!member?.communicationDisabledUntil) return null;

    const countdown = () => (
        <CountDown
            deadline={new Date(member.communicationDisabledUntil!)}
            showUnits
            stopAtOneSec
        />
    );

    return inline
        ? countdown()
        : <>
            {i18n.Messages.GUILD_ENABLE_COMMUNICATION_TIME_REMAINING.format({
                username: message.author.username,
                countdown
            })}
            {reason && <Reason isTooltip reason={reason!} message={message} />}
        </>;
}


function Reason({ isTooltip, reason, message }: { isTooltip?: boolean, reason: TimeoutEntry; message: Message; }) {
    if (reason.loading) return null;
    const details = [
        reason.moderator && Parser.parse(`<@${reason.moderator}>`, true, {
            channelId: message.channel_id,
            messageId: message.id
        }),
        reason.automod && Parser.parse(`**${i18n.Messages.GUILD_SETTINGS_AUTOMOD_TITLE}**` + (() => {
            const automodDetails = [
                reason.automodRuleName,
                reason.automodChannelId && `<#${reason.automodChannelId}>`,
            ].filter(Boolean);
            if (automodDetails.length) return ": " + automodDetails.join(" ");
            return "";
        })(), true, {
            channelId: message.channel_id,
            messageId: message.id
        }),
        reason.reason
    ];
    if (!details.some(Boolean)) return null;
    const result = [
        isTooltip ? <div className={Margins.bottom8} /> : <span className="vc-std-wrapper-text">: </span>,
        ...details.flatMap(i => [i, " "])
    ];
    result.pop();
    return result;
}

migratePluginSettings("ShowTimeoutDetails", "ShowTimeoutDuration");

export default definePlugin({
    name: "ShowTimeoutDetails",
    description: "Shows how much longer a user's timeout will last and why they are timed out, either in the timeout icon tooltip or next to it",
    authors: [Devs.Ven, Devs.Sqaaakoi],
    tags: ["ShowTimeoutDuration", "ShowTimeoutReason"],

    settings,

    patches: [
        {
            find: ".GUILD_COMMUNICATION_DISABLED_ICON_TOOLTIP_BODY",
            replacement: [
                {
                    match: /(\i)\.Tooltip,{(text:.{0,30}\.Messages\.GUILD_COMMUNICATION_DISABLED_ICON_TOOLTIP_BODY)/,
                    replace: "$self.TooltipWrapper,{message:arguments[0].message,$2"
                }
            ]
        }
    ],

    TimeoutReasonStore,

    TooltipWrapper: ErrorBoundary.wrap(({ message, children, text }: { message: Message; children: FunctionComponent<any>; text: ReactNode; }) => {
        const guildId = ChannelStore.getChannel(message.channel_id)?.guild_id;
        const timeoutReason = useTimeoutReason(guildId, message.author.id);

        if (settings.store.displayStyle === DisplayStyle.Tooltip) return <Tooltip
            text={renderTimeout(message, false, settings.store.showReason ? timeoutReason : undefined)}
            children={(props: any) => (
                <span className={classes("vc-std-icon", timeoutReason.automod && "vc-std-automod")}>
                    {children(props)}
                </span>
            )}
        />;
        return (
            <div className={classes("vc-std-wrapper", timeoutReason.automod && "vc-std-automod")}>
                <Tooltip text={text} children={children} />
                <Text variant="text-md/normal">
                    <span className="vc-std-wrapper-text">{renderTimeout(message, true)} timeout remaining</span>
                    {settings.store.showReason && <Reason reason={timeoutReason} message={message} />}
                </Text>
            </div>
        );
    }, { noop: true }),
});
