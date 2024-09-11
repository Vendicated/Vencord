/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Store } from "../flux/Store";
import type { Nullish } from "../internal";

export declare class SelectedChannelStore extends Store {
    static displayName: "SelectedChannelStore";

    getChannelId(guildId?: string | null): string | undefined;
    getCurrentlySelectedChannelId(guildId?: string | null): string | Nullish;
    getLastChannelFollowingDestination(): {
        channelId: string;
        guildId: string;
    };
    getLastSelectedChannelId(guildId?: string | null): string | undefined;
    getLastSelectedChannels(guildId: string | null): string | undefined;
    getMostRecentSelectedTextChannelId(guildId?: string | null): string | null;
    getVoiceChannelId(): string | null;
    initialize(): void;
}
