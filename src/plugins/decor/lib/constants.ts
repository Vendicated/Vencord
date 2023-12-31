/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export let BASE_URL = "https://decor.fieryflames.dev";
export let API_URL = BASE_URL + "/api";
export let AUTHORIZE_URL = API_URL + "/authorize";
export let CDN_URL = "https://ugc.decor.fieryflames.dev";
export let CLIENT_ID = "1096966363416899624";
export const SKU_ID = "100101099111114"; // decor in ascii numbers
export const RAW_SKU_ID = "11497119"; // raw in ascii numbers
export const GUILD_ID = "1096357702931841148";
export const INVITE_KEY = "dXp2SdxDcP";
export const DECORATION_FETCH_COOLDOWN = 1000 * 60 * 60 * 4; // 4 hours


export async function setBaseUrl(baseUrl: string) {
    try {
        const config = await fetch(`${baseUrl}/api/config`).then(res => res.json());
        BASE_URL = baseUrl;
        API_URL = BASE_URL + "/api";
        AUTHORIZE_URL = API_URL + "/authorize";
        CDN_URL = config.CDN_URL;
        CLIENT_ID = config.CLIENT_ID;
    } catch (e) {
        console.error("failed to fetch decor config");
    }
}
