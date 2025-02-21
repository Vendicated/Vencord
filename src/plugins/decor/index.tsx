/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated, FieryFlames and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./ui/styles.css";

import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { UserStore } from "@webpack/common";

import { CDN_URL, RAW_SKU_ID, SKU_ID } from "./lib/constants";
import { useAuthorizationStore } from "./lib/stores/AuthorizationStore";
import { useCurrentUserDecorationsStore } from "./lib/stores/CurrentUserDecorationsStore";
import { useUserDecorAvatarDecoration, useUsersDecorationsStore } from "./lib/stores/UsersDecorationsStore";
import { settings } from "./settings";
import { setDecorationGridDecoration, setDecorationGridItem } from "./ui/components";
import DecorSection from "./ui/components/DecorSection";

export interface AvatarDecoration {
    asset: string;
    skuId: string;
}

export default definePlugin({
    name: "Decor",
    description: "Create and use your own custom avatar decorations, or pick your favorite from the presets.",
    authors: [Devs.FieryFlames],
    patches: [
        // Patch MediaResolver to return correct URL for Decor avatar decorations
        {
            find: "getAvatarDecorationURL:",
            replacement: {
                match: /(?<=function \i\(\i\){)(?=let{avatarDecoration)/,
                replace: "const vcDecorDecoration=$self.getDecorAvatarDecorationURL(arguments[0]);if(vcDecorDecoration)return vcDecorDecoration;"
            }
        },
        // Patch profile customization settings to include Decor section
        {
            find: "DefaultCustomizationSections",
            replacement: {
                match: /(?<=#{intl::USER_SETTINGS_AVATAR_DECORATION}\)},"decoration"\),)/,
                replace: "$self.DecorSection(),"
            }
        },
        // Decoration modal module
        {
            find: ".decorationGridItem,",
            replacement: [
                {
                    // FIXME(Bundler spread transform related): Remove old compatiblity once enough time has passed, if they don't revert
                    match: /(?<==)\i=>{let{children.{20,200}decorationGridItem/,
                    replace: "$self.DecorationGridItem=$&",
                    noWarn: true
                },
                {
                    // FIXME(Bundler spread transform related): Remove old compatiblity once enough time has passed, if they don't revert
                    match: /(?<==)\i=>{let{user:\i,avatarDecoration/,
                    replace: "$self.DecorationGridDecoration=$&",
                    noWarn: true
                },
                {
                    match: /(?<==)\i=>{var{children.{20,200}decorationGridItem/,
                    replace: "$self.DecorationGridItem=$&",
                },
                {
                    match: /(?<==)\i=>{var{user:\i,avatarDecoration/,
                    replace: "$self.DecorationGridDecoration=$&",
                },
                // Remove NEW label from decor avatar decorations
                {
                    match: /(?<=\.\i\.PREMIUM_PURCHASE&&\i)(?<=avatarDecoration:(\i).+?)/,
                    replace: "||$1.skuId===$self.SKU_ID"
                }
            ]
        },
        {
            find: "isAvatarDecorationAnimating:",
            group: true,
            replacement: [
                // Add Decor avatar decoration hook to avatar decoration hook
                {
                    match: /(?<=TryItOut:\i,guildId:\i}\),)(?<=user:(\i).+?)/,
                    replace: "vcDecorAvatarDecoration=$self.useUserDecorAvatarDecoration($1),"
                },
                // Use added hook
                {
                    match: /(?<={avatarDecoration:).{1,20}?(?=,)(?<=avatarDecorationOverride:(\i).+?)/,
                    replace: "$1??vcDecorAvatarDecoration??($&)"
                },
                // Make memo depend on added hook
                {
                    match: /(?<=size:\i}\),\[)/,
                    replace: "vcDecorAvatarDecoration,"
                }
            ]
        },
        // Current user area, at bottom of channels/dm list
        {
            find: "renderAvatarWithPopout(){",
            replacement: [
                // Use Decor avatar decoration hook
                {
                    match: /(?<=\i\)\({avatarDecoration:)(\i)(?=,)(?<=currentUser:(\i).+?)/,
                    replace: "$self.useUserDecorAvatarDecoration($1)??$&"
                }
            ]
        }
    ],
    settings,

    flux: {
        CONNECTION_OPEN: () => {
            useAuthorizationStore.getState().init();
            useCurrentUserDecorationsStore.getState().clear();
            useUsersDecorationsStore.getState().fetch(UserStore.getCurrentUser().id, true);
        },
        USER_PROFILE_MODAL_OPEN: data => {
            useUsersDecorationsStore.getState().fetch(data.userId, true);
        },
    },

    set DecorationGridItem(e: any) {
        setDecorationGridItem(e);
    },

    set DecorationGridDecoration(e: any) {
        setDecorationGridDecoration(e);
    },

    SKU_ID,

    useUserDecorAvatarDecoration,

    async start() {
        useUsersDecorationsStore.getState().fetch(UserStore.getCurrentUser().id, true);
    },

    getDecorAvatarDecorationURL({ avatarDecoration, canAnimate }: { avatarDecoration: AvatarDecoration | null; canAnimate?: boolean; }) {
        // Only Decor avatar decorations have this SKU ID
        if (avatarDecoration?.skuId === SKU_ID) {
            const parts = avatarDecoration.asset.split("_");
            // Remove a_ prefix if it's animated and animation is disabled
            if (avatarDecoration.asset.startsWith("a_") && !canAnimate) parts.shift();
            return `${CDN_URL}/${parts.join("_")}.png`;
        } else if (avatarDecoration?.skuId === RAW_SKU_ID) {
            return avatarDecoration.asset;
        }
    },

    DecorSection: ErrorBoundary.wrap(DecorSection)
});
