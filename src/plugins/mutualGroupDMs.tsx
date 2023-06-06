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
import { LazyComponent } from "@utils/react";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { ChannelStore, Menu, RelationshipStore, UserStore } from "@webpack/common";
import { Channel, User } from "discord-types/general";

const SelectedChannelActionCreators = findByPropsLazy("selectPrivateChannel");
const AvatarUtils = findByPropsLazy("getChannelIconURL");
const UserUtils = findByPropsLazy("getGlobalName");

const ProfileListClasses = findByPropsLazy("emptyIconFriends", "emptyIconGuilds");
const GuildLabelClasses = findByPropsLazy("guildNick", "guildAvatarWithoutIcon");

//@ts-ignore
const ScrollerThin = LazyComponent(() => Menu.ScrollerThin);
//@ts-ignore
const Clickable = LazyComponent(() => Menu.Clickable);
//@ts-ignore
const Avatar = LazyComponent(() => Menu.Avatar);

function GetGroupDMName(channel: Channel) {
    return channel.name || channel.recipients.map(UserStore.getUser).filter(x => x != null).map(x => {
        return RelationshipStore.getNickname(x.id) || UserUtils.getName(x);
    }).join(", ");
}

export default definePlugin({
    name: "MutualGroupDMs",
    description: "Shows mutual group dms on profile.",
    authors: [Devs.amia],

    patches: [
        {
            find: ".Messages.USER_PROFILE_MODAL", // Note: the module is lazy-loaded
            replacement: [
                {
                    match: /(?<=(\i)\.isClyde\(\)\?null:(\(0,\i\.\i\).+?id:)\i\.\i\.MUTUAL_GUILDS(,children:)\i\.\i\.Messages\.MUTUAL_GUILDS}\))/,
                    replace: `,!$1.bot?$2"MUTUAL_GDMS"$3"Mutual GDMs"}):null` // The label is "Mutual GDMs" because otherwise it's too long when Activity tab is present
                },
                {
                    match: /({user:(\i),onClose:(\i)}\);)(case \i\.\i\.MUTUAL_FRIENDS)/,
                    replace: `$1case "MUTUAL_GDMS":return $self.renderMutualGDMs($2,$3);$4`
                }
            ]
        }
    ],

    renderMutualGDMs(user: User, onClose: Function) {
        const entries = ChannelStore.getSortedPrivateChannels().filter(x => x.type === 3 && x.recipients.includes(user.id)).map(x => {
            return <Clickable className={ProfileListClasses.listRow} onClick={() => {
                onClose();
                SelectedChannelActionCreators.selectPrivateChannel(x.id);
            }}>
                <Avatar
                    src={AvatarUtils.getChannelIconURL({ id: x.id, icon: x.icon, size: 32 })}
                    size="SIZE_40"
                    className={ProfileListClasses.listAvatar}
                >
                </Avatar>
                <div className={ProfileListClasses.listRowContent}>
                    <div className={ProfileListClasses.listName}>{GetGroupDMName(x)}</div>
                    <div className={GuildLabelClasses.guildNick}>{x.recipients.length} Members</div>
                </div>
            </Clickable>;
        });

        return <ScrollerThin className={ProfileListClasses.listScroller} fade={true} onClose={onClose}>
            {entries.length > 0 ? entries :
                <div className={ProfileListClasses.empty}>
                    <div className={ProfileListClasses.emptyIconFriends}></div>
                    <div className={ProfileListClasses.emptyText}>No group dms in common</div>
                </div>
            }
        </ScrollerThin>;
    }
});
