/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import {
    addBadge,
    BadgePosition,
    BadgeUserArgs,
    ProfileBadge,
    removeBadge
} from "@api/Badges";
import { addDecorator, removeDecorator } from "@api/MemberListDecorators";
import { addDecoration, removeDecoration } from "@api/MessageDecorations";
import ErrorBoundary from "@components/ErrorBoundary";
import definePlugin from "@utils/types";
import { RelationshipStore, UserStore } from "@webpack/common";
import { User } from "discord-types/general";

import { BlockedIcon, FriendIcon } from "./icons";

function getBadges({ userId }: BadgeUserArgs): ProfileBadge[] {
    const user = UserStore.getUser(userId);

    if (!user || user.bot || (!RelationshipStore.isFriend(user.id) && !RelationshipStore.isBlocked(user.id))) return [];

    return [{
        component: () => (
            <span className="vc-platform-indicator">
                <FriendIndicator
                    user={user}
                    small={true}
                />
            </span>
        ),
        key: `vc-${RelationshipStore.isFriend(userId)?"friend":"blocked"}-indicator`,
    }];
}

const badge: ProfileBadge = {
    getBadges,
    position: BadgePosition.START
};

export default definePlugin({
    name: "FriendIcon",
    authors: [{
        name: "Scyye",
        id: 553652308295155723n
    }],
    description: "Adds icons to indicate relationships with users.",
    start() {
        for (const location in indicatorLocations) {
            if (indicatorLocations[location]) {
                indicatorLocations[location].onEnable();
            }
        }
    },
    stop() {
        for (const location in indicatorLocations) {
            if (indicatorLocations[location]) {
                indicatorLocations[location].onDisable();
            }
        }
    }
});


const indicatorLocations = {
    list: {
        description: "In the member list",
        onEnable: () => addDecorator("friend-indicator", props =>
            <ErrorBoundary noop>
                <FriendIndicator user={props.user} small={true} />
            </ErrorBoundary>
        ),
        onDisable: () => removeDecorator("friend-indicator")
    },
    badges: {
        description: "In user profiles, as badges",
        onEnable: () => addBadge(badge),
        onDisable: () => removeBadge(badge)
    },
    messages: {
        description: "Inside messages",
        onEnable: () => addDecoration("friend-indicator", props =>
            <ErrorBoundary noop>
                <FriendIndicator user={props.message?.author} wantTopMargin={true} />
            </ErrorBoundary>
        ),
        onDisable: () => removeDecoration("platform-indicator")
    }
};

const FriendIndicator = ({ user, wantMargin = true, wantTopMargin = false, small = false }: { user: User; wantMargin?: boolean; wantTopMargin?: boolean; small?: boolean; }) => {
    if (!user || user.bot || (!RelationshipStore.isFriend(user.id) && !RelationshipStore.isBlocked(user.id))) return null;

    return (
        <span
            className="vc-friend-indicator"
            style={{
                display: "inline-flex",
                justifyContent: "center",
                alignItems: "center",
                marginLeft: wantMargin ? 4 : 0,
                verticalAlign: "top",
                position: "relative",
                top: wantTopMargin ? 2 : 0,
                padding: !wantMargin ? 1 : 0,
                gap: 2
            }}
        >
            {RelationshipStore.isFriend(user.id)? <FriendIcon /> : <BlockedIcon />}
        </span>
    );
};
