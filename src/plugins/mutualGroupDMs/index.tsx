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
import definePlugin from "@utils/types";
import type { GroupDMChannelRecord, UserRecord } from "@vencord/discord-types";
import { findByPropsLazy, findComponentByCodeLazy } from "@webpack";
import { Avatar, ChannelStore, Clickable, IconUtils, RelationshipStore, ScrollerThin, useMemo, UserStore, UserUtils } from "@webpack/common";
import type { ReactNode } from "react";

const SelectedChannelActionCreators = findByPropsLazy("selectPrivateChannel");

const ExpandableList = findComponentByCodeLazy(".mutualFriendItem]");
const ProfileListClasses: Record<string, string> = findByPropsLazy("emptyIconFriends", "emptyIconGuilds");
const GuildLabelClasses: Record<string, string> = findByPropsLazy("guildNick", "guildAvatarWithoutIcon");

function getGroupDMName(channel: GroupDMChannelRecord) {
    if (channel.name) return channel.name;

    const names: string[] = [];
    for (const userId of channel.recipients) {
        const user = UserStore.getUser(userId);
        if (user)
            names.push(RelationshipStore.getNickname(userId) || UserUtils.getName(user));
    }

    return names.join(", ");
}

const useMutualGroupDMs = (userId: string) => useMemo(
    () => ChannelStore.getSortedPrivateChannels()
        .filter((c): c is GroupDMChannelRecord => c.isGroupDM() && c.recipients.includes(userId)),
    [userId]
);

const isBotOrMe = (user: UserRecord) => user.bot || user.id === UserStore.getCurrentUser()!.id;

function getMutualGDMCountText(user: UserRecord) {
    let count = 0;
    for (const channel of Object.values(ChannelStore.getMutablePrivateChannels()))
        if (channel.isGroupDM() && channel.recipients.includes(user.id))
            count++;
    return `${count === 0 ? "No" : count} Mutual Group${count === 1 ? "" : "s"}`;
}

const renderClickableGDMs = (mutualDms: GroupDMChannelRecord[], onClose: () => void) =>
    mutualDms.map(channel => (
        <Clickable
            className={ProfileListClasses.listRow}
            onClick={() => {
                onClose();
                SelectedChannelActionCreators.selectPrivateChannel(channel.id);
            }}
        >
            <Avatar
                src={IconUtils.getChannelIconURL({ id: channel.id, icon: channel.icon, size: 32 })}
                size="SIZE_40"
                className={ProfileListClasses.listAvatar}
            />
            <div className={ProfileListClasses.listRowContent}>
                <div className={ProfileListClasses.listName}>{getGroupDMName(channel)}</div>
                <div className={GuildLabelClasses.guildNick}>{channel.recipients.length + 1} Members</div>
            </div>
        </Clickable>
    ));

const IS_PATCHED = Symbol("MutualGroupDMs.Patched");

export default definePlugin({
    name: "MutualGroupDMs",
    description: "Shows mutual group DMs in profiles",
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

    pushSection(sections: any[] & { [IS_PATCHED]?: true; }, user: UserRecord) {
        if (isBotOrMe(user) || sections[IS_PATCHED]) return;

        sections[IS_PATCHED] = true;
        sections.push({
            section: "MUTUAL_GDMS",
            text: getMutualGDMCountText(user)
        });
    },

    renderMutualGDMs: ErrorBoundary.wrap(({ user, onClose }: { user: UserRecord; onClose: () => void; }) => {
        const mutualGroupDMs = useMutualGroupDMs(user.id);

        const entries = renderClickableGDMs(mutualGroupDMs, onClose);

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
                            <div className={ProfileListClasses.emptyIconFriends} />
                            <div className={ProfileListClasses.emptyText}>No group dms in common</div>
                        </div>
                    )
                }
            </ScrollerThin>
        );
    }),

    renderDMPageList: ErrorBoundary.wrap(({ user, Divider, listStyle }: { user: UserRecord; Divider: ReactNode; listStyle: string; }) => {
        const mutualGDms = useMutualGroupDMs(user.id);
        if (mutualGDms.length === 0) return null;

        const header = getMutualGDMCountText(user);

        return (
            <>
                {Divider}
                <ExpandableList
                    className={listStyle}
                    header={header}
                    isLoadingHeader={false}
                >
                    {renderClickableGDMs(mutualGDms, () => {})}
                </ExpandableList>
            </>
        );
    })
});
