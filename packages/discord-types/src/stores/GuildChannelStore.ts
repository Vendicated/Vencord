/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Store } from "../flux/Store";
import { ChannelType, type GuildChannelRecord, type GuildSelectableChannelRecord } from "../general/channels/ChannelRecord";
import type { GuildCategoryChannelRecord } from "../general/channels/GuildTextualChannelRecord";
import type { GuildVocalChannelRecord } from "../general/channels/GuildVocalChannelRecord";
import type { Nullish } from "../internal";

export declare class GuildChannelStore extends Store {
    static displayName: "GuildChannelStore";

    getAllGuilds(): { [guildId: string]: GuildChannels | undefined; };
    getChannels(guildId?: string | Nullish): GuildChannels;
    getDefaultChannel<SearchVocal extends boolean | undefined = undefined>(
        guild: string,
        searchVocal?: SearchVocal /* = false */,
        permissions?: /* Permissions */ bigint | undefined /* = Permissions.VIEW_CHANNEL */
    ): ChannelFromSearchVocal<SearchVocal> | null;
    getDirectoryChannelIds(guildId: string): string[];
    getFirstChannel<SearchVocal extends boolean | undefined = undefined>(
        guildId: string,
        predicate: (
            value: ChannelFromSearchVocal<SearchVocal>,
            index: number,
            array: ChannelFromSearchVocal<SearchVocal>[]
        ) => unknown,
        searchVocal?: SearchVocal /* = false */
    ): ChannelFromSearchVocal<SearchVocal> | null;
    getFirstChannelOfType<Type extends GuildChannelType>(
        guildId: string,
        predicate: (
            value: ChannelFromGuildChannelType<Type>,
            index: number,
            array: ChannelFromGuildChannelType<Type>[]
        ) => unknown,
        type: Type
    ): ChannelFromGuildChannelType<Type> | null;
    getSelectableChannelIds(guildId: string): string[];
    getSelectableChannels(guildId: string): GuildChannel<GuildSelectableChannelRecord>[];
    getSFWDefaultChannel<SearchVocal extends boolean | undefined = undefined>(
        guild: string,
        searchVocal?: SearchVocal /* = false */,
        permissions?: /* Permissions */ bigint | undefined /* = Permissions.VIEW_CHANNEL */
    ): ChannelFromSearchVocal<SearchVocal> | null;
    getTextChannelNameDisambiguations(guildId?: string | Nullish): {
        [channelId: string]: { id: string; name: string; };
    };
    getVocalChannelIds(guildId: string): string[];
    hasCategories(guildId: string): boolean;
    hasChannels(guildId: string): boolean;
    hasElevatedPermissions(guildId: string): boolean;
    hasSelectableChannel(guildId: string, channelId: string): boolean;
    initialize(): void;
}

export interface GuildChannels {
    count: number;
    [GuildChannelType.CATEGORY]: GuildChannel<GuildCategoryChannelRecord>[];
    [GuildChannelType.SELECTABLE]: GuildChannel<GuildSelectableChannelRecord>[];
    [GuildChannelType.VOCAL]: GuildChannel<GuildVocalChannelRecord>[];
    /** The ID of the guild. */
    id: string;
}

// Does not actually exist.
export enum GuildChannelType {
    CATEGORY = ChannelType.GUILD_CATEGORY,
    SELECTABLE = "SELECTABLE",
    VOCAL = "VOCAL",
}

export interface GuildChannel<Channel extends GuildChannelRecord = GuildChannelRecord> {
    channel: Channel;
    comparator: number;
}

type ChannelFromSearchVocal<SearchVocal extends boolean | undefined>
    = GuildSelectableChannelRecord
    | (SearchVocal extends true ? GuildVocalChannelRecord : never);

type ChannelFromGuildChannelType<Type extends GuildChannelType> = {
    [GuildChannelType.CATEGORY]: GuildCategoryChannelRecord;
    [GuildChannelType.SELECTABLE]: GuildSelectableChannelRecord;
    [GuildChannelType.VOCAL]: GuildVocalChannelRecord;
}[Type];
