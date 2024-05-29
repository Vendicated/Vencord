/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { ExtractAction, FluxAction } from "../flux/fluxActions";
import type { Nullish } from "../internal";
import type { FluxStore } from "./abstract/FluxStore";

export type SelectedChannelStoreAction = ExtractAction<FluxAction, "CHANNEL_CREATE" | "CHANNEL_DELETE" | "CHANNEL_FOLLOWER_CREATED" | "CHANNEL_SELECT" | "CHANNEL_UPDATES" | "CONNECTION_CLOSED" | "CONNECTION_OPEN" | "GUILD_CREATE" | "GUILD_DELETE" | "LOGOUT" | "OVERLAY_INITIALIZE" | "THREAD_DELETE" | "VOICE_CHANNEL_SELECT" | "VOICE_STATE_UPDATES">;

export class SelectedChannelStore<Action extends FluxAction = SelectedChannelStoreAction> extends FluxStore<Action> {
    static displayName: "SelectedChannelStore";

    getChannelId(guildId?: string | Nullish): string | undefined;
    getCurrentlySelectedChannelId(guildId?: string | Nullish): string | Nullish;
    getLastChannelFollowingDestination(): {
        channelId: string;
        guildId: string;
    };
    getLastSelectedChannelId(guildId?: string | Nullish): string | undefined;
    getLastSelectedChannels(guildId: string | null): string | undefined;
    getMostRecentSelectedTextChannelId(guildId?: string | Nullish): string | null;
    getVoiceChannelId(): string | null;
    initialize(): void;
}
