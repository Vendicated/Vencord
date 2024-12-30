/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { LogIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import { classes } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { Button, Menu, React, RelationshipStore, TooltipContainer, UserStore, } from "@webpack/common";
import { User } from "discord-types/general";

const { toggleLocalMute } = findByPropsLazy("toggleLocalMute");
const { isLocalMute } = findByPropsLazy("isLocalMute");
const { addRelationship } = findByPropsLazy("addRelationship");
const RoleButtonClasses = findByPropsLazy("button", "buttonInner", "icon", "banner");

let blockedUserIds: Set<string> = new Set();
let blockedUserCount = 0;

const userContextPatch: NavContextMenuPatchCallback = (children, { user }: { user?: User, onClose(): void; }) => {
    if (!user) return;

    // Determine the label and action based on the user's blocked status
    const isBlocked = RelationshipStore.isBlocked(user.id);
    const lbl = isBlocked ? "Unmute and Unblock" : "Mute and Block";

    const action = () => {
        // Toggle mute and handle block/unblock logic
        if (isBlocked) {
            if (isLocalMute(user.id)) {
                toggleLocalMute(user.id);
            }
            unblockUser(user);
        } else {
            if (!isLocalMute(user.id)) {
                toggleLocalMute(user.id);
            }
            blockUser(user);
        }
    };

    children.push(
        <Menu.MenuItem
            icon={LogIcon}
            label={lbl}
            id="vc-hu"
            action={action}
        />
    );
};

function blockUser(user: User) {
    if (!isLocalMute(user.id)) {
        toggleLocalMute(user.id);
    }

    addRelationship({
        userId: user.id, type: 2, context: {
            location: "ContextMenu"
        }
    });
}

function unblockUser(user: User) {
    if (isLocalMute(user.id)) {
        toggleLocalMute(user.id);
    }

    addRelationship({
        userId: user.id, type: 0, context: {
            location: "ContextMenu"
        }
    });
}

const settings = definePluginSettings({
    autoMuteBlocked: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Automatically mute blocked users.",
        restartNeeded: false
    }
});

export default definePlugin({
    name: "VoiceMuteBlockedUsers",
    description: `Automatically voice-mute blocked users for better visibility and manageability in your Discord experience. Transform normal blocks into "real" ones with ease, ensuring a smoother and more organized communication environment.`,
    authors: [Devs.notvexi],
    settings,
    contextMenus: {
        "user-context": userContextPatch,
        "user-profile-actions": userContextPatch,
        "user-profile-overflow-menu": userContextPatch
    },
    start() {
        RelationshipStore.addChangeListener(() => {
            this.automaticMuteBlockedUsers();
        });
        this.automaticMuteBlockedUsers();
    },
    automaticMuteBlockedUsers() {
        const { autoMuteBlocked } = settings.store;
        if (!autoMuteBlocked) return;

        // Get all relationships and filter for blocked users
        const blockedIdsSet = new Set(
            Object.entries(RelationshipStore.getRelationships())
                .filter(([_, v]) => v === 2)
                .map(([k]) => UserStore.getUser(k).id)
        );

        // Mute blocked users in batch
        const toMute = [...blockedIdsSet].filter(ID => !isLocalMute(ID));
        if (toMute.length > 0) {
            toMute.forEach(ID => toggleLocalMute(ID));
            blockedUserIds = new Set([...blockedUserIds, ...toMute]); // Update blockedUserIds
        }

        // Handle unblocking
        if (blockedUserCount > blockedIdsSet.size) {
            const unblockedUsers = [...blockedUserIds].filter(id => !blockedIdsSet.has(id));
            unblockedUsers.forEach(ID => {
                if (isLocalMute(ID)) {
                    toggleLocalMute(ID);
                }
                blockedUserIds.delete(ID);
            });
        }

        blockedUserCount = blockedIdsSet.size;
    },
    BlockUnblockButton: ErrorBoundary.wrap(({ user }: { user: User; }) => {
        if (!user) return null; // Return null if no user is provided

        // Determine the button label based on the user's blocked status
        const isBlocked = RelationshipStore.isBlocked(user.id);
        const lbl = isBlocked ? "Unmute and Unblock" : "Mute and Block";

        return (
            <TooltipContainer text={lbl}>
                <Button
                    onClick={() => {
                        if (isBlocked) {
                            // If the user is blocked, unmute and unblock
                            if (isLocalMute(user.id)) {
                                toggleLocalMute(user.id);
                            }
                            unblockUser(user);
                        } else {
                            // If the user is not blocked, mute and block
                            if (!isLocalMute(user.id)) {
                                toggleLocalMute(user.id);
                            }
                            blockUser(user);
                        }
                    }}
                    color={Button.Colors.CUSTOM}
                    look={Button.Looks.FILLED}
                    size={Button.Sizes.NONE}
                    className={classes(RoleButtonClasses.button, RoleButtonClasses.icon, RoleButtonClasses.banner)}
                    innerClassName={classes(RoleButtonClasses.buttonInner, RoleButtonClasses.icon, RoleButtonClasses.banner)}
                >
                    <LogIcon height={16} width={16} />
                    {lbl} {/* Display the label */}
                </Button>
            </TooltipContainer>
        );
    }, { noop: true })
});
