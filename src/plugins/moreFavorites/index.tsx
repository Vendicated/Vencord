/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { PluginsIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import type { Channel } from "@vencord/discord-types";
import { SelectedGuildStore, Tooltip, UserSettingsActionCreators, UserSettingsProtoStore, UserStore, useStateFromStores } from "@webpack/common";

const settings = definePluginSettings({
    markLocalFavorites: {
        type: OptionType.BOOLEAN,
        description: "Mark favorites saved by MoreFavorites and not by Discord",
        default: true
    },
    // Stored in plugin settings so Cloud can sync
    favorites: {
        type: OptionType.CUSTOM,
        default: {} as Record<string, object>
    }
});

let cache: { userId: string; favorites: any; } | undefined;

const PreloadedSettings = () => UserSettingsActionCreators.PreloadedUserSettingsActionCreators;

function getFavoritesType() {
    return PreloadedSettings().ProtoClass.fields.find((f: any) => f.localName === "favorites").T();
}

function getFavorites() {
    const userId = UserStore.getCurrentUser()?.id;
    if (!userId) return;

    if (cache?.userId !== userId) {
        const data = settings.store.favorites[userId];
        cache = { userId, favorites: data && getFavoritesType().fromJson(data) };
    }

    return cache.favorites;
}

function isLocalOnly(channelId: string) {
    return getFavorites()?.favoriteChannels[channelId] != null
        && PreloadedSettings().getCurrentValue().favorites?.favoriteChannels[channelId] == null;
}

const LocalFavoriteIcon = ErrorBoundary.wrap(({ channel }: { channel: Channel; }) => {
    const { markLocalFavorites } = settings.use(["markLocalFavorites"]);
    const isLocal = useStateFromStores([SelectedGuildStore, UserSettingsProtoStore], () =>
        SelectedGuildStore.getGuildId() === "@favorites" && isLocalOnly(channel.id)
    );

    if (!markLocalFavorites || !isLocal) return null;

    return (
        <Tooltip text="Saved by MoreFavorites">
            {props => <PluginsIcon {...props} className="vc-morefavorites-icon" width={16} height={16} />}
        </Tooltip>
    );
}, { noop: true });

export default definePlugin({
    name: "MoreFavorites",
    description: "Stores your favorite channels in Vencord instead of Discord, removing the 3 favorite limit without Nitro. Syncs via Vencord Cloud",
    authors: [Devs.pattersonuwu],
    settings,

    patches: [
        {
            find: '"FavoriteStore"',
            replacement: {
                match: /(?<=function \i\(\)\{let \i=)\i\.\i\.settings\.favorites/,
                replace: "$self.getFavorites()??$&"
            }
        },
        {
            find: 'updateAsync("favorites"',
            replacement: {
                match: /\i\.\i\.updateAsync\("favorites",(\i)/,
                replace: "$self.updateFavorites($1"
            }
        },
        {
            find: "canUpsellFavoriteLimit:!",
            replacement: {
                match: /favoriteLimit:\i\?(\d+):\d+,canUpsellFavoriteLimit:!\i/,
                replace: "favoriteLimit:$1,canUpsellFavoriteLimit:false"
            }
        },
        {
            find: "UNREAD_IMPORTANT:",
            replacement: {
                match: /\.Children\.count.+?:null(?<=,channel:(\i).+?)/,
                replace: "$&,$self.LocalFavoriteIcon({channel:$1})"
            }
        }
    ],

    LocalFavoriteIcon,
    getFavorites,

    updateFavorites(mutator: (favorites: any) => boolean | void) {
        const type = getFavoritesType();
        const userId = UserStore.getCurrentUser().id;
        const current = getFavorites() ?? PreloadedSettings().getCurrentValue().favorites;
        const draft = current ? type.clone(current) : type.create();
        if (mutator(draft) === false) return;

        cache = { userId, favorites: draft };
        settings.store.favorites[userId] = type.toJson(draft);
        UserSettingsProtoStore.emitChange();
    }
});
