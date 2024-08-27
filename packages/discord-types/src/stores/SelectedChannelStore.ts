/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Store } from "../flux/Store";
import type { Nullish } from "../internal";

export declare class SelectedChannelStore extends Store {
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
