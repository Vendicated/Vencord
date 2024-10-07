/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { proxyLazy } from "@utils/lazy";
import { Flux, FluxDispatcher } from "@webpack/common";

export const MemberVoiceCountStore = proxyLazy(() => {
    const memberVoiceMap = new Map<string, Set<string>>();

    class MemberVoiceCountStore extends Flux.Store {
        getCount(guildId?: string) {
            return memberVoiceMap.get(guildId!)?.size || 0;
        }
    }

    return new MemberVoiceCountStore(FluxDispatcher, {
        VOICE_STATE_UPDATES({ voiceStates }: { voiceStates: { userId: string, guildId: string, channelId?: string; oldChannelId?: string; }[]; }) {
            for (const state of voiceStates) {
                const { guildId } = state;
                const users = memberVoiceMap.get(guildId) ?? new Set();

                if (state.channelId && !state.oldChannelId) {
                    users.add(state.userId);
                } else if (!state.channelId && state.oldChannelId) {
                    users.delete(state.userId);
                }

                memberVoiceMap.set(guildId, users);
            }
        }
    });
});
