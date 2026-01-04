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

import { Logger } from "@utils/Logger";

import { Stream } from "./types";

// Logger for the plugin
export const logger = new Logger("PopIns");

// CSS class prefix for all PopIn's styles
export const CLASS_PREFIX = "vc-pin";

// Generate window key for a stream popout
export function getWindowKey(stream: Stream): string {
    return `pin_${stream.channelId}_${stream.ownerId}`;
}

// Generate window key for a webcam popout
export function getWebcamWindowKey(userId: string, channelId: string): string {
    return `pin_webcam_${channelId}_${userId}`;
}
