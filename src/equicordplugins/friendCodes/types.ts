/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface FriendInvite {
    channel: null;
    code: string;
    created_at: string;
    expires_at: string;
    inviter: {
        avatar: string;
        avatar_decoration_data: unknown;
        clan: unknown;
        discriminator: string;
        global_name: string;
        id: string;
        public_flags: number;
        username: string;
    };
    max_age: number;
    max_uses: number;
    type: number;
    uses: number;
}
