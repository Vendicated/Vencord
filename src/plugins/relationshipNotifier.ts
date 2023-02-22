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

import { showNotification } from "@api/Notifications";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { FluxDispatcher, UserUtils } from "@webpack/common";
import { User } from "discord-types/general";

enum RelationshipType {
    NONE = 0,
    FRIEND = 1,
    BLOCKED = 2,
    PENDING_INCOMING = 3,
    PENDING_OUTGOING = 4,
    IMPLICIT = 5
}

interface RelationshipPayload {
    type: "RELATIONSHIP_ADD" | "RELATIONSHIP_REMOVE" | "RELATIONSHIP_UPDATE";
    relationship: {
        id: string;
        type: RelationshipType;
        since?: Date;
        nickname?: string;
        user?: User;
    };
}

async function onRelationshipUpdate({ relationship }: RelationshipPayload) {
    if (!relationship.id) return;
    const user = await UserUtils.fetchUser(relationship.id);
    if (!user) return;

    function onClick() {
        FluxDispatcher.dispatch({
            type: "USER_PROFILE_MODAL_OPEN",
            userId: user.id
        });
    }

    switch (relationship.type) {
        case RelationshipType.FRIEND: {
            showNotification({
                title: "Friend Added",
                body: `${user.username} is now your friend.`,
                icon: user.getAvatarURL(),
                onClick,
            });
            break;
        }
        case RelationshipType.PENDING_INCOMING: {
            showNotification({
                title: "Friend Request Received",
                body: `${user.username} sent you a friend request.`,
                icon: user.getAvatarURL(),
                onClick,
            });
            break;
        }
        case RelationshipType.PENDING_OUTGOING: {
            showNotification({
                title: "Friend Request Sent",
                body: `You sent a friend request to ${user.username}`,
                icon: user.getAvatarURL(),
                onClick
            });
            break;
        }
        case RelationshipType.BLOCKED: {
            showNotification({
                title: "User Blocked",
                body: `You just blocked ${user.username}`,
                icon: user.getAvatarURL(),
                onClick
            });
            break;
        }
    }
}

async function onRelationshipRemove({ relationship }: RelationshipPayload) {
    if (!relationship.id) return;
    const user = await UserUtils.fetchUser(relationship.id);
    if (!user) return;

    function onClick() {
        FluxDispatcher.dispatch({
            type: "USER_PROFILE_MODAL_OPEN",
            userId: user.id
        });
    }

    switch (relationship.type) {
        case RelationshipType.FRIEND: {
            showNotification({
                title: "Friend Removed",
                body: `${user.username} is no longer on your friends list.`,
                icon: user.getAvatarURL(),
                onClick,
            });
            break;
        }
        case RelationshipType.PENDING_INCOMING: {
            showNotification({
                title: "Friend Request Cancelled",
                body: `${user.username} cancelled their friend request.`,
                icon: user.getAvatarURL(),
                onClick,
            });
            break;
        }
        case RelationshipType.PENDING_OUTGOING: {
            showNotification({
                title: "Friend Request Cancelled",
                body: `You cancelled your friend request to ${user.username}`,
                icon: user.getAvatarURL(),
                onClick
            });
            break;
        }
        case RelationshipType.BLOCKED: {
            showNotification({
                title: "User Unblocked",
                body: `You just unblocked ${user.username}`,
                icon: user.getAvatarURL(),
                onClick
            });
            break;
        }
    }
}

export default definePlugin({
    name: "RelationshipNotifier",
    authors: [Devs.Megu],
    description: "Receive notifications for friend requests, removals, blocks, etc.",

    start() {
        FluxDispatcher.subscribe("RELATIONSHIP_ADD", onRelationshipUpdate);
        FluxDispatcher.subscribe("RELATIONSHIP_UPDATE", onRelationshipUpdate);
        FluxDispatcher.subscribe("RELATIONSHIP_REMOVE", onRelationshipRemove);
    },

    stop() {
        FluxDispatcher.unsubscribe("RELATIONSHIP_ADD", onRelationshipUpdate);
        FluxDispatcher.unsubscribe("RELATIONSHIP_UPDATE", onRelationshipUpdate);
        FluxDispatcher.unsubscribe("RELATIONSHIP_REMOVE", onRelationshipRemove);
    }
});
