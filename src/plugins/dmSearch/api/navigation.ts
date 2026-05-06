/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChannelMeta } from "@plugins/dmSearch/types";
import { findByCode } from "@webpack";
import { ChannelActionCreators, ChannelStore, FluxDispatcher, NavigationRouter } from "@webpack/common";

interface PrivateChannel {
    fromServer(api_data: unknown): unknown;
}

const DM = 1;
const GROUP_DM = 3;

let pc_cache: PrivateChannel | null = null;

function private_channel(): PrivateChannel | null {
    if (pc_cache) return pc_cache;
    try {
        pc_cache = findByCode("rawRecipients", "recipientFlags", "fromServer") as PrivateChannel;
    } catch { }
    return pc_cache;
}

export async function jump_to(channel_id: string, message_id: string, guild_id?: string | null, meta?: ChannelMeta): Promise<void> {
    let channel = ChannelStore.getChannel(channel_id);

    if (!channel && ChannelActionCreators?.fetchChannel) {
        try {
            const data = await ChannelActionCreators.fetchChannel(channel_id) as { type?: number; };
            if (data) {
                if (data.type === DM || data.type === GROUP_DM) {
                    const pc = private_channel();
                    if (pc?.fromServer) {
                        FluxDispatcher.dispatch({ type: "CHANNEL_CREATE", channel: pc.fromServer(data) });
                        channel = ChannelStore.getChannel(channel_id);
                    }
                } else {
                    FluxDispatcher.dispatch({ type: "CHANNEL_CREATE", channel: data });
                    channel = ChannelStore.getChannel(channel_id);
                }
            }
        } catch { }
    }

    const target = guild_id ?? channel?.guild_id ?? meta?.guild_id ?? "@me";
    NavigationRouter.transitionTo(`/channels/${target}/${channel_id}/${message_id}`);
}

export function close_switcher(): void {
    FluxDispatcher.dispatch({ type: "QUICKSWITCHER_HIDE" });
}
