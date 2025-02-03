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
import { UserStore } from "@webpack/common";
import { Message, User } from "discord-types/general";

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
    inMentions: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "Also apply functionality to mentions",
        restartNeeded: true
    }
});

export default definePlugin({
    name: "ShowMeYourName",
    description: "Display usernames next to nicks, or no nicks at all",
    authors: [Devs.Rini, Devs.TheKodeToad, Devs.sadan],
    patches: [
        {
            find: '?"@":""',
            replacement: {
                match: /(?<=onContextMenu:\i,children:).*?\)}/,
                replace: "$self.renderUsername(arguments[0])}"
            }
        },
        {
            find: "missing user\"",
            predicate: () => settings.store.inMentions,
            replacement: {
                match: /"@"\.concat\(null!=(\i)\?\i:(\i)\)/,
                replace: "$self.renderMentionUsername($1, $2, arguments[0])"
            }
        }
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

            if (isRepliedMessage && !settings.store.inReplies || username.toLowerCase() === nick.toLowerCase())
                return <>{prefix}{nick}</>;

            if (settings.store.mode === "user-nick")
                return <>{prefix}{username} <span className="vc-smyn-suffix">{nick}</span></>;

            if (settings.store.mode === "nick-user")
                return <>{prefix}{nick} <span className="vc-smyn-suffix">{username}</span></>;

            return <>{prefix}{username}</>;
        } catch {
            return <>{author?.nick}</>;
        }
    }, { noop: true }),

    renderMentionUsername(nick: string | null, displayName: string, { userId }: {
        userId: string;
    }) {
        try {
            if (!settings.store.displayNames)
                displayName = UserStore.getUser(userId).username;
            if (!nick)
                return <>@{displayName}</>;
            switch (settings.store.mode) {
                case "user-nick":
                    return <>@{displayName} <span className="vc-smyn-suffix">{nick}</span></>;
                case "nick-user":
                    return <>@{nick} <span className="vc-smyn-suffix">{displayName}</span></>;
                case "user":
                    return <>@{displayName}</>;
                default:
                    throw new Error("settings.store.mode is not one of nick-user, user-nick or user");
            }
        } catch (e) {
            console.error(e);
            return `@${displayName}`;
        }
    }
});
