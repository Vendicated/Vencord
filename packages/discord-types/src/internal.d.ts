/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/** @internal */
export type Defined<T> = Exclude<T, undefined>;

/** @internal */
export type GenericConstructor = new (...args: any[]) => unknown;

/** @internal */
export type Nullish = null | undefined;

/** @internal */
export type Overwrite<Destination extends object, Source extends object>
    = Omit<Destination, keyof Source> & Source;
