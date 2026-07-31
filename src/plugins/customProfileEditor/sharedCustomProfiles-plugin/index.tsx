/*
 * Vencord, a modification for Discord's desktop app
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin from "@utils/types";
import { UserStore } from "@webpack/common";

import { prefetchSharedProfile } from "./registry";
import { settings } from "./settings";
import {
    getDisplayNameForUser,
    getNativeBadgesOverride,
    isSelf,
    patchSharedUser,
    patchSharedUserProfile,
    registerSharedBadgeProvider,
    unregisterSharedBadgeProvider,
} from "./utils";

export {
    getRegistryBaseUrl,
    prefetchSharedProfile,
    publishSharedProfile,
} from "./registry";
export { settings };

export default definePlugin({
    name: "SharedCustomProfiles",
    description:
        "Shows custom usernames and badges shared by other Vencord users (works with CustomProfile)",
    authors: [{ name: "Custom", id: 0n }],
    tags: ["Customisation", "Fun", "Profile"],
    dependencies: ["BadgeAPI"],
    enabledByDefault: true,

    settings,

    patches: [
        {
            find: ".getCurrentUser()",
            replacement: {
                match: /getUser\((\i)\)\{([\s\S]+?)return (\i);/,
                replace: "getUser($1){$2return $self.patchUserResult($3);",
            },
        },
        {
            find: ".getCurrentUser()",
            replacement: {
                match: /getCurrentUser\(\)\{([\s\S]+?)return (\i);/,
                replace: "getCurrentUser(){$1return $self.patchUserResult($2);",
            },
        },
        {
            find: ".useName(",
            replacement: {
                match: /(?<=function \i\(\i\)\{)(?=let)/,
                replace:
                    "const _vcScpName=$self.getDisplayNameOverride(arguments[0]);if(_vcScpName!=null)return _vcScpName;",
            },
        },
        {
            find: ".getGlobalName(",
            replacement: {
                match: /getGlobalName\((\i)\)\{/,
                replace:
                    "getGlobalName($1){const _vcScp=$self.getDisplayNameOverride($1);if(_vcScp!=null)return _vcScp;",
            },
        },
        {
            find: "UserProfileStore",
            replacement: {
                match: /(?<=getUserProfile\(\i\){return )(.+?)(?=})/,
                replace: "$self.profilePatchHook($1)",
            },
        },
        {
            find: "getLegacyUsername(){",
            replacement: {
                match: /getBadges\(\)\{/,
                replace:
                    "getBadges(){const _vcScpOnly=$self.getBadgesOverride(this);if(_vcScpOnly!=null)return _vcScpOnly;",
            },
        },
    ],

    flux: {
        USER_PROFILE_MODAL_OPEN(data: { userId?: string }) {
            if (data?.userId && !isSelf(data.userId))
                void prefetchSharedProfile(data.userId);
        },
    },

    start() {
        registerSharedBadgeProvider();
    },

    stop() {
        unregisterSharedBadgeProvider();
    },

    patchUserResult<T extends { id?: string } | null | undefined>(user: T): T {
        if (user?.id && !isSelf(user.id)) void prefetchSharedProfile(user.id);
        return patchSharedUser(user as any) as T;
    },

    getDisplayNameOverride(user: { id?: string }) {
        if (!user?.id) return null;
        const name = getDisplayNameForUser(user.id);
        return name || null;
    },

    profilePatchHook(profile: Parameters<typeof patchSharedUserProfile>[0]) {
        return patchSharedUserProfile(profile);
    },

    getBadgesOverride(profile: { userId?: string }) {
        return getNativeBadgesOverride(profile);
    },
});
