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

import { PluginAuthor } from "@utils/types";
import { useEffect, UserUtils, useState } from "@webpack/common";
import { User } from "discord-types/general";
import React from "react";

import { createDummyUser, types, UserSummaryItem } from "../../philsPluginLibrary";

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

    return (
        <UserSummaryItem
            users={users as User[]}
            guildId={undefined}
            renderIcon={false}
            showDefaultAvatarsForNullUsers
            showUserPopout
            {...props}
        />
    );
};
