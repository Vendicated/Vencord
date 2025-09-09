/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 rini
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { classes } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { Message, User } from "@vencord/discord-types";
import { UserStore } from "@webpack/common";

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
        ] as const,
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

interface FullNameProps {
    nickname: string;
    username: string;
    displayName?: string;
    useDisplayName?: boolean;
    prefix?: string;
    colorSuffix: boolean;
}

export function FullName({ nickname, username, displayName, prefix = "@", useDisplayName, colorSuffix }: FullNameProps) {
    function Suffix({ name }: { name: string; }) {
        return <span className={classes("vc-smyn-suffix", colorSuffix && "vc-smyn-color")}>{name}</span>;
    }
    const showDisplayName = settings.use(["displayNames"]).displayNames;
    useDisplayName ??= showDisplayName;
    const name = useDisplayName ? displayName ?? username : username;
    const nick = nickname;
    let first: string,
        second: string | undefined;
    const { mode } = settings.use(["mode"]);
    switch (mode) {
        case "nick-user":
            first = nick;
            second = name;
            break;
        case "user-nick":
            first = name;
            second = nick;
            break;
        case "user":
            first = name;
            break;
        default:
            throw new Error(`Unknown mode: ${settings.store.mode}`);
    }

    return <>{prefix}{first} {second && <Suffix name={second} />}</>;
}

export default definePlugin({
    name: "ShowMeYourName",
    description: "Display usernames next to nicks, or no nicks at all",
    authors: [Devs.Rini, Devs.TheKodeToad, Devs.sadan],
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
            // same module as RoleColorEverywhere
            find: ".USER_MENTION)",
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
            const { username } = user;
            const { nick } = author;
            const prefix = withMentionPrefix ? "@" : "";
            const { inReplies } = settings.use(["inReplies"]);
            if (isRepliedMessage && !settings.store.inReplies || username.toLowerCase() === nick.toLowerCase())
                return <>{prefix}{nick}</>;

            return (
                <FullName
                    nickname={nick}
                    username={username}
                    displayName={user.globalName || username}
                    prefix={prefix}
                    colorSuffix
                />
            );
        } catch {
            return <>{author?.nick}</>;
        }
    }, { noop: true }),

    renderMentionUsername(nick: string, displayName: string, { userId }: {
        userId: string;
    }) {
        try {
            const user = UserStore.getUser(userId);
            return <ErrorBoundary noop fallback={() => `@${displayName}`}>
                <FullName username={user.username} nickname={nick} displayName={displayName} colorSuffix={false} />
            </ErrorBoundary>;
        } catch (e) {
            console.error(e);
            return `@${displayName}`;
        }
    }
});
