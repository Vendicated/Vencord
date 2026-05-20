/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2025 Vendicated and contributors
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

export interface BDTheme {
    id: number;
    name: string;
    slug: string;
    description: string;
    author: string;
    tags: string[];
    downloads: string;
    likes: string;
    thumbnailUrl: string | null;
    pageUrl: string;
    downloadUrl: string;
}

export const BD_THEMES_PAGE = "https://betterdiscord.app/themes";
export const BD_THEME_STORE = BD_THEMES_PAGE;

export function themeDownloadUrl(id: number): string {
    return `https://betterdiscord.app/download?id=${id}`;
}
