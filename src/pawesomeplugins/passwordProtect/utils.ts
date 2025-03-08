/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { getCurrentChannel } from "@utils/discord";
import { NavigationRouter } from "@webpack/common";

export async function sha256(message) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(message));
    const array = Array.from(new Uint8Array(buf));
    const str = array.map(b => b.toString(16).padStart(2, "0")).join("");
    return str;
}

export function isChannelCurrent(channelId: string) {
    return getCurrentChannel()?.id === channelId;
}

export async function reloadChannel() {
    const channel = getCurrentChannel();
    NavigationRouter.transitionTo("/channels/@me");
    await new Promise(r => setTimeout(r, 0));
    NavigationRouter.transitionTo(`/channels/${channel.guild_id || "@me"}/${channel.id}`);
}
