/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { proxyLazy } from "@utils/lazy";
import { sleep } from "@utils/misc";
import { Queue } from "@utils/Queue";
import { ChannelActionCreators, Flux, FluxDispatcher, GuildChannelStore } from "@webpack/common";

export const OnlineMemberCountStore = proxyLazy(() => {
    const preloadQueue = new Queue();

    const onlineMemberMap = new Map<string, number>();

    class OnlineMemberCountStore extends Flux.Store {
        getCount(guildId?: string) {
            return onlineMemberMap.get(guildId!);
        }

        async _ensureCount(guildId: string) {
            if (onlineMemberMap.has(guildId)) return;

            await ChannelActionCreators.preload(guildId, GuildChannelStore.getDefaultChannel(guildId).id);
        }

        ensureCount(guildId?: string) {
            if (!guildId || onlineMemberMap.has(guildId)) return;

            preloadQueue.push(() =>
                this._ensureCount(guildId)
                    .then(
                        () => sleep(200),
                        () => sleep(200)
                    )
            );
        }
    }

    return new OnlineMemberCountStore(FluxDispatcher, {
        GUILD_MEMBER_LIST_UPDATE({ guildId, groups }: { guildId: string, groups: { count: number; id: string; }[]; }) {
            onlineMemberMap.set(
                guildId,
                groups.reduce((total, curr) => total + (curr.id === "offline" ? 0 : curr.count), 0)
            );
        },
        ONLINE_GUILD_MEMBER_COUNT_UPDATE({ guildId, count }) {
            onlineMemberMap.set(guildId, count);
        }
    });
});
