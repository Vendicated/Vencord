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

import { Album, Resource, ResourceType, Track } from "../types";
import { getMonth } from "./time";

export function formatReleaseDate(date: string) {
    const [year, month, day] = date.split("-");
    const parts = [year];
    if (month) parts.unshift(getMonth(+month - 1));
    if (day) parts[0] = `${parts[0]} ${day}`;
    return parts.join(", ");
}

export function getAlbumType(album: Album) {
    // https://support.cdbaby.com/hc/en-us/articles/360008275672-What-is-the-difference-between-Single-EP-and-Albums-
    if (album.album_type === "single")
        return album.tracks.total >= 4 ? "EP" : "Single";
    if (album.album_type === "compilation") return "Compilation";
    return "Album";
}

export function getTracks(resource: Resource): Track[] | null {
    switch (resource.type) {
        case ResourceType.Album: return resource.tracks.items;

        case ResourceType.Playlist: return resource.tracks.items.map(item => item.track);

        case ResourceType.Artist: return resource.top_tracks;
    }
    return null;
}
