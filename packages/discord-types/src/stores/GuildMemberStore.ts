/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { ExtractAction, FluxAction } from "../flux/fluxActions";
import type { GuildMember } from "../general/GuildMember";
import type { Nullish } from "../internal";
import type { FluxStore } from "./abstract/FluxStore";

export type GuildMemberStoreAction = ExtractAction<FluxAction, "CACHE_LOADED" | "CLEAR_PENDING_CHANNEL_AND_ROLE_UPDATES" | "CONNECTION_OPEN" | "CONNECTION_OPEN_SUPPLEMENTAL" | "GUILD_CREATE" | "GUILD_DELETE" | "GUILD_MEMBER_ADD" | "GUILD_MEMBER_PROFILE_UPDATE" | "GUILD_MEMBER_REMOVE" | "GUILD_MEMBER_UPDATE" | "GUILD_MEMBER_UPDATE_LOCAL" | "GUILD_MEMBERS_CHUNK_BATCH" | "GUILD_ROLE_DELETE" | "GUILD_ROLE_MEMBER_ADD" | "GUILD_ROLE_MEMBER_REMOVE" | "GUILD_ROLE_UPDATE" | "IMPERSONATE_STOP" | "IMPERSONATE_UPDATE" | "LOAD_ARCHIVED_THREADS_SUCCESS" | "LOAD_FORUM_POSTS" | "LOAD_MESSAGES_AROUND_SUCCESS" | "LOAD_MESSAGES_SUCCESS" | "LOAD_PINNED_MESSAGES_SUCCESS" | "LOAD_RECENT_MENTIONS_SUCCESS" | "LOCAL_MESSAGES_LOADED" | "MEMBER_SAFETY_GUILD_MEMBER_SEARCH_SUCCESS" | "MESSAGE_CREATE" | "MESSAGE_UPDATE" | "MOD_VIEW_SEARCH_FINISH" | "OVERLAY_INITIALIZE" | "PASSIVE_UPDATE_V2" | "SEARCH_FINISH" | "THREAD_MEMBER_LIST_UPDATE" | "THREAD_MEMBERS_UPDATE">;

export declare class GuildMemberStore<Action extends FluxAction = GuildMemberStoreAction> extends FluxStore<Action> {
    static displayName: "GuildMemberStore";

    getCommunicationDisabledUserMap(): { [userId: string]: string; };
    getCommunicationDisabledVersion(): number;
    getMember(guildId: string, userId: string): GuildMember | null;
    getMemberIds(guildId?: string | Nullish): string[];
    getMemberRoleWithPendingUpdates(guildId: string, userId: string): string[];
    getMembers(guildId?: string | Nullish): GuildMember[];
    getMemberVersion(): number;
    getMutableAllGuildsAndMembers(): { [guildId: string]: { [userId: string]: GuildMember; }; };
    getNick(guildId?: string | Nullish, userId?: string | Nullish): string | null;
    getNicknameGuildsMapping(userId: string): { [nickname: string]: string[]; };
    getNicknames(userId: string): string[];
    getPendingRoleUpdates(guildId: string): {
        added: string[];
        removed: string[];
    };
    getSelfMember(guildId: string): GuildMember | Nullish;
    getTrueMember(guildId: string, userId: string): GuildMember | Nullish;
    initialize(): void;
    isCurrentUserGuest(guildId?: string | Nullish): boolean;
    isGuestOrLurker(guildId?: string | Nullish, userId?: string | Nullish): boolean;
    isMember(guildId?: string | Nullish, userId?: string | Nullish): boolean;
    memberOf(userId: string): string[];
}
