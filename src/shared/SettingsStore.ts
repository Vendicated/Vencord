/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { LiteralUnion } from "type-fest";

const UNPROXIED_GETS = new Set(["concat", "copyWithin", "every", "filter", "flat", "join", "reverse", "shift", "slice", "some", "sort", "splice", "toReversed", "toSorted", "toSpliced", "unshift"]);
const SYM_IS_PROXY = Symbol("SettingsStore.isProxy");

// Resolves a possibly nested prop in the form of "some.nested.prop" to type of T.some.nested.prop
type ResolvePropDeep<T, P> = P extends `${infer Pre}.${infer Suf}`
    ? Pre extends keyof T
    ? ResolvePropDeep<T[Pre], Suf>
    : any
    : P extends keyof T
    ? T[P]
    : any;

interface SettingsStoreOptions {
    readOnly?: boolean;
    getDefaultValue?: (data: {
        target: any;
        key: string;
        root: any;
        path: string;
    }) => any;
}

// merges the SettingsStoreOptions type into the class
export interface SettingsStore<T extends object> extends SettingsStoreOptions { }

/**
 * The SettingsStore allows you to easily create a mutable store that
 * has support for global and path-based change listeners.
 */
export class SettingsStore<T extends object> {
    private pathListeners = new Map<string, Set<(newData: any) => void>>();
    private globalListeners = new Set<(newData: T, path: string) => void>();

    /**
     * The store object. Making changes to this object will trigger the applicable change listeners
     */
    public declare store: T;
    /**
     * The plain data. Changes to this object will not trigger any change listeners
     */
    public declare plain: T;

    public constructor(plain: T, options: SettingsStoreOptions = {}) {
        this.plain = plain;
        this.store = this.makeProxy(plain);
        Object.assign(this, options);
    }

    private makeProxy(object: any, root: T = object, path: string = "") {
        const self = this;

        return new Proxy(object, {
            get(target, key: any, receiver) {
                if (key === SYM_IS_PROXY) {
                    return true;
                }

                let v = Reflect.get(target, key, receiver);

                if (!(key in target) && self.getDefaultValue != null) {
                    v = self.getDefaultValue({
                        target,
                        key,
                        root,
                        path
                    });
                }

                const settingsPath = `${path}${path && "."}${key}`;

                if (typeof v === "object" && v != null && !v[SYM_IS_PROXY]) {
                    return Array.isArray(v)
                        ? self.makeArrayProxy(v, root, settingsPath)
                        : self.makeProxy(v, root, settingsPath);
                }

                return v;
            },
            set(target, key: string, value) {
                if (target[key] === value) return true;

                if (!Reflect.set(target, key, value)) {
                    return false;
                }

                const setPath = `${path}${path && "."}${key}`;
                const paths = setPath.split(".");

                if (paths.length > 2 && paths[0] === "plugins") {
                    const settingPath = paths.slice(0, 3);
                    const settingPathStr = settingPath.join(".");
                    const settingValue = settingPath.reduce((acc, curr) => acc[curr], root);

                    self.globalListeners.forEach(cb => cb(root, settingPathStr));
                    self.pathListeners.get(settingPathStr)?.forEach(cb => cb(settingValue));
                }

                self.pathListeners.get(setPath)?.forEach(cb => cb(value));

                return true;
            },
            deleteProperty(target, key: string) {
                if (!Reflect.deleteProperty(target, key)) {
                    return false;
                }

                const setPath = `${path}${path && "."}${key}`;
                const paths = setPath.split(".");

                if (paths.length > 2 && paths[0] === "plugins") {
                    const settingPathStr = paths.slice(0, 3).join(".");
                    self.globalListeners.forEach(cb => cb(root, settingPathStr));
                    self.pathListeners.get(settingPathStr)?.forEach(cb => cb(undefined));
                }

                self.pathListeners.get(setPath)?.forEach(cb => cb(undefined));

                return true;
            }
        });
    }

    private makeArrayProxy(array: any[], root: T, path: string = "") {
        const self = this;
        let shouldProxyGet = true;

        let proxiedArray: typeof array;
        return (proxiedArray = new Proxy(array, {
            get(target, key: any, receiver) {
                if (key === SYM_IS_PROXY) {
                    return true;
                }

                if (!shouldProxyGet) {
                    return Reflect.get(target, key, receiver);
                }

                if (UNPROXIED_GETS.has(key)) {
                    return function (...args: any[]) {
                        shouldProxyGet = false;
                        const result = proxiedArray[key](...args);
                        shouldProxyGet = true;

                        if (!result[SYM_IS_PROXY] && Array.isArray(result)) {
                            return self.makeArrayProxy(result, root, path);
                        }

                        return result;
                    };
                }

                let v = Reflect.get(target, key, receiver);

                if (!(key in target) && self.getDefaultValue != null) {
                    v = self.getDefaultValue({
                        target,
                        key,
                        root,
                        path
                    });
                }

                const settingsPath = `${path}${path && "."}${key}`;

                if (typeof v === "object" && v != null && !v[SYM_IS_PROXY]) {
                    return Array.isArray(v)
                        ? self.makeArrayProxy(v, root, settingsPath)
                        : self.makeProxy(v, root, settingsPath);
                }

                return v;
            },
            set(target, key: string, value) {
                if (target[key] === value) return true;

                if (!Reflect.set(target, key, value)) {
                    return false;
                }

                const setPath = `${path}${path && "."}${key}`;
                const paths = setPath.split(".");

                if (paths.length > 2 && paths[0] === "plugins") {
                    const settingPath = paths.slice(0, 3);
                    const settingPathStr = settingPath.join(".");
                    const settingValue = settingPath.reduce((acc, curr) => acc[curr], root);

                    self.globalListeners.forEach(cb => cb(root, settingPathStr));
                    self.pathListeners.get(settingPathStr)?.forEach(cb => cb(settingValue));
                }

                self.pathListeners.get(setPath)?.forEach(cb => cb(value));

                return true;
            },
            deleteProperty(target, key: string) {
                if (!Reflect.deleteProperty(target, key)) {
                    return false;
                }

                const setPath = `${path}${path && "."}${key}`;
                const paths = setPath.split(".");

                if (paths.length > 2 && paths[0] === "plugins") {
                    const settingPathStr = paths.slice(0, 3).join(".");
                    self.globalListeners.forEach(cb => cb(root, settingPathStr));
                    self.pathListeners.get(settingPathStr)?.forEach(cb => cb(undefined));
                }

                return true;
            }
        }));
    }

    /**
     * Set the data of the store.
     * This will update this.store and this.plain (and old references to them will be stale! Avoid storing them in variables)
     *
     * Additionally, all global listeners (and those for pathToNotify, if specified) will be called with the new data
     * @param value New data
     * @param pathToNotify Optional path to notify instead of globally. Used to transfer path via ipc
     */
    public setData(value: T, pathToNotify?: string) {
        if (this.readOnly) throw new Error("SettingsStore is read-only");

        this.plain = value;
        this.store = this.makeProxy(value);

        if (pathToNotify) {
            let v = value;

            const path = pathToNotify.split(".");
            for (const p of path) {
                if (!v) {
                    console.warn(
                        `Settings#setData: Path ${pathToNotify} does not exist in new data. Not dispatching update`
                    );
                    return;
                }
                v = v[p];
            }

            this.pathListeners.get(pathToNotify)?.forEach(cb => cb(v));
        }

        this.markAsChanged();
    }

    /**
     * Add a global change listener, that will fire whenever any setting is changed
     *
     * @param data The new data. This is either the new value set on the path, or the new root object if it was changed
     * @param path The path of the setting that was changed. Empty string if the root object was changed
     */
    public addGlobalChangeListener(cb: (data: any, path: string) => void) {
        this.globalListeners.add(cb);
    }

    /**
     * Add a scoped change listener that will fire whenever a setting matching the specified path is changed.
     *
     * For example if path is `"foo.bar"`, the listener will fire on
     * ```js
     * Setting.store.foo.bar = "hi"
     * ```
     * but not on
     * ```js
     * Setting.store.foo.baz = "hi"
     * ```
     * @param path
     * @param cb
     */
    public addChangeListener<P extends LiteralUnion<keyof T, string>>(
        path: P,
        cb: (data: ResolvePropDeep<T, P>) => void
    ) {
        const listeners = this.pathListeners.get(path as string) ?? new Set();
        listeners.add(cb);
        this.pathListeners.set(path as string, listeners);
    }

    /**
     * Remove a global listener
     * @see {@link addGlobalChangeListener}
     */
    public removeGlobalChangeListener(cb: (data: any, path: string) => void) {
        this.globalListeners.delete(cb);
    }

    /**
     * Remove a scoped listener
     * @see {@link addChangeListener}
     */
    public removeChangeListener(path: LiteralUnion<keyof T, string>, cb: (data: any) => void) {
        const listeners = this.pathListeners.get(path as string);
        if (!listeners) return;

        listeners.delete(cb);
        if (!listeners.size) this.pathListeners.delete(path as string);
    }

    /**
     * Call all global change listeners
     */
    public markAsChanged() {
        this.globalListeners.forEach(cb => cb(this.plain, ""));
    }
}
