/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { React } from "@webpack/common";

import { UserChatButton } from "./components/UserChatButton";
import { User } from "@vencord/discord-types";

export default definePlugin({
    name: "ClickToChat",
    description: "Click to open direct message.",
    authors: [Devs.nicola02nb],
    patches: [
        {
            find: "\"avatarContainerClass\",\"userNameClassName\"",
            replacement: {
                match: /(\((\i),t\){?=.{0,850}\.flipped])(:\i}\),children:\[)/,
                replace: "$1$3$self.renderPing($2?.user),"
            }
        }
    ],
    start: () => {
    },
    stop: () => {
    },

    renderPing(user?: User) {
        if (!user) return null;
        return <UserChatButton user={user} />;
    }
});


