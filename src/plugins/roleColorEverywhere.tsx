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
import { findByProps, findByPropsLazy } from "@webpack";
import { getCurrentChannel } from "@utils/discord";
import { UserStore } from "@webpack/common";

const MemberStore = findByPropsLazy("getMember");

export default definePlugin({
    name: "RoleColorEverywhere",
    authors: [Devs.KingFish],
    description: "Adds the top role color anywhere possible",
    patches: [
        // Chat Mentions
        {
            find: 'className:"mention"',
            replacement: [
                {
                    match: /user:(.),channelId:(.).{0,300}?"@".concat\(.+?\)/,
                    replace: "$&,color:Vencord.Plugins.plugins.RoleColorEverywhere.getUserColor($1, $2)"
                }
            ],
        },
        // Typing Users
        {
            find: 'Messages.ONE_USER_TYPING',
            replacement: [
                {
                    match: /((\w)=\w\.typingUsers.+?)(\w),\w=(\w+?\(\w+?,\d+?\)).+?(\w\.\w\.Messages.SEVERAL_USERS_TYPING);/,
                    replace: "$1$3=Vencord.Plugins.plugins.RoleColorEverywhere.typingUsers($4,$2,$5);"
                }
            ],
        },
    ],
    getColor(userId, channelId) {
        const channel = Vencord.Webpack.Common.ChannelStore.getChannel(channelId);
        if (!channel) {
            return null;
        }

        const member = MemberStore.getMember(channel.guild_id, userId);
        if (!member) {
            return null;
        }

        return member.colorString
    },
    getUserColor({ id: userId }, channelId) {
        const colorString = this.getColor(userId, channelId);
        return colorString && parseInt(colorString.slice(1), 16);;
    },
    typingUsers(users, userIds, SEVERAL_USERS_TYPING) { // todo: work with i18n
        const currentUser = UserStore.getCurrentUser();

        const locale = findByProps("getLocale").getLocale();
        const fmt = new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' })

        userIds = Object.keys(userIds).filter(m => m != currentUser.id);
        const several = userIds.length > 3;
        userIds = fmt.formatToParts(userIds.slice(0, 3));

        const stuff = userIds.length === 0 ? null : (!several ? <>
            {userIds.map(({ value: id, type }, i) => {
                const channel = getCurrentChannel();
                const member = MemberStore.getMember(channel.guild_id, id);

                return type === 'element' ?
                    <strong style={{color: member.colorString}}>
                        {member.nick || UserStore.getUser(id).username}
                    </strong>
                : id
            })} {users.length > 1 ? 'are' : 'is'} typing...
        </> : SEVERAL_USERS_TYPING)

        console.log("stuff", stuff);
        return stuff;
    }
});
