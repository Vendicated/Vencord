/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { proxyLazy } from "@utils/lazy";
import { Channel, FluxEmitter, FluxStore } from "@vencord/discord-types";
import { Flux as FluxWP, FluxDispatcher } from "@webpack/common";

interface IFlux {
    PersistedStore: typeof FluxStore;
    Emitter: FluxEmitter;
}

export const WallpaperFreeStore = proxyLazy(() => {
    const wallpaperChannelMap: Map<string, string> = new Map();
    const wallpaperGuildMap: Map<string, string> = new Map();
    let globalDefault: string | undefined;

    class WallpaperFreeStore extends (FluxWP as unknown as IFlux).PersistedStore {
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

        getUrl(channel: Channel) {
            return (
                wallpaperChannelMap.get(channel.id) ??
                wallpaperGuildMap.get(channel.guild_id) ??
                globalDefault
            );
        }

        getForChannel(id: string) { return wallpaperChannelMap.get(id); }

        getForGuild(id: string) { return wallpaperGuildMap.get(id); }

        get globalDefault() { return globalDefault; }
    }

    const store = new WallpaperFreeStore(FluxDispatcher, {
        // @ts-ignore
        VC_WALLPAPER_FREE_CHANGE({ guildId, channelId, url }: { guildId: string | undefined, channelId: string | undefined, url: string; }) {
            guildId && wallpaperGuildMap.set(guildId, url);
            channelId && wallpaperChannelMap.set(channelId, url);
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
