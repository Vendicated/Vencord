/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 rini
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Message, User } from "discord-types/general";
import { findByCodeLazy } from "@webpack";

interface UsernameProps {
    author: { nick: string; };
    message: Message;
    withMentionPrefix?: boolean;
    isRepliedMessage: boolean;
    userOverride?: User;
}

const settings = definePluginSettings({
    mode: {
        type: OptionType.SELECT,
        description: "How to display usernames and nicks",
        options: [
            { label: "Username then nickname", value: "user-nick", default: true },
            { label: "Nickname then username", value: "nick-user" },
            { label: "Username only", value: "user" },
        ],
    },
    displayNames: {
        type: OptionType.BOOLEAN,
        description: "Use display names in place of usernames",
        default: false
    },
    inReplies: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "Also apply functionality to reply previews",
    },
});

const wrapEmojis = findByCodeLazy(/"span",\{className:\i\.emoji,children:/);

export default definePlugin({
    name: "ShowMeYourName",
    description: "Display usernames next to nicks, or no nicks at all",
    authors: [Devs.Rini, Devs.TheKodeToad],
    patches: [
        {
            find: '"BaseUsername"',
            replacement: {
                match: /(?<=onContextMenu:\i,children:)(?:\i,"data-text":\i\+\i)/,
                replace: "$self.renderUsername(arguments[0]),\"data-text\":$self.getUsername(arguments[0])",
            }
        },
    ],
    settings,

    renderUsername: ErrorBoundary.wrap(({ author, message, isRepliedMessage, withMentionPrefix, userOverride }: UsernameProps) => {
        try {
            const user = userOverride ?? message.author;
            let { username } = user;
            if (settings.store.displayNames)
                username = (user as any).globalName || username;

            const { nick } = author;
            const prefix = withMentionPrefix ? "@" : "";

            const parsedNick = wrapEmojis(nick);
            const parsedUsername = wrapEmojis(username);

            if (isRepliedMessage && !settings.store.inReplies || username.toLowerCase() === nick.toLowerCase())
                return <>{prefix}{parsedNick}</>;

            if (settings.store.mode === "user-nick")
                return <>{prefix}{parsedUsername} <span className="vc-smyn-suffix">{parsedNick}</span></>;

            if (settings.store.mode === "nick-user")
                return <>{prefix}{parsedNick} <span className="vc-smyn-suffix">{parsedUsername}</span></>;

            return <>{prefix}{parsedUsername}</>;
        } catch {
            return <>{author?.nick}</>;
        }
    }, { noop: true }),

    getUsername: ({ author, message, isRepliedMessage, withMentionPrefix, userOverride }: UsernameProps) => {
        try {
            const user = userOverride ?? message.author;
            let { username } = user;
            if (settings.store.displayNames)
                username = (user as any).globalName || username;

            const { nick } = author;
            const prefix = withMentionPrefix ? "@" : "";

            if (isRepliedMessage && !settings.store.inReplies || username.toLowerCase() === nick.toLowerCase())
                return `${prefix}${nick}`;

            if (settings.store.mode === "user-nick")
                return `${prefix}${username} (${nick})`;

            if (settings.store.mode === "nick-user")
                return `${prefix}${nick} (${username})`;

            return `${prefix}${username}`;
        } catch {
            return author?.nick || "";
        }
    }
});
