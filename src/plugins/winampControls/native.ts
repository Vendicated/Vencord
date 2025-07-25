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
