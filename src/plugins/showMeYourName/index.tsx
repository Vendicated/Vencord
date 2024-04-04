/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 rini
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { GuildMemberStore, RelationshipStore } from "@webpack/common";
import { Message, User } from "discord-types/general";

interface UsernameProps {
    author: { nick: string; };
    message?: Message;
    withMentionPrefix?: boolean;
    isRepliedMessage: boolean;
    userOverride?: User;
}

interface NickUser extends User {
    nick: string;
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

export default definePlugin({
    name: "ShowMeYourName",
    description: "Display usernames next to nicks, or no nicks at all",
    authors: [Devs.Rini, Devs.TheKodeToad],
    patches: [
        {
            find: ".useCanSeeRemixBadge)",
            replacement: {
                match: /(?<=onContextMenu:\i,children:).*?\}/,
                replace: "$self.renderUsername(arguments[0])}"
            }
        },
        // Keep the user object and nick when creating the list of typing users
        {
            find: "getCooldownTextStyle",
            replacement: {
                match: /\.map\(\i=>\i\.\i\.getName\(\i,this\.props\.channel\.id,\i\)\)/,
                replace: ""
            }
        },
        // Style the indicator and add function call to modify the children before rendering
        {
            find: "getCooldownTextStyle",
            replacement: {
                match: /(?<=children:\[(\i)\.length>0.{0,200}?"aria-atomic":!0,children:)\i/,
                replace: "$self.renderTypingNames(this.props, $1, $&)"
            }
        },
    ],
    settings,

    renderUsername: ({ author, message, isRepliedMessage, withMentionPrefix, userOverride }: UsernameProps) => {
        try {
            const user = userOverride ?? message?.author;
            if (!user) return author?.nick;
            let { username } = user;
            if (settings.store.displayNames)
                username = (user as any).globalName || username;

            const { nick } = author;
            const prefix = withMentionPrefix ? "@" : "";
            if (username === nick || isRepliedMessage && !settings.store.inReplies)
                return prefix + nick;
            if (settings.store.mode === "user-nick")
                return <>{prefix}{username} <span className="vc-smyn-suffix">{nick}</span></>;
            if (settings.store.mode === "nick-user")
                return <>{prefix}{nick} <span className="vc-smyn-suffix">{username}</span></>;
            return prefix + username;
        } catch {
            return author?.nick;
        }
    },

    renderTypingNames(props: any, users: NickUser[], children: any) {
        if (!Array.isArray(children)) return children;

        let index = 0;

        return children.map(c => {
            if (c.type === "strong") {
                const user = users[index++];
                if (!user) return c;

                const nick = GuildMemberStore.getNick(props.guildId!, user.id)
                    || (!props.guildId && RelationshipStore.getNickname(user.id))
                    || (user as any).globalName
                    || user.username;
                if (!nick) return c;

                return <><strong>{this.renderUsername({
                    author: { nick },
                    message: undefined,
                    isRepliedMessage: false,
                    withMentionPrefix: false,
                    userOverride: user
                })}</strong></>;
            }
            return c;
        });
    },
});
