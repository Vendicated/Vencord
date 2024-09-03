/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Nullish } from "../../internal";
import type { RecordBase } from "../Record";
import type { UserRecord } from "../UserRecord";

export type InteractionRecordOwnProperties = Pick<InteractionRecord, "displayName" | "id" | "name" | "type" | "user">;

export type InteractionProperties = Omit<InteractionRecordOwnProperties, "displayName">
    & { name_localized?: string | Nullish; };

export declare class InteractionRecord<
    OwnProperties extends InteractionRecordOwnProperties = InteractionRecordOwnProperties
> extends RecordBase<OwnProperties> {
    constructor(interaction: InteractionProperties);

    static createFromServer(
        interactionFromServer: Omit<InteractionProperties, "user"> & {
            /** @todo This is not a UserRecord; it is a user object from the API. */
            user: Record<string, any>;
        }
    ): InteractionRecord;

    displayName: string;
    id: string;
    name: string;
    type: InteractionType;
    user: UserRecord;
}

// Original name: InteractionTypes
export enum InteractionType {
    PING = 1, // From the API documentation
    APPLICATION_COMMAND = 2,
    MESSAGE_COMPONENT = 3,
    APPLICATION_COMMAND_AUTOCOMPLETE = 4,
    MODAL_SUBMIT = 5,
}
