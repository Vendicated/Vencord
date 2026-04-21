/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";
import { RelationshipType } from "@vencord/discord-types/enums";
import { findByPropsLazy } from "@webpack";
import { Menu, RelationshipStore } from "@webpack/common";

const RelationshipActions = findByPropsLazy("cancelFriendRequest", "addRelationship");

function isOutgoingFriendRequest(userId: string) {
    return RelationshipStore.getRelationshipType(userId) === RelationshipType.OUTGOING_REQUEST;
}

function cancelOutgoingFriendRequest(userId: string) {
    if (!isOutgoingFriendRequest(userId)) return;
    return RelationshipActions.cancelFriendRequest(userId);
}

const userContextPatch: NavContextMenuPatchCallback = (children, { user }) => {
    if (!user || !isOutgoingFriendRequest(user.id)) return;

    children.push(
        <Menu.MenuItem
            id="vc-cancel-outgoing-friend-request"
            label="Cancel Outgoing Friend Request"
            action={() => cancelOutgoingFriendRequest(user.id)}
        />
    );
};

export default definePlugin({
    name: "CancelFriendRequest",
    description: "Adds a way to cancel outgoing friend requests from profiles.",
    authors: [EquicordDevs.omaw],

    contextMenus: {
        "user-profile-overflow-menu": userContextPatch
    },

    patches: [
        {
            find: "#{intl::rQSndv::raw}",
            replacement: {
                match: /variant:"primary",.{0,50}#{intl::ADD_FRIEND_BUTTON_AFTER}\)/,
                replace: "...$self.getCancelFriendRequestTextButtonProps(arguments[0].user.id)"
            }
        },
        {
            find: "#{intl::FRIENDS_REQUEST_STATUS_OUTGOING}",
            group: true,
            replacement: [
                {
                    match: /(?<=\i=\{icon:(\i),.{0,100}\.\.\.\i)(?=\};return 0===)/g,
                    replace: ",...$self.getCancelFriendRequestIconButtonProps(arguments[0],$1)"
                },
                {
                    match: /disabled:!0(?=.{0,25}targetElementRef:)/g,
                    replace: "disabled:!$self.isOutgoingButton(arguments[0])"
                }
            ]
        }
    ],

    isOutgoingButton({ relationshipType, hasOutgoingPendingGameFriends }) {
        return relationshipType === RelationshipType.OUTGOING_REQUEST || hasOutgoingPendingGameFriends === true;
    },

    getCancelFriendRequestTextButtonProps(userId: string) {
        return {
            variant: "critical-secondary",
            onClick: () => cancelOutgoingFriendRequest(userId),
            text: "Cancel Outgoing Friend Request"
        };
    },

    getCancelFriendRequestIconButtonProps(context, Icon) {
        if (!this.isOutgoingButton(context)) return {};

        return {
            "aria-label": "Cancel Outgoing Friend Request",
            disabled: false,
            icon: Icon ? (iconProps: Record<string, unknown>) => <Icon {...iconProps} color="var(--status-danger)" /> : undefined,
            tooltipText: "Cancel Outgoing Friend Request",
            variant: "critical-secondary",
            onClick: () => cancelOutgoingFriendRequest(context?.user?.id)
        };
    }
});
