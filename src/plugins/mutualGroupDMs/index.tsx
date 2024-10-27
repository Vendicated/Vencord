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

import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { isNonNullish } from "@utils/guards";
import definePlugin from "@utils/types";
import { findByPropsLazy, findComponentByCodeLazy } from "@webpack";
import { Avatar, ChannelStore, Clickable, IconUtils, RelationshipStore, ScrollerThin, useMemo, UserStore } from "@webpack/common";
import { Channel, User } from "discord-types/general";

const SelectedChannelActionCreators = findByPropsLazy("selectPrivateChannel");
const UserUtils = findByPropsLazy("getGlobalName");

const ProfileListClasses = findByPropsLazy("emptyIconFriends", "emptyIconGuilds");
const ExpandableList = findComponentByCodeLazy('"PRESS_SECTION"');
const GuildLabelClasses = findByPropsLazy("guildNick", "guildAvatarWithoutIcon");

function getGroupDMName(channel: Channel) {
    return channel.name ||
        channel.recipients
            .map(UserStore.getUser)
            .filter(isNonNullish)
            .map(c => RelationshipStore.getNickname(c.id) || UserUtils.getName(c))
            .join(", ");
}

const getMutualGroupDms = (userId: string) =>
    ChannelStore.getSortedPrivateChannels()
        .filter(c => c.isGroupDM() && c.recipients.includes(userId));

const isBotOrSelf = (user: User) => user.bot || user.id === UserStore.getCurrentUser().id;

function getMutualGDMCountText(user: User) {
    const count = getMutualGroupDms(user.id).length;
    return `${count === 0 ? "No" : count} Mutual Group${count !== 1 ? "s" : ""}`;
}

function renderClickableGDMs(mutualDms: Channel[], onClose: () => void) {
    return mutualDms.map(c => (
        <Clickable
            className={ProfileListClasses.listRow}
            onClick={() => {
                onClose();
                SelectedChannelActionCreators.selectPrivateChannel(c.id);
            }}
        >
            <Avatar
                src={IconUtils.getChannelIconURL({ id: c.id, icon: c.icon, size: 32 })}
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
}

const IS_PATCHED = Symbol("MutualGroupDMs.Patched");

export default definePlugin({
    name: "MutualGroupDMs",
    description: "Shows mutual group dms in profiles",
    authors: [Devs.amia],

    patches: [
        {
            find: ".MUTUAL_FRIENDS?(",
            replacement: [
                {
                    match: /\i\.useEffect.{0,100}(\i)\[0\]\.section/,
                    replace: "$self.pushSection($1, arguments[0].user);$&"
                },
                {
                    match: /\(0,\i\.jsx\)\(\i,\{items:\i,section:(\i)/,
                    replace: "$1==='MUTUAL_GDMS'?$self.renderMutualGDMs(arguments[0]):$&"
                }
            ]
        },
        {
            find: 'section:"MUTUAL_FRIENDS"',
            replacement: {
                match: /\.openUserProfileModal.+?\)}\)}\)(?<=(\(0,\i\.jsxs?\)\(\i\.\i,{className:(\i)\.divider}\)).+?)/,
                replace: "$&,$self.renderDMPageList({user: arguments[0].user, Divider: $1, listStyle: $2.list})"
            }
        }
    ],

    pushSection(sections: any[], user: User) {
        if (isBotOrSelf(user) || sections[IS_PATCHED]) return;

        sections[IS_PATCHED] = true;
        sections.push({
            section: "MUTUAL_GDMS",
            text: getMutualGDMCountText(user)
        });
    },

    renderMutualGDMs: ErrorBoundary.wrap(({ user, onClose }: { user: User, onClose: () => void; }) => {
        const mutualGDms = useMemo(() => getMutualGroupDms(user.id), [user.id]);

        const entries = renderClickableGDMs(mutualGDms, onClose);

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
    }),

    renderDMPageList: ErrorBoundary.wrap(({ user, Divider, listStyle }: { user: User, Divider: JSX.Element, listStyle: string; }) => {
        const mutualGDms = getMutualGroupDms(user.id);
        if (mutualGDms.length === 0) return null;


        return (
            <>
                {Divider}
                <ExpandableList
                    listClassName={listStyle}
                    header={"Mutual Groups"}
                    isLoading={false}
                    items={renderClickableGDMs(mutualGDms, () => { })}
                />
            </>
        );
    })
});
