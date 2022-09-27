import type { WebpackInstance } from "discord-types/other";

export let wreq: WebpackInstance;
export let cache: WebpackInstance["c"];

export type FilterFn = (mod: any) => boolean;

export const filters = {
    byProps: (props: string[]): FilterFn =>
        props.length === 1
            ? m => m[props[0]] !== void 0
            : m => props.every(p => m[p] !== void 0),
    byDisplayName: (deezNuts: string): FilterFn => m => m.default?.displayName === deezNuts
};

export const subscriptions = new Map<FilterFn, CallbackFn>();
export const listeners = new Set<CallbackFn>();

export type CallbackFn = (mod: any) => void;

export function _initWebpack(instance: typeof window.webpackChunkdiscord_app) {
    if (cache !== void 0) throw "no.";

    wreq = instance.push([[Symbol()], {}, (r) => r]);
    cache = wreq.c;
    instance.pop();
}

export function find(filter: FilterFn, getDefault = true) {
    if (typeof filter !== "function")
        throw new Error("Invalid filter. Expected a function got", filter);

    for (const key in cache) {
        const mod = cache[key];
        if (!mod?.exports) continue;

        if (filter(mod.exports))
            return mod.exports;
        if (mod.exports.default && filter(mod.exports.default))
            return getDefault ? mod.exports.default : mod.exports;
        for (const nestedMod in mod.exports) {
            const nested = mod.exports[nestedMod];
            if (nested && filter(nested)) return nested;
        }
    }

    return null;
}

// TODO fix
export function findAll(filter: FilterFn, getDefault = true) {
    if (typeof filter !== "function") throw new Error("Invalid filter. Expected a function got", filter);

    const ret = [] as any[];
    for (const key in cache) {
        const mod = cache[key];
        if (mod?.exports && filter(mod.exports)) ret.push(mod.exports);
        if (mod?.exports?.default && filter(mod.exports.default)) ret.push(getDefault ? mod.exports.default : mod.exports);
    }

    return ret;
}

export function findByProps(...props: string[]) {
    return find(filters.byProps(props));
}

export function findAllByProps(...props: string[]) {
    return findAll(filters.byProps(props));
}

export function findByDisplayName(deezNuts: string) {
    return find(filters.byDisplayName(deezNuts));
}

export function waitFor(filter: string | string[] | FilterFn, callback: CallbackFn) {
    if (typeof filter === "string") filter = filters.byProps([filter]);
    else if (Array.isArray(filter)) filter = filters.byProps(filter);
    else if (typeof filter !== "function") throw new Error("filter must be a string, string[] or function, got", filter);

    const existing = find(filter!);
    if (existing) return void callback(existing);

    subscriptions.set(filter, callback);
}

export function addListener(callback: CallbackFn) {
    listeners.add(callback);
}

export function removeListener(callback: CallbackFn) {
    listeners.delete(callback);
}

/**
 * Search modules by keyword. This searches the factory methods,
 * meaning you can search all sorts of things, displayName, methodName, strings somewhere in the code, etc
 * @param filters One or more strings or regexes
 * @returns Mapping of found modules
 */
export function search(...filters: Array<string | RegExp>) {
    const results = {} as Record<number, Function>;
    const factories = wreq.m;
    outer:
    for (const id in factories) {
        const factory = factories[id];
        const str: string = factory.toString();
        for (const filter of filters) {
            if (typeof filter === "string" && !str.includes(filter)) continue outer;
            if (filter instanceof RegExp && !filter.test(str)) continue outer;
        }
        results[id] = factory;
    }

    return results;
}

/**
 * Extract a specific module by id into its own Source File. This has no effect on
 * the code, it is only useful to be able to look at a specific module without having
 * to view a massive file. extract then returns the extracted module so you can jump to it.
 * As mentioned above, note that this extracted module is not actually used,
 * so putting breakpoints or similar will have no effect.
 * @param id The id of the module to extract
 */
export function extract(id: number) {
    const mod = wreq.m[id] as Function;
    if (!mod) return null;

    const code = `
// [EXTRACTED] WebpackModule${id}
// WARNING: This module was extracted to be more easily readable.
//          This module is NOT ACTUALLY USED! This means putting breakpoints will have NO EFFECT!!

${mod.toString()}
//# sourceURL=ExtractedWebpackModule${id}
`;
    const extracted = (0, eval)(code);
    return extracted as Function;
}
