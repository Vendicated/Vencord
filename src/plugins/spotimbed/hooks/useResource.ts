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


import { spotify } from "../api/spotify";
import { Artist, Resource, ResourceType } from "../types";
import { useCachedAwaiter } from "./useCachedAwaiter";

export async function getResource(id: string, type: string): Promise<Resource | null> {
    switch (type) {
        case ResourceType.Track: {
            return spotify.getTrack(id);
        }
        case ResourceType.Album: {
            return spotify.getAlbum(id);
        }
        case ResourceType.Playlist: {
            return spotify.getPlaylist(id);
        }
        case ResourceType.Artist: {
            const artist = await spotify.getArtist(id) as Artist;
            artist.top_tracks ??= (await spotify.getArtistTopTracks(id)).tracks;
            return artist;
        }
        case ResourceType.User: {
            return spotify.getUser(id);
        }
    }
    return null;
}

export function useResource(id: string, type: string) {
    const [resource, error] = useCachedAwaiter(() => getResource(id, type), {
        cacheKey: `${type}:${id}`,
        storeKey: "spotimbed:resource",
    });

    if (error instanceof Error) throw error;
    else if (error) console.error(error);

    return resource;
}
