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
import { addContextMenuPatch } from "@api/ContextMenu";
import { ImageIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByProps } from "@webpack";
import { Menu } from "@webpack/common";

// Helper function to fetch the profile theme
const fetchProfileTheme = async (id, guildId = null) => {
    const userProfileProvider = findByProps("getUserProfile");
    const guildProfileProvider = findByProps("getGuildMemberProfile");

    const userProfile = userProfileProvider.getUserProfile(id);
    const guildProfile = guildId ? guildProfileProvider.getGuildMemberProfile(id, guildId) : null;

    let themeString = "";

    if (userProfile?.themeColors?.length >= 2) {
        themeString += `User Primary: #${userProfile.themeColors[0].toString(16)} User Secondary: #${userProfile.themeColors[1].toString(16)}`;
    }

    if (guildProfile && guildProfile.themeColors && guildProfile.themeColors.length >= 2) {
        themeString += `\nGuild Primary: #${guildProfile.themeColors[0].toString(16)} Guild Secondary: #${guildProfile.themeColors[1].toString(16)}`;
    }

    return themeString || "No theme...";
};


// Context menu callback function
const UserContext = (children, { user, guildId, channel }) => () => {
    children.splice(-1, 0, (
        <Menu.MenuGroup>
            <Menu.MenuItem
                id="copy-profile-theme"
                label="Copy Profile Theme"
                action={async () => {
                    const theme = await fetchProfileTheme(user.id, guildId);
                    if (theme) {
                        sendBotMessage(channel.id, {
                            content: theme
                        });
                    }
                }}
                icon={ImageIcon}
            />
        </Menu.MenuGroup>
    ));
};

// Exported module
export default definePlugin({
    name: "CopyProfileThemes",
    authors: [Devs.KannaDev, Devs.kaitlyn],
    description: "Adds a 'Copy Profile Theme' option to the user context menu to copy the hex codes from a user's profile theme.",
    start() {
        addContextMenuPatch("user-context", UserContext);
    }
});
