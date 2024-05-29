/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { ExtractAction, FluxAction } from "../flux/fluxActions";
import type { ChannelRecord, GuildChannelRecord } from "../general/channels/ChannelRecord";
import type { PrivateChannelRecord } from "../general/channels/PrivateChannelRecord";
import type { ThreadChannelRecord } from "../general/channels/ThreadChannelRecord";
import type { Nullish } from "../internal";
import type { FluxStore } from "./abstract/FluxStore";

export type ChannelStoreAction = ExtractAction<FluxAction, "BACKGROUND_SYNC" | "CACHE_LOADED" | "CACHE_LOADED_LAZY" | "CHANNEL_CREATE" | "CHANNEL_DELETE" | "CHANNEL_RECIPIENT_ADD" | "CHANNEL_RECIPIENT_REMOVE" | "CHANNEL_UPDATES" | "CONNECTION_OPEN" | "CONNECTION_OPEN_SUPPLEMENTAL" | "GUILD_CREATE" | "GUILD_DELETE" | "GUILD_FEED_FETCH_SUCCESS" | "LOAD_ARCHIVED_THREADS_SUCCESS" | "LOAD_CHANNELS" | "LOAD_MESSAGES_AROUND_SUCCESS" | "LOAD_MESSAGES_SUCCESS" | "LOAD_THREADS_SUCCESS" | "LOGOUT" | "MOD_VIEW_SEARCH_FINISH" | "OVERLAY_INITIALIZE" | "SEARCH_FINISH" | "THREAD_CREATE" | "THREAD_DELETE" | "THREAD_LIST_SYNC" | "THREAD_UPDATE">;

export class ChannelStore<Action extends FluxAction = ChannelStoreAction> extends FluxStore<Action> {
    static displayName: "ChannelStore";

    getAllThreadsForParent(channelId: string): ThreadChannelRecord[];
    getBasicChannel(channelId?: string | Nullish): ChannelRecord | null; // TEMP
    getChannel(channelId?: string | Nullish): ChannelRecord | undefined;
    getChannelIds(guildId?: string | Nullish): string[];
    getDebugInfo(): {
        guildSizes: string[];
        loadedGuildIds: string[];
        pendingGuildLoads: any[]; // TEMP
    };
    getDMFromUserId(userId?: string | Nullish): string | undefined;
    getDMUserIds(): string[];
    getGuildChannelsVersion(guildId: string): number;
    getInitialOverlayState(): { [channelId: string]: ChannelRecord; };
    getMutableBasicGuildChannelsForGuild(guildId: string): { [channelId: string]: GuildChannelRecord; }; // TEMP
    getMutableDMsByUserIds(): { [userId: string]: string; };
    getMutableGuildChannelsForGuild(guildId: string): { [channelId: string]: GuildChannelRecord; };
    getMutablePrivateChannels(): { [channelId: string]: PrivateChannelRecord; };
    getPrivateChannelsVersion(): number;
    getSortedPrivateChannels(): PrivateChannelRecord[];
    hasChannel(channelId: string): boolean;
    initialize(): void;
    loadAllGuildAndPrivateChannelsFromDisk(): { [channelId: string]: GuildChannelRecord | PrivateChannelRecord; };
}
