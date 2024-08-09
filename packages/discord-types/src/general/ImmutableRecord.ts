/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Original name: Record
// Renamed to avoid name conflicts with TypeScripts's Record utility type.
export declare abstract class ImmutableRecord<
    OwnProperties extends Record<PropertyKey, unknown> = Record<PropertyKey, unknown>
> {
    constructor(properties: OwnProperties);

    merge(collection: Partial<Omit<OwnProperties, symbol>>): this;
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
