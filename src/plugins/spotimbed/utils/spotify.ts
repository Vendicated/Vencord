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

import { Album, ResourceType, RestrictionReason, Track } from "@api/Spotify";

import { settings } from "../settings";
import { DisplayResource } from "../types";

export function formatReleaseDate(dateStr: string) {
    const [year, month, day] = dateStr.split("-") as [string, string?, string?];

    const dateFormat = new Intl.DateTimeFormat(void 0, {
        year: "numeric",
        month: month != null ? (settings.store.numericMonth ? "numeric" : "long") : void 0,
        day: day != null ? "numeric" : void 0,
    });

    const date = new Date();
    date.setFullYear(+year);
    if (month) date.setMonth(+month - 1);
    if (day) date.setDate(+day);
    return dateFormat.format(date);
}

export function getAlbumType(album: Album) {
    // https://support.cdbaby.com/hc/en-us/articles/360008275672-What-is-the-difference-between-Single-EP-and-Albums-
    if (album.album_type === "single")
        return album.tracks.total >= 4 ? "EP" : "Single";
    if (album.album_type === "compilation") return "Compilation";
    return "Album";
}

export function getTracks(resource: DisplayResource): Track[] | null {
    switch (resource.type) {
        case ResourceType.Album: return resource.tracks.items;

        case ResourceType.Playlist: return resource.tracks.items.map(item => item.track);

        case ResourceType.Artist: return resource.tracks;
    }
    return null;
}

export function getReason(reason: string): string {
    switch (reason) {
        case RestrictionReason.Explicit: return "it's explicit";
        case RestrictionReason.Market: return "it isn't available in your country/market";
        case RestrictionReason.Product: return "it isn't available with your Spotify subscription";
        default: return `it's unavailable "${reason}"`;
    }
}

export function getSelectedTrack(resource: DisplayResource, trackIndex: number): Track | null {
    switch (resource.type) {
        case ResourceType.Track: return resource;

        case ResourceType.Album: return resource.tracks.items[trackIndex];

        case ResourceType.Playlist: return resource.tracks.items[trackIndex]?.track;

        case ResourceType.Artist: return resource.tracks[trackIndex];
    }
    return null;
}
