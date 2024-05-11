/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { Margins } from "@utils/margins";
import definePlugin, { OptionType } from "@utils/types";
import { findComponentLazy } from "@webpack";
import { ChannelStore, Forms, GuildMemberStore, i18n, Text, Tooltip } from "@webpack/common";
import { Message } from "discord-types/general";
import { FunctionComponent, ReactNode } from "react";

const CountDown = findComponentLazy(m => m.prototype?.render?.toString().includes(".MAX_AGE_NEVER"));

const enum DisplayStyle {
    Tooltip = "tooltip",
    SimplifiedTooltip = "simplifiedTooltip",
    Inline = "ssalggnikool"
}

const settings = definePluginSettings({
    displayStyle: {
        description: "How to display the timeout duration",
        type: OptionType.SELECT,
        options: [
            { label: "In the Tooltip, under the description text", value: DisplayStyle.Tooltip },
            { label: "In the Tooltip, replacing icon description text", value: DisplayStyle.SimplifiedTooltip },
            { label: "Next to the timeout icon", value: DisplayStyle.Inline, default: true },
        ],
    }
});

function renderTimeout(message: Message, inline: boolean) {
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
        : i18n.Messages.GUILD_ENABLE_COMMUNICATION_TIME_REMAINING.format({
            username: message.author.username,
            countdown
        });
}

export default definePlugin({
    name: "ShowTimeoutDuration",
    description: "Shows how much longer a user's timeout will last, either in the timeout icon tooltip or next to it",
    authors: [Devs.Ven, Devs.Sqaaakoi],

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

    TooltipWrapper: ErrorBoundary.wrap(({ message, children, text }: { message: Message; children: FunctionComponent<any>; text: ReactNode; }) => {
        if (settings.store.displayStyle !== DisplayStyle.Inline) {
            const showText = settings.store.displayStyle as DisplayStyle === DisplayStyle.Tooltip;
            return <Tooltip
                children={children}
                text={<>
                    {showText && text}
                    <Forms.FormText className={showText ? Margins.top8 : ""}>
                        {renderTimeout(message, false)}
                    </Forms.FormText>
                </>}
            />;
        }
        return (
            <div className="vc-std-wrapper">
                <Tooltip text={text} children={children} />
                <Text variant="text-md/normal" color="status-danger">
                    {renderTimeout(message, true)} timeout remaining
                </Text>
            </div>
        );
    }, { noop: true })
});
