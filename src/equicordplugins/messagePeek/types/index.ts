/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Channel } from "discord-types/general";

export interface MessagePeekProps {
    channel: Channel;
    channel_url: string;
}
