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

const CountDown = findComponentLazy(m => m.prototype?.render?.toString().includes(".MAX_AGE_NEVER"));

const enum DisplayStyle {
    Tooltip = "tooltip",
    Inline = "ssalggnikool"
}

const settings = definePluginSettings({
    displayStyle: {
        description: "How to display the timeout duration",
        type: OptionType.SELECT,
        restartNeeded: true,
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
    authors: [Devs.Ven],

    settings,

    patches: [
        {
            find: ".GUILD_COMMUNICATION_DISABLED_ICON_TOOLTIP_BODY",
            replacement: [
                {
                    match: /(\i)\.Tooltip,{(text:.{0,30}\.Messages\.GUILD_COMMUNICATION_DISABLED_ICON_TOOLTIP_BODY)/,
                    get replace() {
                        if (settings.store.displayStyle === DisplayStyle.Inline)
                            return "$self.TooltipWrapper,{vcProps:arguments[0],$2";

                        return "$1.Tooltip,{text:$self.renderTimeoutDuration(arguments[0])";
                    }
                }
            ]
        }
    ],

    renderTimeoutDuration: ErrorBoundary.wrap(({ message }: { message: Message; }) => {
        return (
            <>
                <Forms.FormText>{i18n.Messages.GUILD_COMMUNICATION_DISABLED_ICON_TOOLTIP_BODY}</Forms.FormText>
                <Forms.FormText className={Margins.top8}>
                    {renderTimeout(message, false)}
                </Forms.FormText>
            </>
        );
    }, { noop: true }),

    TooltipWrapper: ErrorBoundary.wrap(({ vcProps: { message }, ...tooltipProps }: { vcProps: { message: Message; }; }) => {
        return (
            <div className="vc-std-wrapper">
                <Tooltip {...tooltipProps as any} />

                <Text variant="text-md/normal" color="status-danger">
                    {renderTimeout(message, true)} timeout remaining
                </Text>
            </div>
        );
    }, { noop: true })
});
