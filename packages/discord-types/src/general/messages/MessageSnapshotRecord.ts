/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { RecordBase } from "../Record";
import type { MinimalMessageProperties, MinimalMessageRecord } from "./MinimalMessageRecord";

export type MessageSnapshotRecordOwnProperties = Pick<MessageSnapshotRecord, "message">;

export interface MessageSnapshotProperties {
    message: MinimalMessageProperties;
}

export declare class MessageSnapshotRecord<
    OwnProperties extends MessageSnapshotRecordOwnProperties = MessageSnapshotRecordOwnProperties
> extends RecordBase<OwnProperties> {
    constructor(messageSnapshotProperties: MessageSnapshotProperties);

    message: MinimalMessageRecord;
}
