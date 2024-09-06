/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findByCodeLazy } from "@webpack";
import { Guild } from "discord-types/general";

import { Channel, User } from "../types";

// can't use `PermissionsBits` from `@webpack/common` due to lazy find => throws error in `MODERATOR_PERMISSIONS_BITS`
export const PERMISSIONS_BITS = {
    ADMINISTRATOR: 1n << 3n,
    MANAGE_GUILD: 1n << 5n,
    MANAGE_CHANNELS: 1n << 4n,
    MANAGE_ROLES: 1n << 28n,
    BAN_MEMBERS: 1n << 2n,
    MANAGE_MESSAGES: 1n << 13n,
    KICK_MEMBERS: 1n << 1n,
    MODERATE_MEMBERS: 1n << 40n,
};

export const MODERATOR_PERMISSIONS_BITS =
    PERMISSIONS_BITS.MANAGE_GUILD
    | PERMISSIONS_BITS.MANAGE_CHANNELS
    | PERMISSIONS_BITS.MANAGE_ROLES
    | PERMISSIONS_BITS.MANAGE_MESSAGES
    | PERMISSIONS_BITS.BAN_MEMBERS
    | PERMISSIONS_BITS.KICK_MEMBERS
    | PERMISSIONS_BITS.MODERATE_MEMBERS;

export const computePermissions: (options: {
    user?: User | string | null;
    context?: Guild | Channel | null;
    overwrites?: Channel["permissionOverwrites"] | null;
}) => bigint = findByCodeLazy(".getCurrentUser()", ".computeLurkerPermissionsAllowList()");
