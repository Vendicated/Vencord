/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";
import { Channel } from "discord-types/general";

import { isChannelCurrent, reloadChannel, sha256 } from "./utils";

let data: Record<string, string> = {};
const accessedChannels: string[] = [];

export async function initData() {
    const newData = await DataStore.get("passwordProtect");
    if (newData) {
        data = newData;
    }
}

export async function saveData() {
    await DataStore.set("passwordProtect", data);
}

export function isLocked(channelId: string) {
    if (accessedChannels.includes(channelId)) return false;
    return isPasswordProtected(channelId);
}

export function isPasswordProtected(channelId: string) {
    return data?.[channelId] !== undefined;
}

export function getPasswordHash(channelId: string) {
    return data?.[channelId];
}

export async function setPassword(channelId: string, password: string) {
    data![channelId] = await sha256(password);
    await saveData();
}

export async function removePassword(channelId: string) {
    delete data![channelId];
    await saveData();
}

export async function checkPassword(input: string, channelId: string) {
    return await sha256(input) === getPasswordHash(channelId);
}


export function accessChannel(channel: Channel) {
    accessedChannels.push(channel.id);
    if (isChannelCurrent(channel.id)) reloadChannel();
    setTimeout(() => {
        accessedChannels.splice(accessedChannels.indexOf(channel.id), 1);
    }, 1000);
}
