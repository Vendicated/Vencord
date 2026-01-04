/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2024 Vendicated and contributors
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
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import { logger } from "../constants";
import { Stream } from "../types";

/**
 * Parse a Discord stream key into a Stream object.
 * Stream keys have formats like:
 * - "guild:guildId:channelId:ownerId"
 * - "call:channelId:ownerId"
 */
export function parseStreamKey(streamKey: string): Stream | null {
    if (!streamKey) return null;

    const parts = streamKey.split(":");

    if (parts[0] === "guild" && parts.length === 4) {
        return {
            streamType: parts[0],
            guildId: parts[1],
            channelId: parts[2],
            ownerId: parts[3]
        };
    } else if (parts[0] === "call" && parts.length === 3) {
        return {
            streamType: parts[0],
            guildId: null,
            channelId: parts[1],
            ownerId: parts[2]
        };
    }

    logger.warn("Unknown streamKey format:", streamKey);
    return null;
}
