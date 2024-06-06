/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { ExtractAction, FluxAction } from "../flux/fluxActions";
import type { ChannelType, GuildChannelRecord, GuildSelectableChannelRecord } from "../general/channels/ChannelRecord";
import type { GuildCategoryChannelRecord } from "../general/channels/GuildTextualChannelRecord";
import type { GuildVocalChannelRecord } from "../general/channels/GuildVocalChannelRecord";
import type { Nullish } from "../internal";
import type { FluxStore } from "./abstract/FluxStore";

export type GuildChannelStoreAction = ExtractAction<FluxAction, "BACKGROUND_SYNC" | "CACHE_LOADED_LAZY" | "CHANNEL_CREATE" | "CHANNEL_DELETE" | "CHANNEL_SELECT" | "CHANNEL_UPDATES" | "CONNECTION_OPEN" | "GUILD_CREATE" | "GUILD_DELETE" | "GUILD_MEMBER_UPDATE" | "GUILD_ROLE_CREATE" | "GUILD_ROLE_DELETE" | "GUILD_ROLE_UPDATE" | "GUILD_UPDATE" | "IMPERSONATE_STOP" | "IMPERSONATE_UPDATE" | "OVERLAY_INITIALIZE" | "VOICE_CHANNEL_SELECT" | "VOICE_CHANNEL_STATUS_UPDATE" | "VOICE_STATE_UPDATES">;

export class GuildChannelStore<Action extends FluxAction = GuildChannelStoreAction> extends FluxStore<Action> {
    static displayName: "GuildChannelStore";

    getAllGuilds(): { [guildId: string]: GuildChannels | undefined; };
    getChannels(guildId?: string | Nullish): GuildChannels;
    getDefaultChannel<SearchVocal extends boolean | undefined = undefined>(
        guild: string,
        searchVocal?: SearchVocal /* = false */,
        permissions?: /* Permissions */ bigint | undefined /* = Permissions.VIEW_CHANNEL */
    ): GuildChannelFromSearchVocal<SearchVocal>;
    getDirectoryChannelIds(guildId: string): string[];
    getFirstChannel<SearchVocal extends boolean | undefined = undefined>(
        guildId: string,
        predicate: (
            value: GuildChannelFromSearchVocal<SearchVocal>,
            index: number,
            array: GuildChannelFromSearchVocal<SearchVocal>[]
        ) => unknown,
        searchVocal?: SearchVocal /* = false */
    ): GuildChannelFromSearchVocal<SearchVocal> | null;
    getFirstChannelOfType<Type extends GuildChannelType>(
        guildId: string,
        predicate: (
            value: GuildChannelFromType<Type>,
            index: number,
            array: GuildChannelFromType<Type>[]
        ) => unknown,
        type: Type
    ): GuildChannelFromType<Type> | null;
    getSelectableChannelIds(guildId: string): string[];
    getSelectableChannels(guildId: string): GuildChannel<GuildSelectableChannelRecord>[];
    getSFWDefaultChannel<SearchVocal extends boolean | undefined = undefined>(
        guild: string,
        searchVocal?: SearchVocal /* = false */,
        permissions?: /* Permissions */ bigint | undefined /* = Permissions.VIEW_CHANNEL */
    ): GuildChannelFromSearchVocal<SearchVocal>;
    getTextChannelNameDisambiguations(guildId?: string | Nullish): {
        [channelId: string]: { id: string; name: string; };
    };
    getVocalChannelIds(guildId: string): string[];
    hasCategories(guildId: string): boolean;
    hasChannels(guildId: string): boolean;
    hasElevatedPermissions(guildId: string): boolean;
    hasSelectableChannel(guildId: string, channelId: string): boolean;
}

export interface GuildChannels {
    count: number;
    [GuildChannelType.CATEGORY]: GuildChannel<GuildCategoryChannelRecord>[];
    [GuildChannelType.SELECTABLE]: GuildChannel<GuildSelectableChannelRecord>[];
    [GuildChannelType.VOCAL]: GuildChannel<GuildVocalChannelRecord>[];
    id: string; // guildId
}

// Does not actually exist.
export const enum GuildChannelType {
    CATEGORY = ChannelType.GUILD_CATEGORY,
    SELECTABLE = "SELECTABLE",
    VOCAL = "VOCAL",
}

export interface GuildChannel<Channel extends GuildChannelRecord = GuildChannelRecord> {
    channel: Channel;
    comparator: number;
}

type GuildChannelFromSearchVocal<SearchVocal extends boolean | undefined>
    = GuildChannel<GuildSelectableChannelRecord> | (SearchVocal extends true
        ? GuildChannel<GuildVocalChannelRecord>
        : never);

type GuildChannelFromType<Type extends GuildChannelType>
    = GuildChannels[Type] extends (infer Channel)[] ? Channel : never;
