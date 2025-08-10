/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { openUserProfile } from "@utils/discord";
import { isNonNullish } from "@utils/guards";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { Channel, User } from "@vencord/discord-types";
import { AuthenticationStore, Avatar, GuildMemberStore, React, RelationshipStore, TypingStore, UserStore, useStateFromStores } from "@webpack/common";
import { PropsWithChildren } from "react";

import managedStyle from "./style.css?managed";

const settings = definePluginSettings({
    showAvatars: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show avatars in the typing indicator"
    },
    showRoleColors: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show role colors in the typing indicator"
    },
    alternativeFormatting: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show a more useful message when several users are typing"
    }
});

export const buildSeveralUsers = ErrorBoundary.wrap(function buildSeveralUsers({ users, count, guildId }: { users: User[], count: number; guildId: string; }) {
    return (
        <>
            {users.slice(0, count).map(user => (
                <React.Fragment key={user.id}>
                    <TypingUser user={user} guildId={guildId} />
                    {", "}
                </React.Fragment>
            ))}
            and {count} others are typing...
        </>
    );
}, { noop: true });

interface TypingUserProps {
    user: User;
    guildId: string;
}

const TypingUser = ErrorBoundary.wrap(function TypingUser({ user, guildId }: TypingUserProps) {
    return (
        <strong
            className="vc-typing-user"
            role="button"
            onClick={() => {
                openUserProfile(user.id);
            }}
            style={{
                color: settings.store.showRoleColors ? GuildMemberStore.getMember(guildId, user.id)?.colorString : undefined,
            }}
        >
            {settings.store.showAvatars && (
                <Avatar
                    size="SIZE_16"
                    src={user.getAvatarURL(guildId, 128)} />
            )}
            {GuildMemberStore.getNick(guildId!, user.id)
                || (!guildId && RelationshipStore.getNickname(user.id))
                || (user as any).globalName
                || user.username
            }
        </strong>
    );
}, { noop: true });

export default definePlugin({
    name: "TypingTweaks",
    description: "Show avatars and role colours in the typing indicator",
    authors: [Devs.zt, Devs.sadan],
    settings,

    managedStyle,

    patches: [
        {
            find: "#{intl::THREE_USERS_TYPING}",
            group: true,
            replacement: [
                {
                    // Style the indicator and add function call to modify the children before rendering
                    match: /(?<="aria-atomic":!0,children:)\i/,
                    replace: "$self.renderTypingUsers({ users: arguments[0]?.typingUserObjects, guildId: arguments[0]?.channel?.guild_id, children: $& })"
                },
                {
                    match: /(?<=function \i\(\i\)\{)(?=[^}]+?\{channel:\i,isThreadCreation:\i=!1\})/,
                    replace: "let typingUserObjects = $self.useTypingUsers(arguments[0]?.channel);"
                },
                {
                    // Get the typing users as user objects instead of names
                    match: /typingUsers:(\i)\?\[\]:\i,/,
                    // check by typeof so if the variable is not defined due to other patch failing, it won't throw a ReferenceError
                    replace: "$&typingUserObjects: $1 || typeof typingUserObjects === 'undefined' ? [] : typingUserObjects,"
                },
                {
                    // Adds the alternative formatting for several users typing
                    // users.length > 3 && (component = intl(key))
                    match: /(&&\(\i=)\i\.\i\.format\(\i\.\i#{intl::SEVERAL_USERS_TYPING_STRONG},\{\}\)/,
                    replace: "$1$self.buildSeveralUsers({ users: arguments[0]?.typingUserObjects, count: arguments[0]?.typingUserObjects?.length - 2, guildId: arguments[0]?.channel?.guild_id })",
                    predicate: () => settings.store.alternativeFormatting
                }
            ]
        }
    ],

    useTypingUsers(channel: Channel | undefined): User[] {
        try {
            if (!channel) {
                throw new Error("No channel");
            }

            const typingUsers = useStateFromStores([TypingStore], () => TypingStore.getTypingUsers(channel.id));
            const myId = useStateFromStores([AuthenticationStore], () => AuthenticationStore.getId());

            return Object.keys(typingUsers)
                .filter(id => id && id !== myId && !RelationshipStore.isBlockedOrIgnored(id))
                .map(id => UserStore.getUser(id))
                .filter(isNonNullish);
        } catch (e) {
            new Logger("TypingTweaks").error("Failed to get typing users:", e);
            return [];
        }
    },


    buildSeveralUsers,

    renderTypingUsers: ErrorBoundary.wrap(({ guildId, users, children }: PropsWithChildren<{ guildId: string, users: User[]; }>) => {
        try {
            if (!Array.isArray(children)) {
                return children;
            }

            let element = 0;

            return children.map(c => {
                if (c.type !== "strong" && !(typeof c !== "string" && !React.isValidElement(c)))
                    return c;

                const user = users[element++];
                return <TypingUser key={user.id} guildId={guildId} user={user} />;
            });
        } catch (e) {
            new Logger("TypingTweaks").error("Failed to render typing users:", e);
        }

        return children;
    }, { noop: true })
});
