/* eslint-disable simple-header/header */
/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

export type PresenceStatus = "online" | "idle" | "dnd" | "offline" | "invisible" | string;

export interface ProfileSnapshot {
    username?: string;
    avatar?: string | null;
    discriminator?: string;
    global_name?: string | null;
    bio?: string | null;
    banner?: string | null;
    banner_color?: string | null;
    avatarDecoration?: string | null;
    avatarDecorationData?: { asset: string; skuId: string; } | null;
    connected_accounts?: Array<{ type: string; name: string; verified: boolean; }>;
    pronouns?: string | null;
    theme_colors?: [number, number] | null;
    emoji?: any | null;
    customStatus?: string | null;
}

export interface ProfileChanges {
    changedFields: string[];
    before: ProfileSnapshot;
    after: ProfileSnapshot;
}

export interface PresenceLogEntry {
    userId: string;
    username: string;
    discriminator?: string;
    timestamp: number;
    previousStatus?: PresenceStatus | null;
    currentStatus: PresenceStatus | null;
    guildId?: string;
    clientStatus?: Record<string, string>;
    activitySummary?: string;
    clientStatusSummary?: string;
    guildName?: string | null;
    type?: "presence" | "profile" | "message" | "typing";
    profileChanges?: ProfileChanges;
    offlineDuration?: number;
    onlineDuration?: number;
    activities?: any[];
    channelId?: string;
    messageContent?: string;
    messageId?: string;
    channelName?: string;
}


export interface UserStalkerConfig {
    userId: string;
    logPresenceChanges: boolean;
    logProfileChanges: boolean;
    logMessages: boolean;
    notifyPresenceChanges: boolean;
    notifyProfileChanges: boolean;
    notifyMessages: boolean;
    notifyTyping: boolean;
    typingConversationWindow?: number;
    serverFilterMode: "all" | "whitelist" | "blacklist";
    serverList: string[];
    // Granular presence notifications
    notifyOnline?: boolean;
    notifyOffline?: boolean;
    notifyIdle?: boolean;
    notifyDnd?: boolean;
    // Granular profile notifications
    notifyUsername?: boolean;
    notifyAvatar?: boolean;
    notifyBanner?: boolean;
    notifyBio?: boolean;
    notifyPronouns?: boolean;
    notifyGlobalName?: boolean;
}

