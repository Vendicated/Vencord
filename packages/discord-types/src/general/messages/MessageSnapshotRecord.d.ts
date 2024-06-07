/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { ImmutableRecord } from "../ImmutableRecord";
import type { MinimalMessageProperties, MinimalMessageRecord } from "./MinimalMessageRecord";

export type MessageSnapshotRecordOwnProperties = Pick<MessageSnapshotRecord, "guild" | "message">;

export type MessageSnapshotProperties = Pick<MessageSnapshotRecordOwnProperties, "guild">
    & { message: MinimalMessageProperties; };

export class MessageSnapshotRecord<
    OwnProperties extends MessageSnapshotRecordOwnProperties = MessageSnapshotRecordOwnProperties
> extends ImmutableRecord<OwnProperties> {
    constructor(messageSnapshotProperties: MessageSnapshotProperties);

    /** @todo This is not a GuildRecord; it's a guild object from the API. */
    guild: Record<string, any>;
    message: MinimalMessageRecord;
}
