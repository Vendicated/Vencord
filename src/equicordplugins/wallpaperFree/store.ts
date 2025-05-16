/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { proxyLazy } from "@utils/lazy";
import { findByPropsLazy } from "@webpack";
import { FluxDispatcher } from "@webpack/common";
import { FluxEmitter, FluxStore } from "@webpack/types";
import { Channel } from "discord-types/general";

interface IFlux {
    PersistedStore: typeof FluxStore;
    Emitter: FluxEmitter;
}
const Flux: IFlux = findByPropsLazy("connectStores");

export const WallpaperFreeStore = proxyLazy(() => {
    const wallpaperChannelMap: Map<string, string> = new Map();
    const wallpaperGuildMap: Map<string, string> = new Map();
    let globalDefault: string | undefined;

    class WallpaperFreeStore extends Flux.PersistedStore {
        static persistKey = "WallpaperFreeStore";

        // @ts-ignore
        initialize(previous: { guildMap: Map<string, string>, channelMap: Map<string, string>, globalDefault: string; } | undefined) {
            if (!previous)
                return;

            wallpaperGuildMap.clear();
            wallpaperChannelMap.clear();
            for (const [channel, url] of previous.channelMap) {
                wallpaperChannelMap.set(channel, url);
            }

            for (const [guild, url] of previous.guildMap) {
                wallpaperGuildMap.set(guild, url);
            }
            globalDefault = previous.globalDefault;
        }

        getState() {
            return { guildMap: Array.from(wallpaperGuildMap), channelMap: Array.from(wallpaperChannelMap), globalDefault };
        }

        getUrl(channel: Channel): string | undefined {
            return (
                wallpaperChannelMap.get(channel.id) ??
                wallpaperGuildMap.get(channel.guild_id) ??
                globalDefault
            );
        }
    }

    const store = new WallpaperFreeStore(FluxDispatcher, {
        // @ts-ignore
        VC_WALLPAPER_FREE_CHANGE({ guildId, channelId, url }: { guildId: string | undefined, channelId: string | undefined, url: string; }) {
            if (guildId) {
                wallpaperGuildMap.set(guildId, url);
            } else if (channelId) {
                wallpaperChannelMap.set(channelId, url);
            }
            store.emitChange();
        },

        VC_WALLPAPER_FREE_CHANGE_GLOBAL({ url }: { url: string | undefined; }) {
            globalDefault = url;
            store.emitChange();
        },

        VC_WALLPAPER_FREE_RESET() {
            wallpaperChannelMap.clear();
            wallpaperGuildMap.clear();
            globalDefault = void 0;
            store.emitChange();
        }
    });

    return store;
});
