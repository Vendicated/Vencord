/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Store } from "../flux/Store";
import type { ChannelRecord, GuildChannelRecord } from "../general/channels/ChannelRecord";
import type { DMChannelRecord, PrivateChannelRecord } from "../general/channels/PrivateChannelRecord";
import type { ThreadChannelRecord } from "../general/channels/ThreadChannelRecord";

export declare class ChannelStore extends Store {
    static displayName: "ChannelStore";

    getAllThreadsForParent(channelId: string): ThreadChannelRecord[];
    /** @todo May not return a ChannelRecord. */
    getBasicChannel(channelId?: string | null): ChannelRecord | null;
    getChannel(channelId?: string | null): ChannelRecord | undefined;
    getChannelIds(guildId?: string | null): string[];
    getDebugInfo(): {
        guildSizes: string[];
        loadedGuildIds: string[];
        /** @todo */
        pendingGuildLoads: any[];
    };
    getDMChannelFromUserId(userId?: string | null): DMChannelRecord | undefined;
    getDMFromUserId(userId?: string | null): string | undefined;
    getDMUserIds(): string[];
    getGuildChannelsVersion(guildId: string): number;
    getInitialOverlayState(): { [channelId: string]: ChannelRecord; };
    /** @todo The returned object may not have ChannelRecords. */
    getMutableBasicGuildChannelsForGuild(guildId: string): { [channelId: string]: GuildChannelRecord; };
    getMutableDMsByUserIds(): { [userId: string]: string; };
    getMutableGuildChannelsForGuild(guildId: string): { [channelId: string]: GuildChannelRecord; };
    getMutablePrivateChannels(): { [channelId: string]: PrivateChannelRecord; };
    getPrivateChannelsVersion(): number;
    getSortedPrivateChannels(): PrivateChannelRecord[];
    hasChannel(channelId: string): boolean;
    initialize(): void;
    loadAllGuildAndPrivateChannelsFromDisk(): { [channelId: string]: GuildChannelRecord | PrivateChannelRecord; };
}
