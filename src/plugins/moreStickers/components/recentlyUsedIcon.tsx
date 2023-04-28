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

import { findByCodeLazy } from "@webpack";

const RecentlyUsedIconOrg = findByCodeLazy("M12 2C6.4764 2 2 6.4764 2 12C2 17.5236 6.4764 22 12 22C17.5236");

export function RecentlyUsedIcon({ size, color }: { size: number, color: string; }) {
    return (
        <RecentlyUsedIconOrg
            style={{
                color,
                width: `${size}px`,
                height: `${size}px`,
                overflow: "hidden",
                overflowClipMargin: "content-box",
            }}
        />
    );
}
