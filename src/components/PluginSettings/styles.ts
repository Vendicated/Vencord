/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

export const PluginsGrid: React.CSSProperties = {
    marginTop: 16,
    display: "grid",
    gridGap: 16,
    gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
};

export const PluginsGridItem: React.CSSProperties = {
    backgroundColor: "var(--background-modifier-selected)",
    color: "var(--interactive-active)",
    borderRadius: 3,
    cursor: "pointer",
    display: "block",
    height: 150,
    padding: 10,
    width: "100%",
};

export const FiltersBar: React.CSSProperties = {
    gap: 10,
    height: 40,
    gridTemplateColumns: "1fr 150px",
    display: "grid"
};
