/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { LiteralUnion } from "type-fest";

export const SYM_IS_PROXY = Symbol("SettingsStore.isProxy");
export const SYM_GET_RAW_TARGET = Symbol("SettingsStore.getRawTarget");

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

interface ProxyContext<T extends object = any> {
    root: T;
    path: string;
}

/**
 * The SettingsStore allows you to easily create a mutable store that
 * has support for global and path-based change listeners.
 */
export class SettingsStore<T extends object> {
    private pathListeners = new Map<string, Set<(newData: any) => void>>();
    private globalListeners = new Set<(newData: T, path: string) => void>();
    private readonly proxyContexts = new WeakMap<any, ProxyContext<T>>();

    private readonly proxyHandler: ProxyHandler<any> = (() => {
        const self = this;

        return {
            get(target, key: any, receiver) {
                if (key === SYM_IS_PROXY) {
                    return true;
                }

                if (key === SYM_GET_RAW_TARGET) {
                    return target;
                }

                let v = Reflect.get(target, key, receiver);

                const proxyContext = self.proxyContexts.get(target);
                if (proxyContext == null) {
                    return v;
                }

                const { root, path } = proxyContext;

                if (!(key in target) && self.getDefaultValue != null) {
                    v = self.getDefaultValue({
                        target,
                        key,
                        root,
                        path
                    });
                }

                if (typeof v === "object" && v !== null && !v[SYM_IS_PROXY]) {
                    const getPath = `${path}${path && "."}${key}`;
                    return self.makeProxy(v, root, getPath);
                }

                return v;
            },
            set(target, key: string, value) {
                if (value?.[SYM_IS_PROXY]) {
                    value = value[SYM_GET_RAW_TARGET];
                }

                if (target[key] === value) {
                    return true;
                }

                if (!Reflect.set(target, key, value)) {
                    return false;
                }

                const proxyContext = self.proxyContexts.get(target);
                if (proxyContext == null) {
                    return true;
                }

                const { root, path } = proxyContext;

                const setPath = `${path}${path && "."}${key}`;
                self.notifyListeners(setPath, value, root);

                return true;
            },
            deleteProperty(target, key: string) {
                if (!Reflect.deleteProperty(target, key)) {
                    return false;
                }

                const proxyContext = self.proxyContexts.get(target);
                if (proxyContext == null) {
                    return true;
                }

                const { root, path } = proxyContext;

                const deletePath = `${path}${path && "."}${key}`;
                self.notifyListeners(deletePath, undefined, root);

                return true;
            }
        };
    })();

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

    private makeProxy(object: any, root: T = object, path = "") {
        this.proxyContexts.set(object, {
            root,
            path
        });

        return new Proxy(object, this.proxyHandler);
    }

    private notifyListeners(pathStr: string, value: any, root: T) {
        const paths = pathStr.split(".");

        // Because we support any type of settings with OptionType.CUSTOM, and those objects get proxied recursively,
        // the path ends up including all the nested paths (plugins.pluginName.settingName.example.one).
        // So, we need to extract the top-level setting path (plugins.pluginName.settingName),
        // to be able to notify globalListeners and top-level setting name listeners (let { settingName } = settings.use(["settingName"]),
        // with the new value
        if (paths.length > 3 && paths[0] === "plugins") {
            const settingPath = paths.slice(0, 3);
            const settingPathStr = settingPath.join(".");
            const settingValue = settingPath.reduce((acc, curr) => acc[curr], root);

            this.globalListeners.forEach(cb => cb(root, settingPathStr));
            this.pathListeners.get(settingPathStr)?.forEach(cb => cb(settingValue));
        } else {
            this.globalListeners.forEach(cb => cb(root, pathStr));
        }

        this.pathListeners.get(pathStr)?.forEach(cb => cb(value));
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
