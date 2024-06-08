/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Nullish } from "../../internal";
import type { ImmutableRecord } from "../ImmutableRecord";
import type { UserRecord } from "../UserRecord";

export type InteractionRecordOwnProperties = Pick<InteractionRecord, "displayName" | "id" | "name" | "type" | "user">;

export type InteractionProperties = Omit<InteractionRecordOwnProperties, "displayName">
    & { name_localized?: string | Nullish; };

export class InteractionRecord<
    OwnProperties extends InteractionRecordOwnProperties = InteractionRecordOwnProperties
> extends ImmutableRecord<OwnProperties> {
    constructor(interaction: InteractionProperties);

    static createFromServer(
        interactionFromServer: Omit<InteractionProperties, "user"> & {
            /** @todo This is not a UserRecord; it's a user object from the API. */
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
export const enum InteractionType {
    PING = 1,
    APPLICATION_COMMAND = 2,
    MESSAGE_COMPONENT = 3,
    APPLICATION_COMMAND_AUTOCOMPLETE = 4,
    MODAL_SUBMIT = 5,
}
