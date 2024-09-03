/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { StringProperties } from "../internal";

// Original name: Record
// Renamed to avoid name conflicts with TypeScripts's Record utility type.
export declare abstract class RecordBase<
    OwnProperties extends Record<PropertyKey, unknown> = Record<PropertyKey, unknown>
> {
    constructor(properties: OwnProperties);

    merge(collection: Partial<StringProperties<OwnProperties>> & Pick<Object, "hasOwnProperty">): this;
    set<Key extends keyof OwnProperties>(key: Key, value: OwnProperties[Key]): this;
    toJS(): OwnProperties;
    update<Key extends keyof OwnProperties>(
        key: Key,
        updater: (value: OwnProperties[Key]) => OwnProperties[Key]
    ): this;
    update<Key extends keyof OwnProperties>(
        key: Key,
        notSetValue: OwnProperties[Key],
        updater: (value: OwnProperties[Key]) => OwnProperties[Key]
    ): this;
}
