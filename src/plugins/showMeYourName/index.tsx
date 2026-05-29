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
import { Channel, Message, User } from "@vencord/discord-types";
import { AuthenticationStore, React, RelationshipStore, StreamerModeStore, TypingStore, UserStore } from "@webpack/common";

interface UsernameProps {
    author: { nick: string; authorId: string; };
    channel: Channel;
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
    friendNicknames: {
        type: OptionType.SELECT,
        description: "How to prioritise friend nicknames over server nicknames",
        options: [
            { label: "Show friend nicknames only in direct messages", value: "dms", default: true },
            { label: "Prefer friend nicknames over server nicknames", value: "always" },
            { label: "Prefer server nicknames over friend nicknames", value: "fallback" }
        ]
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

export default definePlugin({
    name: "ShowMeYourName",
    description: "Display usernames next to nicks, or no nicks at all",
    tags: ["Appearance", "Customisation"],
    authors: [Devs.Rini, Devs.TheKodeToad, Devs.rae, Devs.Omar],
    patches: [
        {
            find: '="SYSTEM_TAG"',
            replacement: {
                // The field is named "userName", but as this is unusual casing, the regex also matches username, in case they change it
                match: /(?<=onContextMenu:\i,children:)\i\?(?=.{0,100}?user[Nn]ame:)/,
                replace: "$self.renderUsername(arguments[0]),_oldChildren:$&"
            }
        },
        {
            find: "#{intl::SEVERAL_USERS_TYPING_STRONG}",
            replacement: {
                match: /(?<="aria-atomic":!0,children:)\i/,
                replace: "$self.patchTypingIndicator({ children: $&, channel: arguments[0]?.channel })"
            }
        }
    ],
    settings,

    renderUsername: ErrorBoundary.wrap(({ author, channel, message, isRepliedMessage, withMentionPrefix, userOverride }: UsernameProps) => {
        try {
            const { mode, friendNicknames, displayNames, inReplies } = settings.store;

            const user = userOverride ?? message.author;
            let username = StreamerModeStore.enabled
                ? user.username[0] + "…"
                : user.username;

            if (displayNames)
                username = user.globalName || username;

            let { nick } = author;

            const friendNickname = RelationshipStore.getNickname(author.authorId);

            if (friendNickname) {
                const shouldUseFriendNickname =
                    friendNicknames === "always" ||
                    (friendNicknames === "dms" && channel.isPrivate()) ||
                    (friendNicknames === "fallback" && !nick);

                if (shouldUseFriendNickname)
                    nick = friendNickname;
            }

            const prefix = withMentionPrefix ? "@" : "";

            if (isRepliedMessage && !inReplies || username.toLowerCase() === nick.toLowerCase())
                return <>{prefix}{nick}</>;

            if (mode === "user-nick")
                return <>{prefix}{username} <span className="vc-smyn-suffix">{nick}</span></>;

            if (mode === "nick-user")
                return <>{prefix}{nick} <span className="vc-smyn-suffix">{username}</span></>;

            return <>{prefix}{username}</>;
        } catch {
            return <>{author?.nick}</>;
        }
    }, { noop: true }),

    patchTypingIndicator: ErrorBoundary.wrap(({ children, channel }: { children: any, channel: Channel | undefined }) => {
        if (!channel || !Array.isArray(children)) return children;

        const { mode, displayNames } = settings.store;

        const typingUsers = TypingStore.getTypingUsers(channel.id);
        const myId = AuthenticationStore.getId();
        const userIds = Object.keys(typingUsers).filter(id => id && id !== myId && !RelationshipStore.isBlockedOrIgnored(id));

        let index = 0;
        return children.map(c => {
            if (c.type !== "strong" && !(typeof c !== "string" && !React.isValidElement(c))) return c;

            const userId = userIds[index++];
            if (!userId) return c;

            const user = UserStore.getUser(userId);
            if (!user) return c;

            let name = user.username;
            if (displayNames) name = user.globalName || name;
            if (StreamerModeStore.enabled) name = name[0] + "…";

            if (mode === "user") {
                return <strong {...c.props}>{name}</strong>;
            } else if (mode === "user-nick") {
                return <strong {...c.props}>{name} <span className="vc-smyn-suffix">{c.props?.children}</span></strong>;
            } else if (mode === "nick-user") {
                return <strong {...c.props}>{c.props?.children} <span className="vc-smyn-suffix">{name}</span></strong>;
            }

            return c;
        });
    }, { noop: true })
});
