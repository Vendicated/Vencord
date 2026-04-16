/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { copyToClipboard } from "@utils/clipboard";
import { EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Menu, Toasts, UserProfileStore } from "@webpack/common";

function getProfileColors(userId) {
    try {
        const profile = UserProfileStore.getUserProfile(userId);

        if (!profile || !profile.themeColors || profile.themeColors.length < 2) {
            return null;
        }

        const primaryColor = profile.themeColors[0].toString(16).padStart(6, "0");
        const secondaryColor = profile.themeColors[1].toString(16).padStart(6, "0");

        return { primaryColor, secondaryColor };
    } catch (e) {
        console.error("Failed to get profile colors:", e);
        return null;
    }
}

function copyProfileColors(userId) {
    const colors = getProfileColors(userId);

    if (!colors) {
        Toasts.show({
            type: Toasts.Type.FAILURE,
            message: "No profile colors found!",
            id: Toasts.genId()
        });
        return;
    }

    const { primaryColor, secondaryColor } = colors;

    //  Formatting
    const formattedColors = `Primary-color #${primaryColor}, Secondary-Color #${secondaryColor}`;

    try {
        copyToClipboard(formattedColors);
        Toasts.show({
            type: Toasts.Type.SUCCESS,
            message: "Profile colors copied to clipboard!",
            id: Toasts.genId()
        });
    } catch (e) {
        console.error("Failed to copy to clipboard:", e);
        Toasts.show({
            type: Toasts.Type.FAILURE,
            message: "Error copying profile colors!",
            id: Toasts.genId()
        });
    }
}

export function ColorIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path fill="currentColor" d="M17,4H15.82A3,3,0,0,0,13,2H11A3,3,0,0,0,8.18,4H7A3,3,0,0,0,4,7V19a3,3,0,0,0,3,3H17a3,3,0,0,0,3-3V7A3,3,0,0,0,17,4ZM10,5a1,1,0,0,1,1-1h2a1,1,0,0,1,1,1V6H10Zm8,14a1,1,0,0,1-1,1H7a1,1,0,0,1-1-1V7A1,1,0,0,1,7,6H8V7A1,1,0,0,0,9,8h6a1,1,0,0,0,1-1V6h1a1,1,0,0,1,1,1Z" />
        </svg>
    );
}
// spawn in the context menu
const userContextMenuPatch: NavContextMenuPatchCallback = (children, { user }) => {
    if (!user) return;
    children.push(
        <Menu.MenuItem
            id="CopyProfileColors"
            icon={ColorIcon}
            label="Copy Profile Colors"
            action={() => copyProfileColors(user.id)}
        />
    );
};

export default definePlugin({
    name: "CopyProfileColors",
    description: "A plugin to copy people's profile gradient colors to clipboard.",
    authors: [EquicordDevs.Crxa, EquicordDevs.Cortex],
    contextMenus: {
        "user-context": userContextMenuPatch,
        "user-profile-actions": userContextMenuPatch
    }
});
