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

import { proxyLazy } from "@utils/lazy";

const p = proxyLazy<typeof import("plugins/_api/componentUpdater").default>(() => Vencord.Plugins.plugins.ComponentUpdaterAPI as any);

/**
 * Rerender a specific message
 * @param messageId The id of the message to rerender
 */
export function updateMessageComponent(messageId: string) {
    p.forceUpdaters.get(messageId)?.();
}
