/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { proxyLazy } from "@utils/lazy";
import { OptionType } from "@utils/types";
import { Flux as TFlux } from "@vencord/discord-types";
import { ChannelActionCreators, Flux as FluxWP, FluxDispatcher } from "@webpack/common";

interface IFlux extends TFlux {
    PersistedStore: TFlux["Store"];
}

export const settings = definePluginSettings({
    persistSidebar: {
        type: OptionType.BOOLEAN,
        description: "Keep the sidebar chat open across Discord restarts",
        default: true,
    },
    patchCommunity: {
        type: OptionType.BOOLEAN,
        description: "Patch things like the Channel Browser or Members tab that community servers have.",
        default: true,
        restartNeeded: true,
    }
});

export const SidebarStore = proxyLazy(() => {
    const current = {
        guildId: "",
        channelId: "",
        width: 0
    };

    let previous = { ...current };

    class SidebarStore extends (FluxWP as IFlux).PersistedStore {
        static persistKey = "SidebarStore";

        // @ts-ignore
        initialize(previousState: { guildId?: string; channelId?: string; width?: number; } | undefined) {
            if (!settings.store.persistSidebar || !previousState) return;
            const { guildId, channelId, width } = previousState;
            current.guildId = guildId || "";
            current.channelId = channelId || "";
            current.width = width || 0;
        }

        getState() {
            return current;
        }
    }

    const store = new SidebarStore(FluxDispatcher, {
        // @ts-ignore
        async VC_SIDEBAR_CHAT_NEW({ guildId: newGId, id }: { guildId: string | null; id: string; }) {
            previous = { ...current };

            current.guildId = newGId || "";

            if (current.guildId) {
                current.channelId = id;
                store.emitChange();
                return;
            }

            current.channelId = await ChannelActionCreators.getOrEnsurePrivateChannel(id);
            store.emitChange();
        },

        VC_SIDEBAR_CHAT_PREVIOUS() {
            if (previous.channelId) {
                current.guildId = previous.guildId;
                current.channelId = previous.channelId;
            }
            store.emitChange();
        },

        VC_SIDEBAR_CHAT_CLOSE() {
            previous = { ...current };
            current.guildId = "";
            current.channelId = "";
            store.emitChange();
        },
    });

    return store;
});
