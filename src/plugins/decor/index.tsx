/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated, FieryFlames and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./ui/styles.css";

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Link } from "@components/Link";
import { Devs } from "@utils/constants";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import { closeAllModals } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { FluxDispatcher, Forms, UserStore } from "@webpack/common";

import { CDN_URL, RAW_SKU_ID, SKU_ID } from "./lib/constants";
import { useAuthorizationStore } from "./lib/stores/AuthorizationStore";
import { useCurrentUserDecorationsStore } from "./lib/stores/CurrentUserDecorationsStore";
import { useUserDecorAvatarDecoration, useUsersDecorationsStore } from "./lib/stores/UsersDecorationsStore";
import { setDecorationGridDecoration, setDecorationGridItem } from "./ui/components";
import DecorSection from "./ui/components/DecorSection";

const { isAnimatedAvatarDecoration } = findByPropsLazy("isAnimatedAvatarDecoration");
export interface AvatarDecoration {
    asset: string;
    skuId: string;
}

const settings = definePluginSettings({
    changeDecoration: {
        type: OptionType.COMPONENT,
        description: "Change your avatar decoration",
        component() {
            return <div>
                <DecorSection hideTitle hideDivider noMargin />
                <Forms.FormText type="description" className={classes(Margins.top8, Margins.bottom8)}>
                    You can also access Decor decorations from the <Link
                        href="/settings/profile-customization"
                        onClick={e => {
                            e.preventDefault();
                            closeAllModals();
                            FluxDispatcher.dispatch({ type: "USER_SETTINGS_MODAL_SET_SECTION", section: "Profile Customization" });
                        }}
                    >Profiles</Link> page.
                </Forms.FormText>
            </div>;
        }
    }
});
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
                match: /(?<={user:\i},"decoration"\),)/,
                replace: "$self.DecorSection(),"
            }
        },
        // Decoration modal module
        {
            find: ".decorationGridItem",
            replacement: [
                {
                    match: /(?<==)\i=>{let{children.{20,100}decorationGridItem/,
                    replace: "$self.DecorationGridItem=$&"
                },
                {
                    match: /(?<==)\i=>{let{user:\i,avatarDecoration.{300,600}decorationGridItemChurned/,
                    replace: "$self.DecorationGridDecoration=$&"
                },
                // Remove NEW label from decor avatar decorations
                {
                    match: /(?<=\.Section\.PREMIUM_PURCHASE&&\i;if\()(?<=avatarDecoration:(\i).+?)/,
                    replace: "$1.skuId===$self.SKU_ID||"
                }
            ]
        },
        {
            find: "isAvatarDecorationAnimating:",
            group: true,
            replacement: [
                // Add Decor avatar decoration hook to avatar decoration hook
                {
                    match: /(?<=TryItOut:\i}\),)(?<=user:(\i).+?)/,
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
                    match: /(?<=getAvatarDecorationURL\)\({avatarDecoration:)(\i).avatarDecoration(?=,)/,
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
            const url = new URL(`${CDN_URL}/${avatarDecoration.asset}.png`);
            url.searchParams.set("animate", (!!canAnimate && isAnimatedAvatarDecoration(avatarDecoration.asset)).toString());
            return url.toString();
        } else if (avatarDecoration?.skuId === RAW_SKU_ID) {
            return avatarDecoration.asset;
        }
    },

    DecorSection: ErrorBoundary.wrap(DecorSection)
});
