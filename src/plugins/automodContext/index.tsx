/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { Button, ChannelStore, Text } from "@webpack/common";

const { selectChannel } = findByPropsLazy("selectChannel", "selectVoiceChannel");

function jumpToMessage(channelId: string, messageId: string) {
    const guildId = ChannelStore.getChannel(channelId)?.guild_id;

    selectChannel({
        guildId,
        channelId,
        messageId,
        jumpType: "INSTANT"
    });
}

function findChannelId(message: any): string | null {
    const { embeds: [embed] } = message;
    const channelField = embed.fields.find(({ rawName }) => rawName === "channel_id");

    if (!channelField) {
        return null;
    }

    return channelField.rawValue;
}

export default definePlugin({
    name: "AutomodContext",
    description: "Allows you to jump to the messages surrounding an automod hit.",
    authors: [Devs.JohnyTheCarrot],

    patches: [
        {
            find: ".Messages.GUILD_AUTOMOD_REPORT_ISSUES",
            replacement: {
                match: /\.Messages\.ACTIONS.+?}\)(?=,(\(0.{0,40}\.dot.*?}\)),)/,
                replace: (m, dot) => `${m},${dot},$self.renderJumpButton({message:arguments[0].message})`
            }
        }
    ],

    renderJumpButton: ErrorBoundary.wrap(({ message }: { message: any; }) => {
        const channelId = findChannelId(message);

        if (!channelId) {
            return null;
        }

        return (
            <Button
                style={{ padding: "2px 8px" }}
                look={Button.Looks.LINK}
                size={Button.Sizes.SMALL}
                color={Button.Colors.LINK}
                onClick={() => jumpToMessage(channelId, message.id)}
            >
                <Text color="text-link" variant="text-xs/normal">
                    Jump to Surrounding
                </Text>
            </Button>
        );
    }, { noop: true })
});
