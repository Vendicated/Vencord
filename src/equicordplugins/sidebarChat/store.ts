/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { proxyLazy } from "@utils/lazy";
import { OptionType } from "@utils/types";
import { FluxEmitter, FluxStore } from "@vencord/discord-types";
import { findByPropsLazy } from "@webpack";
import { ChannelActionCreators, ChannelStore, FluxDispatcher, GuildStore } from "@webpack/common";

interface IFlux {
    PersistedStore: typeof FluxStore;
    Emitter: FluxEmitter;
}
const Flux: IFlux = findByPropsLazy("connectStores");

export const settings = definePluginSettings({
    persistSidebar: {
        type: OptionType.BOOLEAN,
        description: "Keep the sidebar chat open across Discord restarts",
        default: true,
    }
});

interface SidebarData {
    isUser: boolean;
    guildId: string;
    id: string;
}

export const SidebarStore = proxyLazy(() => {
    let guildId = "";
    let channelId = "";
    let width = 0;
    class SidebarStore extends Flux.PersistedStore {
        static persistKey = "SidebarStore";
        // @ts-ignore
        initialize(previous: { guildId?: string; channelId?: string; width?: number; } | undefined) {
            if (!settings.store.persistSidebar || !previous) return;
            const { guildId: prevGId, channelId: prevCId, width: prevWidth } = previous;
            guildId = prevGId || "";
            channelId = prevCId || "";
            width = prevWidth || 0;
        }

        getState() {
            return {
                guildId,
                channelId,
                width
            };
        }

        getFullState() {
            return {
                guild: GuildStore.getGuild(guildId),
                channel: ChannelStore.getChannel(channelId),
                width
            };
        }
    }

    const store = new SidebarStore(FluxDispatcher, {
        // @ts-ignore
        async NEW_SIDEBAR_CHAT({ isUser, guildId: newGId, id }: SidebarData) {
            guildId = newGId || "";

            if (!isUser) {
                channelId = id;
                return;
            }

            channelId = await ChannelActionCreators.getOrEnsurePrivateChannel(id);
            store.emitChange();
        },

        CLOSE_SIDEBAR_CHAT() {
            guildId = "";
            channelId = "";
            store.emitChange();
        },

        /* SIDEBAR_CHAT_WIDTH({ newWidth }: { newWidth: number; }) {
            width = newWidth;
            store.emitChange();
        }*/
    });

    return store;
});
