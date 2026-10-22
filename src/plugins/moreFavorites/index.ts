/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { findStoreLazy } from "@webpack";
import { FluxDispatcher, UserStore } from "@webpack/common";

interface Favorites {
    favoriteChannels: Record<string, {
        nickname: string;
        type: number;
        position: number;
        parentId: string;
        channelType?: { value: number; };
        collapsed?: boolean;
    }>;
    muted: boolean;
    guildVisible?: { value: boolean; };
    autoAddJoinedThreads: boolean;
}

const settings = definePluginSettings({
    favoritesByUser: {
        type: OptionType.CUSTOM,
        default: {} as Record<string, Favorites>
    }
});

const logger = new Logger("MoreFavorites");

interface RefreshableStore {
    vcMoreFavoritesRefresh(): boolean;
    emitChange(): void;
}

const FavoriteStore = findStoreLazy("FavoriteStore") as RefreshableStore;
const CategoryCollapseStore = findStoreLazy("CategoryCollapseStore") as RefreshableStore;
const UserSettingsProtoStore = findStoreLazy("UserSettingsProtoStore") as {
    settings: { favorites?: Favorites; };
};

function refresh() {
    FluxDispatcher.wait(() => {
        for (const store of [FavoriteStore, CategoryCollapseStore]) {
            try {
                if (store.vcMoreFavoritesRefresh()) store.emitChange();
            } catch (error) {
                logger.error("Failed to refresh Favorites", error);
            }
        }
    });
}

function clone<T>(value: T): T {
    // Vencord settings are proxies, which structuredClone cannot copy.
    return JSON.parse(JSON.stringify(value));
}

export default definePlugin({
    name: "MoreFavorites",
    description: "Unlimited favorite people and channels.",
    authors: [Devs.Pine],
    tags: ["Chat", "Organisation"],
    settings,
    patches: [
        {
            find: "canUpsellFavoriteLimit:!",
            replacement: {
                match: /favoriteLimit:\i\?\i\.\i:3,canUpsellFavoriteLimit:!\i/,
                replace: "favoriteLimit:Infinity,canUpsellFavoriteLimit:false"
            }
        },
        {
            find: 'displayName="FavoriteStore"',
            group: true,
            replacement: [
                {
                    match: /(let \i=)(\i\.\i\.settings\.favorites)/,
                    replace: "$1$self.getFavorites($2)"
                },
                {
                    match: /this\.syncWith\(\[\i\.\i\],(\i)\)\}/,
                    replace: "$&vcMoreFavoritesRefresh(){return $1()}"
                }
            ]
        },
        {
            find: 'displayName="CategoryCollapseStore"',
            group: true,
            replacement: [
                {
                    match: /return (\i\.\i\.settings\.favorites)(\?\.favoriteChannels)/,
                    replace: "return $self.getFavorites($1)$2"
                },
                {
                    match: /this\.syncWith\(\[\i\.\i\],(\i)\)\}/,
                    replace: "$&vcMoreFavoritesRefresh(){return $1()}"
                }
            ]
        },
        {
            find: '.updateAsync("favorites",',
            group: true,
            replacement: [
                {
                    // Remove the total-entry cap while retaining invalid-channel cleanup.
                    match: /if\((\i\(\i\)),\i\(\)\.size\(\i\)>=\i\.\i\)return\{limit:\i\.\i,canUpsell:!1\};/,
                    replace: "$1;"
                },
                {
                    // Keep all native actions (including categories, rename and reorder) local.
                    match: /return \i\.\i\.updateAsync\("favorites",\i,\i\?\i\.\i\.FREQUENT_USER_ACTION:\i\.\i\.INFREQUENT_USER_ACTION,\i\)/,
                    replace: "return $self.updateFavorites(arguments[0])"
                }
            ]
        }
    ],

    start: refresh,
    flux: {
        CONNECTION_OPEN: refresh
    },

    getFavorites(native?: Favorites): Favorites | undefined {
        try {
            const userId = UserStore?.getCurrentUser()?.id;
            return userId ? settings.store.favoritesByUser[userId] ?? native : native;
        } catch (error) {
            logger.error("Failed to read local Favorites", error);
            return native;
        }
    },

    async updateFavorites({ update }: { update: (favorites: Favorites) => boolean | void; }) {
        try {
            const userId = UserStore.getCurrentUser()?.id;
            if (!userId) return;

            const native = UserSettingsProtoStore.settings.favorites;
            const favorites = clone(this.getFavorites(native) ?? {
                favoriteChannels: {}, muted: false, autoAddJoinedThreads: false
            });
            if (update(favorites) === false) return;

            settings.store.favoritesByUser[userId] = favorites;
            refresh();
        } catch (error) {
            logger.error("Failed to save local Favorites", error);
        }
    }
});
