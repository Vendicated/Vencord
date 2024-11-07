/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/**
 * I got told to create a new plugin for that!
 * I had the option to add this as a new* feature for src/plugins/noBlockedMessages
 * But I also didnt like the name noBlockedMessages as this does nothing about messages. Only transforms a block to a "real" block.
 * I asked if I should add this as a feature and maybe rename the plugin to noBlockedUsers but this was unofficially denied (not by a mantainer).
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


/**
 * Adds a "Mute and Block" or "Unmute and Unblock" item to user context menus.
 *
 * If the user is blocked, the action will unmute and unblock the user. Otherwise,
 * the action will mute and block the user.
 *
 * @param children The menu items to add the new item to.
 * @param props The props passed to the user context menu.
 * @returns The modified children with the new item added.
 */
const userContextPatch: NavContextMenuPatchCallback = (children, { user }: { user?: User, onClose(): void; }) => {
    if (!user) return;

    // Determine the label and action based on the user's blocked status
    const isBlocked = RelationshipStore.isBlocked(user.id);
    const lbl = isBlocked ? "Unmute and Unblock" : "Mute and Block";

    /**
     * Handles the logic for toggling mute and block/unblock when the user
     * clicks the "Mute and Block" or "Unmute and Unblock" context menu item.
     *
     * If the user is currently blocked, the action will unmute and unblock.
     * Otherwise, the action will mute and block.
     *
     * @private
     */
    const action = () => {
        // Toggle mute and handle block/unblock logic
        if (isBlocked) {
            // Logic to unblock the user
            if (isLocalMute(user.id)) {
                toggleLocalMute(user.id); // Unmute the user
            }
            unblockUser(user);
        } else {
            // Logic to block the user
            if (!isLocalMute(user.id)) {
                toggleLocalMute(user.id); // Mute the user
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

/**
 * Blocks a user by adding a relationship with type 2.
 *
 * This function updates the relationship store to mark the specified
 * user as blocked. The block action is associated with the "ContextMenu"
 * location.
 *
 * @param user The user to block.
 */
function blockUser(user: User) {
    addRelationship({
        userId: user.id, type: 2, context: {
            location: "ContextMenu"
        }
    });
}


/**
 * Unblocks a user by adding a relationship with type 0.
 *
 * This function updates the relationship store to mark the specified
 * user as unblocked. The unblock action is associated with the "ContextMenu"
 * location.
 *
 * @param user The user to unblock.
 */
function unblockUser(user: User) {
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
    patches: [],
    contextMenus: {
        "user-context": userContextPatch,
        "user-profile-actions": userContextPatch,
        "user-profile-overflow-menu": userContextPatch
    },
    /**
     * Attaches a listener to the RelationshipStore and runs the automatic muted user check once.
     *
     * The listener is needed to detect when a user is blocked and should be muted.
     * The initial function call is needed to mute users that are already blocked when the plugin is started.
     */
    start() {
        RelationshipStore.addChangeListener(() => {
            this.automaticMuteBlockedUsers();
        });
        this.automaticMuteBlockedUsers();
    },
    /**
     * Automatically mutes all blocked users and unmutes all unblocked users.
     *
     * This function is called whenever the RelationshipStore changes. It is
     * also called once when the plugin is started. It is responsible for
     * updating the mute status of users based on their blocked status.
     *
     * @private
     */
    automaticMuteBlockedUsers() {
        const { autoMuteBlocked } = settings.store;
        if (!autoMuteBlocked) return;

        // Get all relationships and filter for blocked users
        const blockedIds = Object.entries(RelationshipStore.getRelationships())
            .filter(([_, v]) => v === 2) // 2 represents blocked
            .map(([k]) => UserStore.getUser(k).id); // Get user IDs of blocked users

        // Mute blocked users
        for (const ID of blockedIds) {
            if (!isLocalMute(ID)) {
                toggleLocalMute(ID);
            }
        }

        // Check for unblocked users
        const allUsers = UserStore.getUsers(); // Get all users as a Record<string, User>
        const allUserIds = Object.keys(allUsers);

        for (const ID of allUserIds) {
            if (!RelationshipStore.isBlocked(ID)) {
                // Unmute the user if they are unblocked
                if (isLocalMute(ID)) {
                    toggleLocalMute(ID);
                }
            }
        }
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
                                toggleLocalMute(user.id); // Unmute the user
                            }
                            unblockUser(user);
                        } else {
                            // If the user is not blocked, mute and block
                            if (!isLocalMute(user.id)) {
                                toggleLocalMute(user.id); // Mute the user
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
