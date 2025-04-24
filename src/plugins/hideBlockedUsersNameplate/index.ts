/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { RelationshipStore } from "@webpack/common";


function getBlockedUserIds() {
    // Get all user IDs from the RelationshipStore
    const relationships = RelationshipStore.getRelationships();

    // Filter for blocked relationships
    const blockedIds = Object.entries(relationships)
        .filter(([_, type]) => type === 2) // Relationship type 2 is for blocked users
        .map(([userId, _]) => userId);

    return blockedIds;
}
export default definePlugin({
    name: "hideBlockedUsersInGuild",
    description: "Hides blocked users from guild member lists",
    authors: [Devs.lunalu],

    // Use a function to get blocked user IDs dynamically
    get userIdsToHide() {
        return getBlockedUserIds();
    },

    // Target the avatars in the DOM
    start() {
        // Create and inject a style element
        const style = document.createElement("style");

        // Generate CSS rules for each user ID
        const cssRules = this.userIdsToHide.map(userId => `
            /* Hide avatars with this user ID */
            div.avatarStack__44b0c img[src*="${userId}"],
            img[src*="${userId}"] {
                display: none !important;
            }

            /* Hide the entire nameplate container when it contains this user ID */
            div.childContainer__91a9d:has(img[src*="${userId}"]),
            div.memberInner__5d473:has(img[src*="${userId}"]),
            div.content__91a9d:has(img[src*="${userId}"]) {
                display: none !important;
            }
        `).join("\n");

        style.textContent = cssRules;
        document.head.appendChild(style);

        // For elements that might be dynamically added later
        this.observer = new MutationObserver(this.checkAndHideUsers.bind(this));
        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    },

    // Function to check and hide users that match our criteria
    checkAndHideUsers(mutations) {
        for (const userId of this.userIdsToHide) {
            // Find all images containing this user ID
            const avatarImages = document.querySelectorAll(`img[src*="${userId}"]`);

            avatarImages.forEach(img => {
                // Find the parent container (climbing up to find the nameplate container)
                let element = img;
                while (element && !element.classList.contains('childContainer__91a9d')) {
                    if (element.parentElement) {
                        element = element.parentElement;
                    } else {
                        break;
                    }
                }

                // Hide the container if found
                if (element) {
                    element.style.display = 'none';
                }
            });
        }
    },

    // Clean up when plugin is disabled
    stop() {
        // Remove the style element
        const styleElement = document.querySelector('style[data-plugin="HideUsers"]');
        if (styleElement) styleElement.remove();

        // Disconnect the observer
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    },

    // Function to add a user ID to the hide list
    addUserToHideList(userId) {
        if (!this.userIdsToHide.includes(userId)) {
            this.userIdsToHide.push(userId);
            this.stop();
            this.start();
        }
    },

    // Function to remove a user ID from the hide list
    removeUserFromHideList(userId) {
        const index = this.userIdsToHide.indexOf(userId);
        if (index !== -1) {
            this.userIdsToHide.splice(index, 1);
            this.stop();
            this.start();
        }
    }
});
