/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 rini
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { ChannelStore } from "@webpack/common";
import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Message } from "discord-types/general";

interface UsernameProps {
    author: { nick: string; };
    message: Message;
    withMentionPrefix?: boolean;
    isRepliedMessage: boolean;
}

const settings = definePluginSettings({
    mode: {
        type: OptionType.SELECT,
        description: "How to display usernames and nicks",
        options: [
            { label: "Username then nickname", value: "user-nick", default: true },
            { label: "Nickname then username", value: "nick-user" },
            { label: "Username only", value: "user" },
            { label: "Vanilla (Nickname prioritized)", value: "nick" },
        ],
    },

    inReplies: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "Also apply functionality to reply previews",
    },

    inDirectMessages: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "Also apply functionality to direct messages",
    },

    inDirectGroups: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "Also apply functionality to direct messages on groups",
    },
});

export default definePlugin({
    name: "ShowMeYourName",
    description: "Display usernames next to nicks, or no nicks at all",
    authors: [Devs.Rini, Devs.TheKodeToad],
    patches: [
        {
            find: '?"@":"")',
            replacement: {
                match: /(?<=onContextMenu:\i,children:).*?\)}/,
                replace: "$self.renderUsername(arguments[0])}"
            }
        },
    ],
    settings,

    renderUsername: ErrorBoundary.wrap(({ author, message, isRepliedMessage, withMentionPrefix }: UsernameProps) => {
        try {
            // Discord by default will display the username unless the user has set an nickname
            // The code will also do the same if certain settings are turned off

            // There is no way to get the nick from the message for some reason so this had to stay
            const nickname: string = author.nick;

            const userObj = message.author;
            const prefix: string = withMentionPrefix ? "@" : "";
            const username: string = userObj.username;
            const isRedundantDoubleUsername = (username.toLowerCase() === nickname.toLowerCase());
            let display_name = nickname;

            switch (settings.store.mode) {
                case "user-nick":
                    if (!isRedundantDoubleUsername) {
                        display_name = <>{prefix}{username} <span className="vc-smyn-suffix">{nickname}</span></>;
                    }

                    break;
                // the <span> makes the text gray

                case "nick-user":
                    if (!isRedundantDoubleUsername) {
                        display_name = <>{prefix}{nickname} <span className="vc-smyn-suffix">{username}</span></>;
                    }

                    break;

                case "user":
                    display_name = <>{prefix}{username}</>;
                    break;

                case "vanilla":
                    display_name = <>{prefix}{nickname}</>;
                    break;
            }

            const current_channel = ChannelStore.getChannel(message.channel_id);
            const isDM = (current_channel.guild_id === null);

            if (isDM) {
                const isGroupChat = (current_channel.recipients.length > 1);
                const shouldDisplayDM = !isGroupChat && settings.store.inDirectMessages;
                const shouldDisplayGroup = isGroupChat && settings.store.inDirectGroups;

                if (shouldDisplayDM || shouldDisplayGroup) {
                    if (isRepliedMessage) {
                        if (settings.store.inReplies) return display_name;

                        return nickname;
                    }

                    return display_name;
                }

                return nickname;
            }

            // Servers
            if (isRepliedMessage) {
                if (settings.store.inReplies) return display_name;

                return nickname;
            }

            // Unless any of the functions above changed it, it will be the nickname
            return display_name;

        } catch (errorMsg) {
            console.log(`ShowMeYourName ERROR: ${errorMsg}`);
            return <>{message?.author.username}</>;
        }
    }, { noop: true }),
});
