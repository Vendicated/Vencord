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

import { createDummyUser, types, UserSummaryItem } from "@plugins/philsPluginLibrary";
import { PluginAuthor } from "@utils/types";
import { findByProps } from "@webpack";
import { useEffect, UserUtils, useState } from "@webpack/common";
import { User } from "discord-types/general";
import React from "react";

export interface AuthorUserSummaryItemProps extends Partial<React.ComponentProps<types.UserSummaryItem>> {
    authors: PluginAuthor[];
}

export const AuthorUserSummaryItem = (props: AuthorUserSummaryItemProps) => {
    const [users, setUsers] = useState<Partial<User>[]>([]);

    useEffect(() => {
        (async () => {
            props.authors.forEach(author =>
                UserUtils.getUser(`${author.id}`)
                    .then(user => setUsers(users => [...users, user]))
                    .catch(() => setUsers(users => [...users, createDummyUser({
                        username: author.name,
                        id: `${author.id}`,
                        bot: true,
                    })]))
            );
        })();
    }, []);

    const handleUserClick = (user: User) => {

        try {

            const UserProfileModals = findByProps("open", "openUserProfileModal");
            if (UserProfileModals?.open) {
                UserProfileModals.open(user.id);
                return;
            }
        } catch (e) {
            console.error("Failed to open profile with UserProfileModals:", e);
        }

        try {

            const { openUserProfileModal } = findByProps("openUserProfileModal");
            if (openUserProfileModal) {
                openUserProfileModal({ userId: user.id });
                return;
            }
        } catch (e) {
            console.error("Failed to open profile with openUserProfileModal:", e);
        }

        try {

            if ((window as any).DiscordNative?.userProfile) {
                (window as any).DiscordNative.userProfile.open(user.id);
                return;
            }
        } catch (e) {
            console.error("Failed to open profile with DiscordNative:", e);
        }

        console.warn("Could not open user profile - no method available");
    };

    return (
        <div style={{ display: "flex", gap: "0.5em", alignItems: "center" }}>
            {users.map(user => (
                <div
                    key={user.id}
                    onClick={() => handleUserClick(user as User)}
                    style={{
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                    }}
                    title={`Click to view ${user.username}'s profile`}
                >
                    <UserSummaryItem
                        users={[user as User]}
                        guildId={undefined}
                        renderIcon={false}
                        showDefaultAvatarsForNullUsers
                        showUserPopout={false}
                    />
                </div>
            ))}
        </div>
    );
};
