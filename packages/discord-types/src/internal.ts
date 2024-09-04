/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/** @internal */
export type Defined<T> = Exclude<T, undefined>;

/** @internal */
export type GenericConstructor = new (...args: never) => unknown;

/** @internal */
export type IsAny<T> = 0 extends 1 & T ? unknown : never;

/** @internal */
export type IsDomainFinite<T extends PropertyKey>
    = unknown extends (
        T extends unknown
            ? {} extends Record<T, unknown>
                ? unknown
                : never
            : never
    )
        ? never
        : unknown;

/** @internal */
export type Nullish = null | undefined;

/** @internal */
export type OmitIndexSignature<T>
    = { [Key in keyof T as {} extends Record<Key, unknown> ? never : Key]: T[Key]; };

/** @internal */
export type OmitOptional<T>
    = { [Key in keyof T as T extends Record<Key, unknown> ? Key : never]: T[Key]; };

/** @internal */
export type Optional<T, Value = undefined, Keys extends keyof T = keyof T, ExcludeKeys extends boolean = false>
    = ExcludeKeys extends true
        ? Pick<T, Keys> & { [Key in Exclude<keyof T, Keys>]?: T[Key] | Value; }
        : Omit<T, Keys> & { [Key in Keys]?: T[Key] | Value; };

/** @internal */
export type OptionalTuple<T extends readonly unknown[], Value = undefined>
    = { [Key in keyof T]?: T[Key] | Value; };

/** @internal */
export type PartialOnUndefined<T> = Partial<T>
    & { [Key in keyof T as undefined extends T[Key] ? never : Key]: T[Key]; };

type SnakeCase<T extends string, InAcronym extends boolean = false>
    = T extends `${infer First}${infer Second}${infer Rest}`
        ? InAcronym extends true
            ? Second extends Uppercase<string>
                ? `${Lowercase<First>}${SnakeCase<`${Second}${Rest}`, true>}`
                : `_${Lowercase<First>}${SnakeCase<`${Second}${Rest}`>}`
            : First extends Lowercase<string>
                ? Second extends Lowercase<string>
                    ? `${First}${SnakeCase<`${Second}${Rest}`>}`
                    : `${First}_${SnakeCase<`${Second}${Rest}`>}`
                : Second extends Uppercase<string>
                    ? `${Lowercase<First>}${SnakeCase<`${Second}${Rest}`, true>}`
                    : `${Lowercase<First>}${SnakeCase<`${Second}${Rest}`>}`
        : Lowercase<T>;

/** @internal */
export type SnakeCasedProperties<T>
    = { [Key in keyof T as Key extends string ? SnakeCase<Key> : Key]: T[Key]; };

type StringablePrimitive = string | bigint | number | boolean | Nullish;

/** @internal */
export type Stringable
    = { [Symbol.toPrimitive]: (hint: "default" | "string") => StringablePrimitive; }
    | ({ toString: () => StringablePrimitive; } | { valueOf: () => StringablePrimitive; })
    & { [Symbol.toPrimitive]?: Nullish; };

/** @internal */
export type StringProperties<T>
    = { [Key in keyof T as Exclude<Key, symbol>]: T[Key]; };

/** @internal */
export type Subtract<T, U> = {
    [TKey in keyof T as keyof {
        [UKey in keyof U as UKey extends TKey
            ? TKey extends UKey
                ? UKey
                : never
            : never
        ]: never;
    } extends never
        ? TKey
        : never
    ]: T[TKey];
};

/** @internal */
export type UnionToIntersection<Union> = (
    Union extends unknown
        ? (arg: Union) => unknown
        : never
) extends ((arg: infer Intersection) => unknown)
    ? Intersection & Union
    : never;
