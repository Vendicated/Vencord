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

import "./style.css";

import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { isNonNullish } from "@utils/guards";
import { Logger } from "@utils/Logger";
import definePlugin from "@utils/types";
import { findByPropsLazy, findComponentByCodeLazy } from "@webpack";
import { Avatar, ChannelStore, Clickable, IconUtils, RelationshipStore, ScrollerThin, useMemo, UserStore } from "@webpack/common";
import { Channel, User } from "discord-types/general";
import { JSX } from "react";

const SelectedChannelActionCreators = findByPropsLazy("selectPrivateChannel");
const UserUtils = findByPropsLazy("getGlobalName");

const ProfileListClasses = findByPropsLazy("emptyIconFriends", "emptyIconGuilds");
const MutualsListClasses = findByPropsLazy("row", "icon", "name", "nick");
const ExpandableList = findComponentByCodeLazy('"PRESS_SECTION"', ".header");

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
            key={c.id}
            className={MutualsListClasses.row}
            onClick={() => {
                onClose();
                SelectedChannelActionCreators.selectPrivateChannel(c.id);
            }}
        >
            <Avatar
                src={IconUtils.getChannelIconURL({ id: c.id, icon: c.icon, size: 32 })}
                size="SIZE_40"
                className={MutualsListClasses.icon}
            >
            </Avatar>
            <div className={MutualsListClasses.details}>
                <div className={MutualsListClasses.name}>{getGroupDMName(c)}</div>
                <div className={MutualsListClasses.nick}>{c.recipients.length + 1} Members</div>
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
        // User Profile Modal
        {
            find: ".BOT_DATA_ACCESS?(",
            replacement: [
                {
                    match: /\i\.useEffect.{0,100}(\i)\[0\]\.section/,
                    replace: "$self.pushSection($1,arguments[0].user);$&"
                },
                {
                    match: /\(0,\i\.jsx\)\(\i,\{items:\i,section:(\i)/,
                    replace: "$1==='MUTUAL_GDMS'?$self.renderMutualGDMs(arguments[0]):$&"
                },
                // Discord adds spacing between each item which pushes our tab off screen.
                // set the gap to zero to ensure ours stays on screen
                {
                    match: /className:\i\.tabBar/,
                    replace: '$& + " vc-mutual-gdms-modal-tab-bar"'
                }
            ]
        },
        // User Profile Modal v2
        {
            find: ".tabBarPanel,children:",
            replacement: [
                {
                    match: /items:(\i),.+?(?=return\(0,\i\.jsxs?\)\("div)/,
                    replace: "$&$self.pushSection($1,arguments[0].user);"
                },
                {
                    match: /\.tabBarPanel,children:(?=.+?section:(\i))/,
                    replace: "$&$1==='MUTUAL_GDMS'?$self.renderMutualGDMs(arguments[0]):"
                },
                // Make the gap between each item smaller so our tab can fit.
                {
                    match: /type:"top",/,
                    replace: '$&className:"vc-mutual-gdms-modal-v2-tab-bar",'
                },
            ]
        },
        {
            find: 'section:"MUTUAL_FRIENDS"',
            replacement: [
                {
                    match: /\i\|\|\i(?=\?\(0,\i\.jsxs?\)\(\i\.\i\.Overlay,)/,
                    replace: "$&||$self.getMutualGroupDms(arguments[0].user.id).length>0"
                },
                {
                    match: /\.openUserProfileModal.+?\)}\)}\)(?<=,(\i)&&(\i)&&(\(0,\i\.jsxs?\)\(\i\.\i,{className:(\i)\.divider}\)).+?)/,
                    replace: (m, hasMutualGuilds, hasMutualFriends, Divider, classes) => "" +
                        `${m},$self.renderDMPageList({user:arguments[0].user,hasDivider:${hasMutualGuilds}||${hasMutualFriends},Divider:${Divider},listStyle:${classes}.list})`
                }
            ]
        }
    ],

    getMutualGroupDms(userId: string) {
        try {
            return getMutualGroupDms(userId);
        } catch (e) {
            new Logger("MutualGroupDMs").error("Failed to get mutual group dms:", e);
        }

        return [];
    },

    pushSection(sections: any[], user: User) {
        try {
            if (isBotOrSelf(user) || sections[IS_PATCHED]) return;

            sections[IS_PATCHED] = true;
            sections.push({
                text: getMutualGDMCountText(user),
                section: "MUTUAL_GDMS",
            });
        } catch (e) {
            new Logger("MutualGroupDMs").error("Failed to push mutual group dms section:", e);
        }
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

    renderDMPageList: ErrorBoundary.wrap(({ user, hasDivider, Divider, listStyle }: { user: User, hasDivider: boolean, Divider: JSX.Element, listStyle: string; }) => {
        const mutualGDms = getMutualGroupDms(user.id);
        if (mutualGDms.length === 0) return null;

        return (
            <>
                {hasDivider && Divider}
                <ExpandableList
                    listClassName={listStyle}
                    header={"Mutual Groups"}
                    isLoading={false}
                    items={renderClickableGDMs(mutualGDms, () => { })}
                />
            </>
        );
    }, { noop: true })
});
