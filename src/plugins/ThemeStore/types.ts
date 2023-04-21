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



export interface Theme {
    id: number;
    name: string;
    file_name: string;
    description: string;
    version: string;
    author: Author;
    likes: number;
    downloads: number;
    tags: string[];
    thumbnail_url: null | string;
    release_date: Date;
    guild: Guild | null;
}

export interface Author {
    github_id: string;
    github_name: string;
    display_name: string;
    discord_name: string;
    discord_avatar_hash: null | string;
    discord_snowflake: string;
    guild: Guild | null;
}

export interface Guild {
    name: string;
    snowflake: string;
    invite_link: string;
    avatar_hash: string;
}
