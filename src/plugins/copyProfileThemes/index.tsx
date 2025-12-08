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

import { sendBotMessage } from "@api/Commands";
import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { ImageIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findStoreLazy } from "@webpack";
import { Menu } from "@webpack/common";
import { Channel, User } from "discord-types/general";

const UserProfileStore = findStoreLazy("UserProfileStore");

function getProfileColors(id: string, guildId?: string) {
    const userProfile = UserProfileStore.getUserProfile(id);
    const guildProfile = UserProfileStore.getGuildMemberProfile(id, guildId);

    let themeString = "";

    if (userProfile?.themeColors?.length >= 2) {
        themeString += `User Primary: #${userProfile.themeColors[0].toString(16)}\nUser Secondary: #${userProfile.themeColors[1].toString(16)}`;
    }

    if (guildProfile && guildProfile.themeColors && guildProfile.themeColors.length >= 2) {
        themeString += `\n\nGuild Primary: #${guildProfile.themeColors[0].toString(16)}\nGuild Secondary: #${guildProfile.themeColors[1].toString(16)}`;
    }

    return themeString.trim();
}


const UserContext: NavContextMenuPatchCallback = (children, { user, guildId, channel }: { user: User, guildId: string; channel: Channel; }) => {
    const profileColors = getProfileColors(user.id, guildId);
    if (profileColors)
        children.splice(-1, 0, (
            <Menu.MenuGroup>
                <Menu.MenuItem
                    id="copy-profile-theme"
                    label="Copy Profile Theme"
                    action={() => {
                        sendBotMessage(channel.id, {
                            content: profileColors
                        });
                    }}
                    icon={ImageIcon}
                />
            </Menu.MenuGroup>
        ));
};

export default definePlugin({
    name: "CopyProfileThemes",
    authors: [Devs.KannaDev, Devs.kaitlyn],
    description: "Adds a 'Copy Profile Theme' option to the user context menu to copy the hex codes from a user's profile theme",

    contextMenus: {
        "user-context": UserContext
    },
});
