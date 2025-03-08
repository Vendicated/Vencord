/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BadgeUserArgs, ProfileBadge } from "@api/Badges";
import { RelationshipStore, UserStore } from "@webpack/common";
import { User } from "discord-types/general";

import { BlockedIcon, FriendIcon } from "./icons";

const shouldShowIndicator = (user?: User|null) => {
    return user && !user.bot && (RelationshipStore.isFriend(user.id) || RelationshipStore.isBlocked(user.id));
};

export const RelationshipIndicator = ({ user, wantMargin = true, wantTopMargin = false }: { user: User; wantMargin?: boolean; wantTopMargin?: boolean; }) => {
    if (!shouldShowIndicator(user)) return null;

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

export function getBadges({ userId }: BadgeUserArgs): ProfileBadge[] {
    const user = UserStore.getUser(userId);
    if (!shouldShowIndicator(user)) return [];

    return [{
        component: () => (
            <span className="vc-relationship-indicator">
                <RelationshipIndicator user={user} />
            </span>
        ),
        key: `vc-${RelationshipStore.isFriend(userId)?"friend":"blocked"}-indicator`,
    }];
}
