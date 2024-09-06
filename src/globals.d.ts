/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import type { LoDashStatic } from "lodash";
import type { OmitIndexSignature } from "type-fest";

declare global {
    /**
     * This exists only at build time, so references to it in patches should insert it
     * via String interpolation OR use different replacement code based on this
     * but NEVER reference it inside the patched code
     *
     * @example
     * // BAD
     * replace: "IS_WEB?foo:bar"
     * // GOOD
     * replace: IS_WEB ? "foo" : "bar"
     * // also good
     * replace: `${IS_WEB}?foo:bar`
     */
    export var IS_WEB: boolean;
    export var IS_EXTENSION: boolean;
    export var IS_STANDALONE: boolean;
    export var IS_UPDATER_DISABLED: boolean;
    export var IS_DEV: boolean;
    export var IS_REPORTER: boolean;
    export var IS_DISCORD_DESKTOP: boolean;
    export var IS_VESKTOP: boolean;
    export var VERSION: string;
    export var BUILD_TIMESTAMP: number;

    export var VencordNative: typeof import("./VencordNative").default;
    export var Vencord: typeof import("./Vencord");
    export var VencordStyles: Map<string, {
        name: string;
        source: string;
        classNames: Record<string, string>;
        dom: HTMLStyleElement | null;
    }>;
    export var appSettings: {
        set: (setting: string, v: any) => void;
    };
    /**
     * Only available when running in Electron, undefined on web.
     * Thus, avoid using this or only use it inside an {@link IS_WEB} guard.
     *
     * If you really must use it, mark your plugin as Desktop App only by naming it Foo.desktop.ts(x)
     */
    export var DiscordNative: any;
    export var Vesktop: any;
    export var VesktopNative: any;

    interface Window {
        webpackChunkdiscord_app: {
            push: (chunk: any) => any;
            pop: () => any;
        };
        _: LoDashStatic;
        [k: string]: any;
    }

    /* eslint-disable @typescript-eslint/method-signature-style */
    // https://github.com/microsoft/TypeScript/issues/33700
    // https://github.com/microsoft/TypeScript/issues/17002
    interface ArrayConstructor {
        // If 'any' or a generic type parameter that cannot be determined to satisfy
        // the constraint is assigned to 'T', the default overload will be used.
        isArray<T>(arg: 0 extends 1 & T ? never : T): arg is unknown extends typeof arg
            ? Extract<unknown[], typeof arg>
            : ToArray<typeof arg>;
    }
    // https://github.com/microsoft/TypeScript/issues/26255
    // https://github.com/microsoft/TypeScript/issues/29841
    interface Array<T> {
        includes(searchElement: unknown, fromIndex?: number): boolean;
        indexOf(searchElement: unknown, fromIndex?: number): number;
        lastIndexOf(searchElement: unknown, fromIndex?: number): number;
        map<U>(callbackfn: (value: T, index: TupleKeys<this>, array: this) => U, thisArg?: any): MappedTuple<this, U>;
    }
    interface ReadonlyArray<T> {
        includes(searchElement: unknown, fromIndex?: number): boolean;
        indexOf(searchElement: unknown, fromIndex?: number): number;
        lastIndexOf(searchElement: unknown, fromIndex?: number): number;
        map<U>(callbackfn: (value: T, index: TupleKeys<this>, array: this) => U, thisArg?: any): MappedTuple<this, U>;
    }
    interface Map<K, V> {
        delete(key: unknown): boolean;
        get(key: unknown): V | undefined;
        has(key: unknown): boolean;
    }
    interface ReadonlyMap<K, V> {
        get(key: unknown): V | undefined;
        has(key: unknown): boolean;
    }
    interface Set<T> {
        delete(value: unknown): boolean;
        has(value: unknown): boolean;
    }
    interface ReadonlySet<T> {
        has(value: unknown): boolean;
    }
    /* eslint-enable @typescript-eslint/method-signature-style */
}

type ToArray<T>
    = T extends readonly unknown[]
        ? T
        : T extends (ArrayLike<infer U> | Iterable<infer U>) & object
            ? Extract<U[], T>
            : never;

// Workaround for https://github.com/microsoft/TypeScript/issues/59260
type MappedTuple<T extends readonly unknown[], U>
    // Detect non-homomorphic instantiation
    = { [Key in keyof T]: undefined; }["length"] extends undefined
        // Extra properties with non-numeric keys need to be removed, since they will not be preserved by map.
        ? { -readonly [Key in Extract<keyof OmitIndexSignature<T>, number | `${number}`>]: U; }
            & U[] & { length: T["length"]; }
        : { -readonly [Key in keyof T]: U; };

type TupleKeys<T extends readonly unknown[]>
    = number extends T["length"]
        ? number
        : Exclude<Partial<T>["length"], T["length"]>;

export { };
