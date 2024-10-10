/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { proxyLazy } from "@utils/lazy";
import { findByPropsLazy } from "@webpack";
import { ChannelStore, Flux, FluxDispatcher, GuildStore } from "@webpack/common";
import { Channel, Guild } from "discord-types/general";

const { ensurePrivateChannel } = findByPropsLazy("ensurePrivateChannel");

interface SidebarData {
    isUser: boolean;
    guildId: string;
    id: string;
}

export const SidebarStore = proxyLazy(() => {
    class SidebarStore extends Flux.Store {
        public guild: Guild | null = null;
        public channel: Channel | null = null;
    }

    const store = new SidebarStore(FluxDispatcher, {
        // @ts-ignore
        NEW_SIDEBAR_CHAT({ isUser, guildId, id }: SidebarData) {
            store.guild = guildId ? GuildStore.getGuild(guildId) : null;

            if (!isUser) {
                store.channel = ChannelStore.getChannel(id);
                return;
            }

            // @ts-expect-error outdated type
            const existingDm = ChannelStore.getDMChannelFromUserId(id);

            if (existingDm) {
                store.channel = existingDm;
                return;
            }

            ensurePrivateChannel(id).then((channelId: string) => {
                store.channel = ChannelStore.getChannel(channelId);
            });
        },
        // @ts-ignore
        CLOSE_SIDEBAR_CHAT() {
            store.guild = null;
            store.channel = null;
        }
    });

    return store;
});
