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

const SearchIconOrg = findByCodeLazy("M21.707 20.293L16.314 14.9C17.403");

export function SearchIcon() {
    return (
        <SearchIconOrg
            style={{
                boxSizing: "border-box",
                position: "absolute",
                top: "0",
                left: "0",
                opacity: "0.5",
                width: "100%",
                height: "100%",
                zIndex: "2",
                transition: "transform .1s ease-out,opacity .1s ease-out,-webkit-transform .1s ease-out",
                color: "var(--text-muted)",
                overflowClipMargin: "content-box",
                overflow: "hidden"
            }}
        />
    );
}
