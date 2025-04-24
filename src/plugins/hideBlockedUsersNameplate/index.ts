/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";

const { RelationshipStore } = findByPropsLazy("isBlocked", "isIgnored");
const logger = new Logger("hideBlockedUsersInGuild");

export default definePlugin({
    name: "hideBlockedUsersInGuild",
    description: "Hides blocked users from guild member lists",
    authors: [Devs.lunalu],

    patches: [
        // Target the MemberListItem component directly
        {
            find: "memberListItem",
            replacement: [
                {
                    // Look for the render function of member items
                    match: /function\s+\w+\s*\(\s*(\w+)\s*\)\s*{/,
                    replace: "function $1($2) {\nif($self.shouldHideGuildMember($2))return null;"
                }
            ]
        },
        // Another approach - target the list component that processes members
        {
            find: "MemberListItem",
            replacement: [
                {
                    match: /var\s+(\w+)\s*=\s*\w+\.members/,
                    replace: "var $1 = $self.filterBlockedMembers($&)"
                }
            ]
        },
        // Target the section renderer that renders groups of members
        {
            find: "renderSection",
            replacement: [
                {
                    match: /function\s+renderSection\s*\([^)]*\)\s*{/,
                    replace: "$&\nconst originalItems = section.items;\nsection.items = $self.filterBlockedMembers(originalItems);"
                }
            ]
        }
    ],

    start() {
        logger.info("Plugin started");
    },

    stop() {
        logger.info("Plugin stopped");
    },

    shouldHideGuildMember(props: any): boolean {
        try {
            // For debugging
            logger.info("Checking member:", props);

            // Different components might have the user in different places
            const userId = props?.user?.id || props?.member?.user?.id || props?.id;

            if (!userId) return false;

            return RelationshipStore.isBlocked(userId);
        } catch (e) {
            logger.error("Failed to check if guild member is blocked:", e);
            return false;
        }
    },

    filterBlockedMembers(members: any[]): any[] {
        try {
            if (!Array.isArray(members)) {
                logger.info("Not an array:", members);
                return members;
            }

            logger.info("Filtering array of", members.length, "members");

            // Filter out any members whose user is blocked
            return members.filter(member => {
                if (!member) return true;

                // Different components might have the user in different places
                const userId = member?.user?.id || member?.member?.user?.id || member?.id;

                if (!userId) return true;

                const isBlocked = RelationshipStore.isBlocked(userId);
                if (isBlocked) {
                    logger.info("Filtering out blocked user:", userId);
                }
                return !isBlocked;
            });
        } catch (e) {
            logger.error("Failed to filter blocked members:", e);
            return members;
        }
    }
});
