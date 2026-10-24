/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export type StaffKind = "owner" | "admin" | "mod" | "vcMod";

// Guild permission bits; channel-specific overwrites do not determine staff status.
export const StaffPermissions = {
    KICK_MEMBERS: 1n << 1n,
    BAN_MEMBERS: 1n << 2n,
    ADMINISTRATOR: 1n << 3n,
    MANAGE_MESSAGES: 1n << 13n,
    MUTE_MEMBERS: 1n << 22n,
    DEAFEN_MEMBERS: 1n << 23n,
    MOVE_MEMBERS: 1n << 24n,
    MODERATE_MEMBERS: 1n << 40n
};

const moderation = StaffPermissions.KICK_MEMBERS | StaffPermissions.BAN_MEMBERS
    | StaffPermissions.MANAGE_MESSAGES | StaffPermissions.MODERATE_MEMBERS;
const voiceModeration = StaffPermissions.MUTE_MEMBERS | StaffPermissions.DEAFEN_MEMBERS
    | StaffPermissions.MOVE_MEMBERS;

export function classifyStaff(permissions: bigint, isOwner: boolean, isBot = false): StaffKind | null {
    if (isBot) return null;
    if (isOwner) return "owner";
    if (permissions & StaffPermissions.ADMINISTRATOR) return "admin";
    if (permissions & moderation) return "mod";
    if (permissions & voiceModeration) return "vcMod";
    return null;
}
