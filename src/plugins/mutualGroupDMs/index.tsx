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

import { Devs } from "@utils/constants";
import { isNonNullish } from "@utils/guards";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { Avatar, ChannelStore, Clickable, RelationshipStore, ScrollerThin, UserStore } from "@webpack/common";
import { Channel, User } from "discord-types/general";

const SelectedChannelActionCreators = findByPropsLazy("selectPrivateChannel");
const AvatarUtils = findByPropsLazy("getChannelIconURL");
const UserUtils = findByPropsLazy("getGlobalName");

const ProfileListClasses = findByPropsLazy("emptyIconFriends", "emptyIconGuilds");
const GuildLabelClasses = findByPropsLazy("guildNick", "guildAvatarWithoutIcon");

function getGroupDMName(channel: Channel) {
    return channel.name ||
        channel.recipients
            .map(UserStore.getUser)
            .filter(isNonNullish)
            .map(c => RelationshipStore.getNickname(c.id) || UserUtils.getName(c))
            .join(", ");
}

export default definePlugin({
    name: "MutualGroupDMs",
    description: "Shows mutual group dms in profiles",
    authors: [Devs.amia],

    patches: [
        {
            find: ".Messages.USER_PROFILE_MODAL", // Note: the module is lazy-loaded
            replacement: {
                match: /(?<=\.MUTUAL_GUILDS\}\),)(?=(\i\.bot).{0,20}(\(0,\i\.jsx\)\(.{0,100}id:))/,
                replace: '($1||arguments[0].isCurrentUser)?null:$2"MUTUAL_GDMS",children:"Mutual Groups"}),'
            }
        },
        {
            find: ".UserProfileSections.USER_INFO_CONNECTIONS:",
            replacement: {
                match: /(?<={user:(\i),onClose:(\i)}\);)(?=case \i\.\i\.MUTUAL_FRIENDS)/,
                replace: "case \"MUTUAL_GDMS\":return $self.renderMutualGDMs($1,$2);"
            }
        }
    ],

    renderMutualGDMs(user: User, onClose: () => void) {
        const entries = ChannelStore.getSortedPrivateChannels().filter(c => c.isGroupDM() && c.recipients.includes(user.id)).map(c => (
            <Clickable
                className={ProfileListClasses.listRow}
                onClick={() => {
                    onClose();
                    SelectedChannelActionCreators.selectPrivateChannel(c.id);
                }}
            >
                <Avatar
                    src={AvatarUtils.getChannelIconURL({ id: c.id, icon: c.icon, size: 32 })}
                    size="SIZE_40"
                    className={ProfileListClasses.listAvatar}
                >
                </Avatar>
                <div className={ProfileListClasses.listRowContent}>
                    <div className={ProfileListClasses.listName}>{getGroupDMName(c)}</div>
                    <div className={GuildLabelClasses.guildNick}>{c.recipients.length + 1} Members</div>
                </div>
            </Clickable>
        ));

        return (
            <ScrollerThin
                className={ProfileListClasses.listScroller}
                fade={true}
                onClose={onClose}
            >
                {entries.length > 0
                    ? entries
                    : (
                        <div className={ProfileListClasses.empty}>
                            <div className={ProfileListClasses.emptyIconFriends}></div>
                            <div className={ProfileListClasses.emptyText}>No group dms in common</div>
                        </div>
                    )
                }
            </ScrollerThin>
        );
    }
});
