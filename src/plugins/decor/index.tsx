/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated, FieryFlames and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByCodeLazy } from "@webpack";
import { Button, useEffect, UserStore } from "@webpack/common";

import { CDN_URL, RAW_SKU_ID, SKU_ID } from "./lib/constants";
import { useAuthorizationStore } from "./lib/stores/AuthorizationStore";
import { useCurrentUserDecorationsStore } from "./lib/stores/CurrentUserDecorationsStore";
import { useUserDecorAvatarDecoration, useUsersDecorationsStore } from "./lib/stores/UsersDecorationsStore";
import showAuthorizationModal from "./lib/utils/showAuthorizationModal";
import { setDecorationGridDecoration, setDecorationGridItem } from "./ui/components";
import { openChangeDecorationModal } from "./ui/modals/ChangeDecorationModal";

export interface AvatarDecoration {
    asset: string;
    skuId: string;
}

const CustomizationSection = findByCodeLazy(".customizationSectionBackground");

export default definePlugin({
    name: "Decor",
    description: "Create and use your own custom avatar decorations, or pick your favorite from the presets.",
    authors: [Devs.FieryFlames],
    patches: [
        // Patch MediaResolver to return correct URL for Decor avatar decorations
        {
            find: "getAvatarDecorationURL:",
            replacement: {
                match: /(?<=function \i\(\i\){)let{avatarDecoration/,
                replace: "const vcDecorDecoration=$self.getDecorAvatarDecorationURL(arguments[0]);if(vcDecorDecoration)return vcDecorDecoration;$&"
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
                    match: /(?<=\i=)\i=>{let{children/,
                    replace: "$self.DecorationGridItem=$&"
                },
                {
                    match: /(?<=\i=)\i=>{let{user:\i,avatarDecoration/,
                    replace: "$self.DecorationGridDecoration=$&"
                },
                // Remove NEW label from decor avatar decorations
                {
                    match: /\i===\i\.Section\.PURCHASE\|\|\i===\i\.Section\.PREMIUM_PURCHASE&&\i(?<=avatarDecoration:(\i).+?)/,
                    replace: "$1.skuId === $self.SKU_ID || ($&)"
                }
            ]
        },
        {
            find: "isAvatarDecorationAnimating:",
            replacement: [
                // Add Decor avatar decoration hook to avatar decoration hook
                {
                    match: /(?<=TryItOut:\i}\),)(?<=user:(\i).+?)/,
                    replace: "vcDecorAvatarDecoration=$self.useUserDecorAvatarDecoration($1),"
                },
                // Use added hook
                {
                    match: /(?<={avatarDecoration:).{1,20}?(?=,)(?<=avatarDecorationOverride:(\i).+?)/,
                    replace: "$1 ?? vcDecorAvatarDecoration ?? ($&)"
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
                // Add Decor avatar decoration hook
                {
                    match: /(?=let \i=\(0,\i.getAvatarDecorationURL\))(?<=currentUser:(\i).+?)/,
                    replace: "let vcDecorAvatarDecoration=$self.useUserDecorAvatarDecoration($1);"
                },
                // Use added hook
                {
                    match: /(?<={avatarDecoration:).{1,20}?(?=,)/,
                    replace: "vcDecorAvatarDecoration ?? $&"
                }
            ]
        }
    ],

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

    getDecorAvatarDecorationURL({ avatarDecoration, canAnimate }: { avatarDecoration: AvatarDecoration | null; canAnimate: boolean; }) {
        // Only Decor avatar decorations have this SKU ID
        if (avatarDecoration?.skuId === SKU_ID) {
            const parts = avatarDecoration.asset.split("_");
            if (!canAnimate && parts[0] === "a") parts.shift();
            return CDN_URL + `/${parts.join("_")}.png`;
        } else if (avatarDecoration?.skuId === RAW_SKU_ID) {
            return avatarDecoration.asset;
        }
    },

    DecorSection: ErrorBoundary.wrap(() => {
        const authorization = useAuthorizationStore();
        const { selectedDecoration, select: selectDecoration, fetch: fetchDecorations } = useCurrentUserDecorationsStore();

        useEffect(() => {
            if (authorization.isAuthorized()) fetchDecorations();
        }, [authorization.token]);

        return <CustomizationSection
            title="Decor"
            hasBackground={true}
        >
            <div style={{ display: "flex" }}>
                <Button
                    onClick={() => {
                        if (!authorization.isAuthorized()) {
                            showAuthorizationModal().then(openChangeDecorationModal);
                        } else openChangeDecorationModal();
                    }}
                    size={Button.Sizes.SMALL}
                >
                    Change Decoration
                </Button>
                {selectedDecoration && authorization.isAuthorized() && <Button
                    onClick={() => selectDecoration(null)}
                    color={Button.Colors.PRIMARY}
                    size={Button.Sizes.SMALL}
                    look={Button.Looks.LINK}
                >
                    Remove Decoration
                </Button>}
            </div>
        </CustomizationSection >;
    })
});
