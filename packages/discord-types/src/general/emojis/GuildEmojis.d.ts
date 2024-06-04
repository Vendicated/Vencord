/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { GuildEmoji } from "./Emoji";

export class GuildEmojis {
    constructor(
        guildId: string,
        userId: string,
        emojis: GuildEmoji[],
        canSeeServerSubIAP?: boolean | undefined /* = false */
    );

    build(): void;
    get emojis(): GuildEmoji[];
    get emoticons(): GuildEmoji[];
    getEmoji(emojiId: string): GuildEmoji | undefined;
    getUsableEmoji(emojiId: string): GuildEmoji | null;
    isUsable(emoji: GuildEmoji): boolean;
    get rawEmojis(): GuildEmoji[];
    get usableEmojis(): GuildEmoji[];

    _canSeeServerSubIAP: boolean;
    _dirty: boolean;
    _emojiMap: { [emojiId: string]: GuildEmoji; };
    _emojis: GuildEmoji[];
    _emoticons: GuildEmoji[];
    _totalUsable: number;
    _usableEmojis: GuildEmoji[];
    _userId: string;
    id: string;
}
