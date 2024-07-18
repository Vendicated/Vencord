/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

interface Album {
    name: string;
    artist: { name: string; };
    image: { "#text": string; }[];
}

interface TopAlbumsResponse {
    topalbums: {
        album: Album[];
    };
}

export async function fetchTopAlbum(_, args) {
    const { apiKey, user, period } = args;

    const url = `http://ws.audioscrobbler.com/2.0/?method=user.getTopAlbums&user=${user}&api_key=${apiKey}&period=${period}&format=json&limit=1`;

    const response = await fetch(url);
    const data: TopAlbumsResponse = await response.json();

    if (data.topalbums && data.topalbums.album.length > 0) {
        const topAlbum = data.topalbums.album[0];
        const albumName = topAlbum.name;
        const artistName = topAlbum.artist.name;
        const albumCoverUrl = topAlbum.image[topAlbum.image.length - 1]["#text"];

        return JSON.stringify({ albumName: albumName, artistName: artistName, albumCoverUrl });
    }
    else {
        return null;
    }
}
