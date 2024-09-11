/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Store } from "../flux/Store";
import type { GuildMember } from "../general/GuildMember";
import type { Nullish } from "../internal";

export declare class GuildMemberStore extends Store {
    static displayName: "GuildMemberStore";

    getCommunicationDisabledUserMap(): { [userId: string]: string; };
    getCommunicationDisabledVersion(): number;
    getMember(guildId: string, userId: string): GuildMember | null;
    getMemberIds(guildId?: string | null): string[];
    getMemberRoleWithPendingUpdates(guildId: string, userId: string): string[];
    getMembers(guildId?: string | null): GuildMember[];
    getMemberVersion(): number;
    getMutableAllGuildsAndMembers(): { [guildId: string]: { [userId: string]: GuildMember; }; };
    getNick(guildId?: string | null, userId?: string | null): string | null;
    getNicknameGuildsMapping(userId: string): { [nickname: string]: string[]; };
    getNicknames(userId: string): string[];
    getPendingRoleUpdates(guildId: string): {
        added: string[];
        removed: string[];
    };
    getSelfMember(guildId: string): GuildMember | Nullish;
    getTrueMember(guildId: string, userId: string): GuildMember | Nullish;
    initialize(): void;
    isCurrentUserGuest(guildId?: string | null): boolean;
    isGuestOrLurker(guildId?: string | null, userId?: string | null): boolean;
    isMember(guildId?: string | null, userId?: string | null): boolean;
    memberOf(userId: string): string[];
}
