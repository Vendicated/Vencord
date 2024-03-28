/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { disableStyle, enableStyle } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { Button, NavigationRouter, SelectedGuildStore, Text } from "@webpack/common";
const Kangaroo = findByPropsLazy("jumpToMessage");

import "./style.css";

export default definePlugin({
    name: "AutomodContext",
    description: "Allows you to jump to the messages surrounding an automod hit.",
    authors: [Devs.JohnyTheCarrot],
    patches: [
        {
            find: "Messages.GUILD_AUTOMOD_REPORT_ISSUES",
            replacement: {
                match: /([^.]+\.[^.]+}\)]\}\)\}\),(\(0,.\.[^.]+\)\("div",{[^:]+:.\..{3}}\),))/,
                replace: "$1 $self.renderJumpButton($self.findChannelId(arguments[0].message), arguments[0].message.id),$2"
            }
        }
    ],

    start() {
        enableStyle(style);
    },

    stop() {
        disableStyle(style);
    },

    findChannelId(message) {
        const { embeds: [embed] } = message;
        const channelField = embed.fields.find(({ rawName }) => rawName === "channel_id");
        if (!channelField)
            return null;

        return channelField.rawValue;
    },

    jumpToMessage(channelId: string, messageId: string) {
        const guildId = SelectedGuildStore.getGuildId();

        NavigationRouter.transitionTo(`/channels/${guildId}/${channelId}/${messageId}`);
        Kangaroo.jumpToMessage({
            channelId,
            messageId,
            flash: false,
            jumpType: "INSTANT"
        });
    },

    renderJumpButton(channelId: string | undefined, messageId: string) {
        if (!channelId)
            return null;

        return (
            <ErrorBoundary noop>
                <Button
                    className="automod-context-jump-button"
                    look={Button.Looks.LINK}
                    size={Button.Sizes.SMALL}
                    color={Button.Colors.LINK}
                    onClick={() => this.jumpToMessage(channelId, messageId)}
                >
                    <Text color="text-link" variant="text-xs/normal">
                        Jump to Surrounding
                    </Text>
                </Button>
            </ErrorBoundary>
        );
    }
});
