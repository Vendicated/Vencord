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

import { BaseText } from "@components/BaseText";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { isNonNullish } from "@utils/guards";
import { Logger } from "@utils/Logger";
import { classes } from "@utils/misc";
import definePlugin from "@utils/types";
import { Channel, User } from "@vencord/discord-types";
import { findByPropsLazy, findCssClassesLazy } from "@webpack";
import { Avatar, ChannelStore, Clickable, IconUtils, RelationshipStore, ScrollerThin, useMemo, UsernameUtils, UserStore } from "@webpack/common";
import { ComponentType, JSX } from "react";

const SelectedChannelActionCreators = findByPropsLazy("selectPrivateChannel");

const ProfileListClasses = findCssClassesLazy("empty", "textContainer", "connectionIcon");
const TabBarClasses = findCssClassesLazy("tabPanelScroller", "tabBarPanel");
const MutualsListClasses = findCssClassesLazy("row", "icon", "name", "details");

let ExpandableList: ComponentType<any> = () => null;

const logger = new Logger("MutualGroupDMs");

function getGroupDMName(channel: Channel) {
    return channel.name ||
        channel.recipients
            .map(UserStore.getUser)
            .filter(isNonNullish)
            .map(c => RelationshipStore.getNickname(c.id) || UsernameUtils.getName(c))
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

function renderClickableGDMs(mutualDms: Channel[], onClose?: () => void) {
    return mutualDms.map(c => (
        <Clickable
            key={c.id}
            className={MutualsListClasses.row}
            onClick={() => {
                onClose?.();
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
                <BaseText size="xs" weight="medium">{c.recipients.length + 1} Members</BaseText>
            </div>
        </Clickable>
    ));
}

export default definePlugin({
    name: "MutualGroupDMs",
    description: "Shows mutual group dms in profiles",
    tags: ["Friends", "Appearance"],
    authors: [Devs.amia],

    patches: [
        // Legacy User Profile Modal
        {
            find: ".BOT_DATA_ACCESS?(",
            replacement: [
                {
                    match: /(?<=initialSection:\i=\i\.\i\.USER_INFO,onClose:\i\}=)(\i)/,
                    replace: "$self.getProps($1)"
                },
                {
                    match: /\(0,\i\.jsx\)\(\i,\{items:\i,section:(\i)/,
                    replace: "$1==='MUTUAL_GDMS'?$self.renderMutualGDMs({...arguments[0],isLegacy:true}):$&"
                },
                // Discord adds spacing between each item which pushes our tab off screen.
                // set the gap to zero to ensure ours stays on screen
                {
                    match: /className:\i\.\i(?=,type:"top")/,
                    replace: '$& + " vc-mutual-gdms-modal-tab-bar"'
                }
            ]
        },
        // User Profile Modal v2
        {
            find: ".WIDGETS?",
            replacement: [
                {
                    match: /(?<=items:\i,initialSection:\i,onClose:\i\}=)(\i)/,
                    replace: "$self.getProps($1)"
                },
                {
                    match: /children:(?=.{0,100}?component:.+?section:(\i))/,
                    replace: "$&$1.section==='MUTUAL_GDMS'?$self.renderMutualGDMs(arguments[0]):"
                },
                // Make the gap between each item smaller so our tab can fit.
                {
                    match: /type:"top",/,
                    replace: '$&className:"vc-mutual-gdms-modal-v2-tab-bar",'
                },
            ]
        },
        // Legacy DM Sidebar
        {
            find: 'section:"MUTUAL_FRIENDS"',
            replacement: [
                {
                    match: /\i\|\|\i(?=\?\(0,\i\.jsxs?\)\(\i\.\i\.Overlay,)/,
                    replace: "$&||$self.getMutualGroupDms(arguments[0].user.id).length>0"
                },
                {
                    match: /\.openUserProfileModal.+?\)}\)}\)(?<=,(\i)&&(\i)&&(\(0,\i\.jsxs?\)\(\i\.\i,{className:(\i)\.\i}\)).{0,50}?"MUTUAL_FRIENDS".+?)/,
                    replace: (m, hasMutualGuilds, hasMutualFriends, Divider, classes) => "" +
                        `${m},$self.renderDMPageList({user:arguments[0].user,hasDivider:${hasMutualGuilds}||${hasMutualFriends},Divider:${Divider},listStyle:${classes}.list})`
                },
                {
                    match: /(?=function (\i)\(\i\){let{section:\i,header:\i[^}]+?onExpand:)/,
                    replace: "$self.ExpandableList=$1;"
                }
            ]
        }
    ],

    set ExpandableList(value: any) {
        ExpandableList = value;
    },

    getMutualGroupDms(userId: string) {
        try {
            return getMutualGroupDms(userId);
        } catch (e) {
            logger.error("Failed to get mutual group dms:", e);
        }

        return [];
    },

    getProps(props: { user: User, items: any[]; }) {
        try {
            if (isBotOrSelf(props.user)) return props;

            const section = { text: getMutualGDMCountText(props.user), section: "MUTUAL_GDMS" };
            return { ...props, items: [...props.items, section] };
        }
        catch (e) {
            logger.error("Failed to append mutual group dms section:", e);
        }

        return props;
    },

    renderMutualGDMs: ErrorBoundary.wrap(({ user, onClose, isLegacy }: { user: User, onClose: () => void; isLegacy: boolean; }) => {
        const mutualGDms = useMemo(() => getMutualGroupDms(user.id), [user.id]);
        const entries = renderClickableGDMs(mutualGDms, onClose);

        return (
            <ScrollerThin
                className={classes(TabBarClasses.tabPanelScroller, !isLegacy && "vc-mutual-gdms-scroller")}
                fade={true}
                onClose={onClose}
            >
                {entries.length > 0
                    ? entries
                    : (
                        <div className={ProfileListClasses.empty}>
                            <div className={ProfileListClasses.textContainer}>
                                <BaseText tag="h3" size="md" weight="medium" style={{ color: "var(--text-strong)" }}>You don't have any group chats in common</BaseText>
                            </div>
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
                    listClassName={classes(listStyle, "vc-mutual-gdms-dm-page-list")}
                    header={"Mutual Groups"}
                    isLoading={false}
                    items={renderClickableGDMs(mutualGDms)}
                />
            </>
        );
    }, { noop: true })
});
