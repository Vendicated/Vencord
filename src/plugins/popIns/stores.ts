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

import { findByPropsLazy, findStoreLazy } from "@webpack";

import { logger } from "./constants";
import { ApplicationStreamingStore, ApplicationStreamPreviewStore, ExtendedWindowStore } from "./types";

// Lazy store access - stores are loaded when first accessed
export const StreamingStore: ApplicationStreamingStore = findStoreLazy("ApplicationStreamingStore");
export const StreamPreviewStore: ApplicationStreamPreviewStore = findStoreLazy("ApplicationStreamPreviewStore");

// WindowStore needs special handling - find by props to ensure we get the correct store
export let WindowStore: ExtendedWindowStore;

try {
    WindowStore = findByPropsLazy("getWindow", "getWindowKeys");
} catch (e) {
    logger.error("Failed to find WindowStore with getWindow/getWindowKeys:", e);
}
