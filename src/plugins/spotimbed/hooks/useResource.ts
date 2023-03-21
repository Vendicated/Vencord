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


import { Album, ResourceType, RestrictionReason, Spotify, Track } from "@api/Spotify";

import { logger } from "../logger";
import { settings } from "../settings";
import { ArtistWithTracks, DisplayResource } from "../types";
import { useCachedAwaiter } from "./useCachedAwaiter";

async function followMarket<T extends Album | Track>(
    getter: (market: string) => Promise<T>,
    market: string,
): Promise<T> {
    let resource = await getter(market);
    if (resource.restrictions?.reason === RestrictionReason.Market && resource.available_markets.length > 0)
        resource = await getter(resource.available_markets[0]);
    return resource;
}

export async function getResource(id: string, type: string): Promise<DisplayResource | null> {
    switch (type) {
        case ResourceType.Track: {
            return followMarket(market => Spotify.getTrack(id, { market }), settings.store.market);
        }
        case ResourceType.Album: {
            return followMarket(market => Spotify.getAlbum(id, { market }), settings.store.market);
        }
        case ResourceType.Playlist: {
            return Spotify.getPlaylist(id, { market: settings.store.market });
        }
        case ResourceType.Artist: {
            const artist = await Spotify.getArtist(id) as ArtistWithTracks;
            artist.tracks ??= (await Spotify.getArtistTopTracks(id, { market: settings.store.market })).tracks;
            return artist;
        }
        case ResourceType.User: {
            return Spotify.getUser(id);
        }
    }
    return null;
}

export function useResource(id: string, type: string, noop = false) {
    const [resource, error] = useCachedAwaiter(async () => {
        if (noop) return null;
        return getResource(id, type);
    }, {
        deps: [type, id, noop],
        storeKey: "spotimbed:resource",
    });

    if (error instanceof Error) throw error;
    else if (error) logger.error(error);

    return resource;
}
