/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { copyToClipboard } from "@utils/clipboard";
import { EquicordDevs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin from "@utils/types";
import { User } from "@vencord/discord-types";
import { Menu, SelectedGuildStore, showToast,UserProfileStore } from "@webpack/common";

const logger = new Logger("CopyProfileColors");

function getProfileColors(userId: string, guildId?: string) {
    try {
        const profile = guildId
            ? UserProfileStore.getGuildMemberProfile(userId, guildId)
            : UserProfileStore.getUserProfile(userId);

        if (!profile?.themeColors || profile.themeColors.length < 2) {
            return null;
        }

        const primaryColor = profile.themeColors[0].toString(16).padStart(6, "0");
        const secondaryColor = profile.themeColors[1].toString(16).padStart(6, "0");

        return { primaryColor, secondaryColor };
    } catch (e) {
        logger.error("Failed to get profile colors:", e);
        return null;
    }
}

function copyProfileColors(userId: string, guildId?: string) {
    const colors = getProfileColors(userId, guildId);

    if (!colors) {
        showToast({ text: "No profile colors found!", variant: "critical" });
        return;
    }

    const { primaryColor, secondaryColor } = colors;

    //  Formatting
    const formattedColors = `Primary-color #${primaryColor}, Secondary-Color #${secondaryColor}`;

    try {
        copyToClipboard(formattedColors);
        showToast({ text: "Profile colors copied to clipboard!", variant: "success" });
    } catch (e) {
        logger.error("Failed to copy to clipboard:", e);
        showToast({ text: "Error copying profile colors!", variant: "critical" });
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
const userContextMenuPatch: NavContextMenuPatchCallback = (children, { user, guildId }: { user?: User; guildId?: string; }) => {
    if (!user) return;

    const effectiveGuildId = guildId ?? SelectedGuildStore.getGuildId();
    const guildProfile = effectiveGuildId
        ? UserProfileStore.getGuildMemberProfile(user.id, effectiveGuildId)
        : null;
    const hasGuildColors = guildProfile?.themeColors && guildProfile.themeColors.length >= 2;

    children.push(
        <Menu.MenuItem
            id="CopyProfileColors"
            icon={ColorIcon}
            leadingAccessory={{ type: "icon", icon: ColorIcon }}
            label="Copy Profile Colors"
            action={() => copyProfileColors(user.id)}
        />
    );

    if (hasGuildColors && effectiveGuildId) {
        children.push(
            <Menu.MenuItem
                id="CopyServerProfileColors"
                icon={ColorIcon}
                leadingAccessory={{ type: "icon", icon: ColorIcon }}
                label="Copy Server Profile Colors"
                action={() => copyProfileColors(user.id, effectiveGuildId)}
            />
        );
    }
};

export default definePlugin({
    name: "CopyProfileColors",
    description: "A plugin to copy people's profile gradient colors to clipboard.",
    tags: ["Appearance", "Customisation"],
    authors: [EquicordDevs.Crxa, EquicordDevs.Cortex, EquicordDevs.Gir0fa],
    contextMenus: {
        "user-context": userContextMenuPatch,
        "user-profile-actions": userContextMenuPatch
    }
});
