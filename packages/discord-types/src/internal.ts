/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/** @internal */
export type Bivariant<T extends (...args: any[]) => unknown>
    // eslint-disable-next-line @typescript-eslint/method-signature-style
    = { _(...args: Parameters<T>): ReturnType<T>; }["_"];

/** @internal */
export type Defined<T> = Exclude<T, undefined>;

/** @internal */
export type GenericConstructor = new (...args: any[]) => unknown;

type IsOptional<T extends object, Key extends keyof T, True, False>
    = T extends Record<Key, T[Key]> ? False : True;

/** @internal */
export type MergeUnion<T extends object, U extends object>
    = Pick<T, Exclude<keyof T, keyof U>> & Pick<U, Exclude<keyof U, keyof T>>
    & { [Key in keyof T & keyof U as IsOptional<T, Key, never, Key> & IsOptional<U, Key, never, Key>]: T[Key] | U[Key]; }
    & { [Key in keyof T & keyof U as IsOptional<T, Key, Key, never> | IsOptional<U, Key, Key, never>]?: T[Key] | U[Key]; };

/** @internal */
export type Nullish = null | undefined;

/** @internal */
export type Optional<T extends object, Value = undefined, Keys extends keyof T = keyof T, ExcludeKeys = false>
    = ExcludeKeys extends true
        ? Pick<T, Keys> & { [Key in Exclude<keyof T, Keys>]?: T[Key] | Value; }
        : { [Key in Keys]?: T[Key] | Value; };

type StringablePrimitive = string | bigint | number | boolean | null | undefined;

/** @internal */
export type Stringable
    = { [Symbol.toPrimitive]: (hint: "default" | "string") => StringablePrimitive; }
    | ({ toString: () => StringablePrimitive; } | { valueOf: () => StringablePrimitive; })
    & { [Symbol.toPrimitive]?: Nullish; };
