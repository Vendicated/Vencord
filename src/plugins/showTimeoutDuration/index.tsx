/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { getIntlMessage } from "@utils/discord";
import { canonicalizeMatch } from "@utils/patches";
import definePlugin, { OptionType } from "@utils/types";
import { Message } from "@vencord/discord-types";
import { findComponentLazy } from "@webpack";
import { ChannelStore, GuildMemberStore, Text, Tooltip } from "@webpack/common";
import { FunctionComponent, ReactNode } from "react";

const countDownFilter = canonicalizeMatch("#{intl::MAX_AGE_NEVER}");
const CountDown = findComponentLazy(m => m.prototype?.render?.toString().includes(countDownFilter));

const enum DisplayStyle {
    Tooltip = "tooltip",
    Inline = "ssalggnikool"
}

const settings = definePluginSettings({
    displayStyle: {
        description: "How to display the timeout duration",
        type: OptionType.SELECT,
        options: [
            { label: "In the Tooltip", value: DisplayStyle.Tooltip },
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

    getIntlMessage("GUILD_ENABLE_COMMUNICATION_TIME_REMAINING", {
        username: message.author.username,
        countdown
    });

    return inline
        ? countdown()
        : getIntlMessage("GUILD_ENABLE_COMMUNICATION_TIME_REMAINING", {
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
            find: "#{intl::GUILD_COMMUNICATION_DISABLED_ICON_TOOLTIP_BODY}",
            replacement: [
                {
                    match: /\i\.\i,{(text:.{0,30}#{intl::GUILD_COMMUNICATION_DISABLED_ICON_TOOLTIP_BODY}\))/,
                    replace: "$self.TooltipWrapper,{message:arguments[0].message,$1"
                }
            ]
        }
    ],

    TooltipWrapper: ErrorBoundary.wrap(({ message, children, text }: { message: Message; children: FunctionComponent<any>; text: ReactNode; }) => {
        if (settings.store.displayStyle === DisplayStyle.Tooltip)
            return <Tooltip text={renderTimeout(message, false)}>{children}</Tooltip>;

        return (
            <div className="vc-std-wrapper">
                <Tooltip text={text}>{children}</Tooltip>
                <Text variant="text-md/normal" color="status-danger">
                    {renderTimeout(message, true)} timeout remaining
                </Text>
            </div>
        );
    }, { noop: true })
});
