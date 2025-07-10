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
import { Message, User } from "@vencord/discord-types";
import { GuildMemberStore, RelationshipStore } from "@webpack/common";

interface UsernameProps {
    author: { nick: string; };
    message: Message;
    withMentionPrefix?: boolean;
    isRepliedMessage: boolean;
    userOverride?: User;
    guildId: string;
}

const settings = definePluginSettings({
    mode: {
        type: OptionType.SELECT,
        description: "How to display usernames and nicks",
        options: [
            { label: "Username then nickname", value: "user-nick", default: true },
            { label: "Nickname then username", value: "nick-user" },
            { label: "Nickname only", value: "nick" },
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
    preferFriend: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "Use friend names in place of usernames (overrides Display Names option if applicable)"
    },
    showGradient: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "Whether to show gradient for suffix",
    },
    memberList: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "Show usernames in member list",
        restartNeeded: true
    },
    voiceChannelList: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "Show usernames in voice channel list",
        restartNeeded: true
    },
    emojiReactions: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "Show usernames in emoji reactions",
        restartNeeded: true
    },
    userProfilePopout: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "Show usernames in user profile popout",
        restartNeeded: true
    },
});

function getUsername(user: any, guildId: string): string {
    const friendName = RelationshipStore.getNickname(user.id);
    const guildNick = GuildMemberStore.getNick(guildId, user.id);

    if (settings.store.preferFriend && friendName) return friendName;
    if (settings.store.mode === "nick" && guildNick) return guildNick;
    if (settings.store.displayNames) return user.globalName || user.username;
    return user.username;
}

export default definePlugin({
    name: "ShowMeYourName",
    description: "Display usernames next to nicks, or no nicks at all",
    authors: [Devs.Rini, Devs.TheKodeToad, Devs.nyx],
    patches: [
        {
            find: '="SYSTEM_TAG"',
            replacement: {
                match: /(?<=onContextMenu:\i,children:)\i/,
                replace: "$self.renderUsername(arguments[0])"
            }
        },
        {
            find: "#{intl::REACTION_TOOLTIP_1}",
            predicate: () => settings.store.emojiReactions,
            replacement: [
                {
                    match: /\i\.\i\.getName\((\i),null==.{0,15},(\i)\)/,
                    replace: "$self.getUsername($2,$1)"
                },
            ]
        },
        {
            find: "._areActivitiesExperimentallyHidden=(",
            predicate: () => settings.store.memberList,
            replacement: {
                match: /(?<=user:(\i),currentUser:\i,nick:)\i(?=.*?guildId:(\i))/,
                replace: "$self.getUsername($1,$2)"
            },
        },
        {
            find: ".usernameSpeaking]",
            predicate: () => settings.store.voiceChannelList,
            replacement: [
                {
                    match: /null!=\i\?\i:\i\.\i\.getName\((\i)\)(?=.*?contextGuildId:(\i))/,
                    replace: "$self.getUsername($1,$2)"
                },
            ]
        },
        {
            find: ".hasAvatarForGuild(null==",
            predicate: () => settings.store.userProfilePopout,
            replacement: {
                match: /(?<=user:(\i).{0,15}\}\),nickname:)\i(?=.*?guildId:(null==\i\?void 0:\i\.id))/,
                replace: "$self.getUsername($1,$2)"
            }
        },
        {
            find: "friendRequestBanner})",
            predicate: () => settings.store.userProfilePopout,
            replacement: {
                match: /(?<=user:(\i).{0,15}guildId:(\i).*?nickname:)\i/,
                replace: "$self.getUsername($1,$2)"
            }
        }
    ],
    settings,
    getUsername,
    renderUsername: ErrorBoundary.wrap(({ author, message, isRepliedMessage, withMentionPrefix, userOverride, guildId }: UsernameProps) => {
        try {
            const user = userOverride ?? message.author;
            const username = getUsername(user, guildId);

            const { nick } = author;
            const prefix = withMentionPrefix ? "@" : "";

            const classes = settings.store.showGradient ? "vc-smyn-suffix" : "vc-smyn-suffix vc-smyn-hide-gradient";

            if (isRepliedMessage && !settings.store.inReplies || username.toLowerCase() === nick.toLowerCase())
                return <>{prefix}{nick}</>;

            if (settings.store.mode === "user-nick")
                return <>{prefix}{username} <span className={classes}>{nick}</span></>;

            if (settings.store.mode === "nick-user")
                return <>{prefix}{nick} <span className={classes}>{username}</span></>;

            return <>{prefix}{username}</>;
        } catch {
            return <>{author?.nick}</>;
        }
    }, { noop: true }),
});
