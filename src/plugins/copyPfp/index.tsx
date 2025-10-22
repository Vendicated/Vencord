/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Constants, IconUtils, Menu, RestAPI, showToast, Toasts, UserStore } from "@webpack/common";

function StealIcon() {
    return (
        <svg
            width="18"
            height="18"
            viewBox="0 0 256 256"
            fill="currentColor"
        >
            <path d="M92.4,192.7c-6.3,6.4-12.9,12.9-18.3,18.3l34.2,41l34.2-41c-6-6.2-12.4-12.1-18.3-18.3H92.4z M62.1,169.9 l12.3,12.3l-2.7,2.7l-12.3-12.3L62.1,169.9z M110.2,157.8v17.4h-3.8v-17.4H110.2z M154.4,169.9l-12.3,12.3l2.7,2.7l12.3-12.3 L154.4,169.9z M220.9,89.3c-2.4,4.7-4.8,9.5-7.1,14.5L191,176.3c-1.1,6.6-6.9,11.7-13.8,11.7c-7.7,0-14-6.3-14-14 c0-0.8,0.1-1.6,0.2-2.3l-0.2-0.1l3.3-13.3c2.6-14.1,12.6-36.7-18.3-42.5c-32.2-6.1-63.5,21.5-63.5,21.5 c-11.9,8.8-23.6,20.1-32.9,34.8c-2.3,3.6-6.1,5.5-10.1,5.5c-2.2,0-4.4-0.6-6.4-1.9c-5.6-3.5-7.2-10.9-3.7-16.5 c15.3-24,35.7-40.4,53.9-51.1c0.2-0.1,0.3-0.2,0.4-0.3c0.4-0.4,0-1.1-0.6-1.1c-0.2,0-0.3,0-0.5,0.1c-32.9,13.5-60.6,29.6-61,29.8 c-1.9,1.1-4,1.6-6,1.6c-4.1,0-8.1-2.1-10.3-5.9c-3.3-5.7-1.4-13,4.3-16.4c1.5-0.9,26.8-15.6,58.5-29c0.4-0.2,0.5-0.3,0.6-0.5 c0.1-0.3,0-0.7-0.2-0.9c-0.4-0.3-0.8-0.1-0.8-0.1l-43.2,6.8c-0.6,0.1-1.3,0.1-1.9,0.1C19,92.4,14,88.2,13,82.3 c-1-6.5,3.4-12.6,9.9-13.7l42.7-6.8l-0.5-0.1c0,0,36.3-5.3,78.3-21.9c23.5-9.3,38-26.5,49.6-39.8h63v39.5L220.9,89.3z" />
        </svg>
    );
}

async function fetchImageAsBase64(url: string): Promise<string> {
    const response = await fetch(url);
    const blob = await response.blob();

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

async function stealAvatar(userId: string) {
    try {
        const targetUser = UserStore.getUser(userId);
        if (!targetUser) {
            showToast("Failed to get user", Toasts.Type.FAILURE);
            return;
        }

        const hasAnimatedAvatar = targetUser.avatar?.startsWith("a_");
        let avatarUrl = IconUtils.getUserAvatarURL(targetUser, true);

        if (!avatarUrl) {
            showToast("No avatar to steal", Toasts.Type.FAILURE);
            return;
        }

        if (hasAnimatedAvatar) {
            const currentUser = UserStore.getCurrentUser();
            const hasNitro = currentUser?.premiumType === 1 || currentUser?.premiumType === 2;

            if (!hasNitro) {
                showToast("Need Nitro for animated pfp", Toasts.Type.FAILURE);
                return;
            }

            avatarUrl = avatarUrl.replace(/\.(png|jpg|webp)(\?|$)/, ".gif$2");
        }

        const base64Avatar = await fetchImageAsBase64(avatarUrl);

        await RestAPI.patch({
            url: Constants.Endpoints.ME,
            body: {
                avatar: base64Avatar
            }
        });

        const displayName = targetUser.globalName || targetUser.username;
        showToast(`Stole ${displayName}'s ${hasAnimatedAvatar ? "animated " : ""}profile picture ${hasAnimatedAvatar ? "✨" : "🎭"}`, Toasts.Type.SUCCESS);
    } catch (error) {
        console.error("Failed to steal avatar:", error);
        showToast("Failed to steal pfp, Check console for more info", Toasts.Type.FAILURE);
    }
}

const UserContextMenuPatch: NavContextMenuPatchCallback = (children, { user }) => {
    const currentUser = UserStore.getCurrentUser();
    if (user.id === currentUser?.id) return;
    children.splice(-1, 0, (
        <Menu.MenuGroup>
            <Menu.MenuItem
                id="steal-pfp"
                label="Steal Profile Picture"
                action={() => stealAvatar(user.id)}
                icon={StealIcon}
            />
        </Menu.MenuGroup>
    ));
};

export default definePlugin({
    name: "StealPfp",
    description: "Adds a context menu option to steal someone's profile picture when right-clicking on them",
    authors: [Devs.far3910, Devs.musicar],
    contextMenus: {
        "user-context": UserContextMenuPatch
    }
});
