/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface SessionInfo {
    session: {
        id_hash: string;
        approx_last_used_time: Date;
        client_info: {
            os: string;
            platform: string;
            location: string;
        };
    },
    current?: boolean;
}

export type Session = SessionInfo["session"];
