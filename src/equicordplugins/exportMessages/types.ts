/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface User {
    id: string;
    username: string;
    avatar: string;
    discriminator: string;
    publicFlags: number;
    avatarDecorationData?: any;
    globalName: string;
}

export interface ContactsList {
    id: string;
    type: number;
    nickname?: any;
    user: User;
    since: string;
}
