/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { IpcMainInvokeEvent } from "electron";

import type { EndpointName, EndpointParams, EndpointResponse } from "./types/endpoints";

// Generic call function with localhost validation and endpoint lowercasing
async function call<T extends EndpointName>(
    _: IpcMainInvokeEvent,
    base: string,
    endpoint: T,
    params: EndpointParams<T>
): Promise<{ status: number; data: EndpointResponse<T>; }> {


    const lowercaseEndpoint = endpoint.toLowerCase();
    const url = `http://${base}/${lowercaseEndpoint}`;
    const urlParams = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
            urlParams.append(key, String(value));
        }
    }

    const fullUrl = new URL(`${url}?${urlParams.toString()}`);

    if (fullUrl.hostname !== "localhost") {
        throw new Error("Invalid URL");
    }
    try {
        const response = await fetch(fullUrl);
        const data = await response.text();
        return {
            status: response.status,
            data: data as EndpointResponse<T>
        };
    } catch (error) {
        console.error(`[WinampControls] ${endpoint} request failed: ${error}`);
        return {
            status: -1,
            data: String(error) as EndpointResponse<T>
        };
    }
}

// Generic endpoint wrapper
function makeEndpoint<T extends EndpointName>(
    endpoint: T,
    paramKeys: (keyof EndpointParams<T>)[]
) {
    return async (
        event: IpcMainInvokeEvent,
        base: string,
        password: string,
        ...args: any[]
    ): Promise<{ status: number; data: EndpointResponse<T>; }> => {
        const params: Record<string, any> = { p: password };
        paramKeys.forEach((key, i) => {
            if (args[i] !== undefined) {
                (params as any)[key] = args[i];
            }
        });
        return call(event, base, endpoint, params as EndpointParams<T>);
    };
}

// Exported endpoints using the generic wrapper
export const getVersion = makeEndpoint("getVersion", []);
export const restart = makeEndpoint("restart", []);
export const internet = makeEndpoint("internet", []);
export const play = makeEndpoint("play", []);
export const pause = makeEndpoint("pause", []);
export const stop = makeEndpoint("stop", []);
export const next = makeEndpoint("next", []);
export const prev = makeEndpoint("prev", []);
export const isPlaying = makeEndpoint("isPlaying", []);
export const getOutputTime = makeEndpoint("getOutputTime", ["frmt"]);
export const jumpToTime = makeEndpoint("jumpToTime", ["ms"]);
export const getCurrentTitle = makeEndpoint("getCurrentTitle", []);
export const getVolume = makeEndpoint("getVolume", []);
export const setVolume = makeEndpoint("setVolume", ["level"]);
export const volumeUp = makeEndpoint("volumeUp", []);
export const volumeDown = makeEndpoint("volumeDown", []);
export const getListLength = makeEndpoint("getListLength", []);
export const getListPos = makeEndpoint("getListPos", []);
export const setPlaylistPos = makeEndpoint("setPlaylistPos", ["index"]);
export const getPlaylistFile = makeEndpoint("getPlaylistFile", ["index"]);
export const getPlaylistTitle = makeEndpoint("getPlaylistTitle", ["index"]);
export const getPlaylistTitleList = makeEndpoint("getPlaylistTitleList", ["delim"]);
export const repeat = makeEndpoint("repeat", ["enable"]);
export const repeatStatus = makeEndpoint("repeatStatus", []);
export const shuffle = makeEndpoint("shuffle", ["enable"]);
export const shuffleStatus = makeEndpoint("shuffleStatus", []);
export const getId3Tag = makeEndpoint("getId3Tag", ["tags", "delim", "index"]);
export const hasId3Tag = makeEndpoint("hasId3Tag", ["index"]);
export const getEqData = makeEndpoint("getEqData", ["band"]);
export const setEqData = makeEndpoint("setEqData", ["band", "level"]);

// Album art fetching - bypasses CSP by running in Node.js context
// Returns base64 data URL to avoid img-src CSP restrictions
interface AlbumArtResponse {
    success: boolean;
    dataUrl?: string; // Base64 data URL for direct use in <img>
    source?: "deezer" | "itunes";
    error?: string;
}

interface DeezerSearchResult {
    data?: Array<{
        album: {
            cover_big?: string;
            cover_medium?: string;
            cover?: string;
        };
    }>;
}

interface ITunesSearchResult {
    results?: Array<{
        artistName: string;
        artworkUrl100?: string;
    }>;
}

// Helper to download image and convert to base64 data URL
async function imageUrlToDataUrl(imageUrl: string, logPrefix: string): Promise<string | null> {
    try {
        console.log(`${logPrefix} Downloading image: ${imageUrl}`);
        const response = await fetch(imageUrl);

        if (!response.ok) {
            console.log(`${logPrefix} Image download failed: HTTP ${response.status}`);
            return null;
        }

        const contentType = response.headers.get("content-type") || "image/jpeg";
        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        const dataUrl = `data:${contentType};base64,${base64}`;

        console.log(`${logPrefix} Image converted to data URL (${Math.round(base64.length / 1024)}KB)`);
        return dataUrl;
    } catch (error) {
        console.error(`${logPrefix} Image download error:`, error);
        return null;
    }
}

export async function fetchAlbumArt(
    _event: IpcMainInvokeEvent,
    artist: string,
    track: string,
    album?: string
): Promise<AlbumArtResponse> {
    const logPrefix = "[Native:AlbumArt]";

    console.log(`${logPrefix} Request: artist="${artist}", track="${track}", album="${album ?? "(none)"}"`);

    // Validate inputs
    if (!artist || artist === "Unknown Artist" || !track || track === "Unknown Track") {
        console.log(`${logPrefix} Skipped: Invalid artist or track`);
        return { success: false, error: "Invalid artist or track" };
    }

    let coverUrl: string | null = null;
    let source: "deezer" | "itunes" = "deezer";

    // Try Deezer first
    try {
        const query = album
            ? `artist:"${artist}" album:"${album}"`
            : `artist:"${artist}" track:"${track}"`;

        const deezerUrl = `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=1`;
        console.log(`${logPrefix} Trying Deezer: ${deezerUrl}`);

        const deezerResponse = await fetch(deezerUrl);

        if (deezerResponse.ok) {
            const deezerData: DeezerSearchResult = await deezerResponse.json();

            if (deezerData.data && deezerData.data.length > 0) {
                coverUrl = deezerData.data[0].album.cover_big
                    || deezerData.data[0].album.cover_medium
                    || deezerData.data[0].album.cover
                    || null;

                if (coverUrl) {
                    console.log(`${logPrefix} ✓ Deezer found: ${coverUrl}`);
                    source = "deezer";
                }
            }
            if (!coverUrl) console.log(`${logPrefix} Deezer: No results`);
        } else {
            console.log(`${logPrefix} Deezer failed: HTTP ${deezerResponse.status}`);
        }
    } catch (error) {
        console.error(`${logPrefix} Deezer error:`, error);
    }

    // Fallback to iTunes if Deezer didn't find anything
    if (!coverUrl) {
        try {
            const searchTerm = album ? `${artist} ${album}` : `${artist} ${track}`;
            const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&entity=song&limit=5`;
            console.log(`${logPrefix} Trying iTunes: ${itunesUrl}`);

            const itunesResponse = await fetch(itunesUrl);

            if (itunesResponse.ok) {
                const itunesData: ITunesSearchResult = await itunesResponse.json();

                if (itunesData.results && itunesData.results.length > 0) {
                    // Find best match - prefer exact artist match
                    const normalizedArtist = artist.toLowerCase();
                    let bestMatch = itunesData.results[0];

                    for (const result of itunesData.results) {
                        if (result.artistName.toLowerCase() === normalizedArtist) {
                            bestMatch = result;
                            break;
                        }
                    }

                    // Replace 100x100 with 600x600 for higher resolution
                    coverUrl = bestMatch.artworkUrl100?.replace("100x100", "600x600") || null;

                    if (coverUrl) {
                        console.log(`${logPrefix} ✓ iTunes found: ${coverUrl}`);
                        source = "itunes";
                    }
                }
                if (!coverUrl) console.log(`${logPrefix} iTunes: No results`);
            } else {
                console.log(`${logPrefix} iTunes failed: HTTP ${itunesResponse.status}`);
            }
        } catch (error) {
            console.error(`${logPrefix} iTunes error:`, error);
        }
    }

    // If we found a cover URL, download and convert to data URL
    if (coverUrl) {
        const dataUrl = await imageUrlToDataUrl(coverUrl, logPrefix);

        if (dataUrl) {
            console.log(`${logPrefix} ✓ Success via ${source}`);
            return { success: true, dataUrl, source };
        } else {
            console.log(`${logPrefix} ✗ Failed to download image`);
            return { success: false, error: "Failed to download image" };
        }
    }

    console.log(`${logPrefix} ✗ No album art found`);
    return { success: false, error: "No album art found" };
}
