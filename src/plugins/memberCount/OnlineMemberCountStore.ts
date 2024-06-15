/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { proxyLazy } from "@utils/lazy";
import { sleep } from "@utils/misc";
import { Queue } from "@utils/Queue";
import { type ExtractAction, type FluxAction, StatusType } from "@vencord/discord-types";
import { ChannelActionCreators, Flux, FluxDispatcher, GuildChannelStore } from "@webpack/common";

export const OnlineMemberCountStore = proxyLazy(() => {
    const preloadQueue = new Queue();

    const onlineMemberMap = new Map<string, number>();

    type OnlineMemberCountStoreAction = ExtractAction<FluxAction, "GUILD_MEMBER_LIST_UPDATE" | "ONLINE_GUILD_MEMBER_COUNT_UPDATE">;

    class OnlineMemberCountStore extends Flux.Store<OnlineMemberCountStoreAction> {
        getCount(guildId: string) {
            return onlineMemberMap.get(guildId);
        }

        async _ensureCount(guildId: string) {
            if (!onlineMemberMap.has(guildId))
                await ChannelActionCreators.preload(guildId, GuildChannelStore.getDefaultChannel(guildId)!.id);
        }

        ensureCount(guildId: string) {
            if (!onlineMemberMap.has(guildId))
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
                groups.reduce((total, curr) => total + (curr.id === StatusType.OFFLINE ? 0 : curr.count), 0)
            );
        },
        ONLINE_GUILD_MEMBER_COUNT_UPDATE({ guildId, count }) {
            onlineMemberMap.set(guildId, count);
        }
    });
});
