declare module "@webpack" {
    // Very permissive shims for commonly-used helpers from the project's webpack helper
    export type AnyFn = (...args: any[]) => any;

    export const findByProps: (...props: string[]) => any;
    export const findByPropsLazy: (...props: string[]) => any;
    export const findByCodeLazy: (...props: string[]) => any;
    // allow generic typing like findComponentByCodeLazy<MyProps>(code)
    // relaxed to `any` to avoid strict JSX overload mismatches across many dynamic finds
    export function findComponentByCodeLazy<TProps = any>(code: string | string[], ...args: any[]): any;
    export const findStoreLazy: (...props: any[]) => any;
    export const findByCode: (...props: string[]) => any;
    export const findLazy: (fn: (m: any) => boolean) => any;
    export const findByPropsLazyRecursive: (...props: string[]) => any;

    // Chunk-extraction helpers used by some plugins
    export const DefaultExtractAndLoadChunksRegex: RegExp;
    export function extractAndLoadChunksLazy(patterns: string[] | RegExp[], loader?: any): any;

    export const proxyLazyWebpack: <T = any>(factory: () => T) => T;
    export const mapMangledModuleLazy: (pattern: string | RegExp | CodeFilter, mapping?: Record<string, any>) => any;
    export const filters: any;
    export const CodeFilter: any;
    export type CodeFilter = any;
    export const findModuleId: (...args: any[]) => any;
    export const handleModuleNotFound: (...args: any[]) => any;
    export const findAll: any;
    export const search: any;
    export const extract: any;
    export const findBulk: any;
    export const LazyComponentWebpack: any;
    export const findComponentByCode: any;
    export const findExportedComponentLazy: any;
    export const onceReady: any;
    // many call shapes are used in the repo; accept arbitrary args and return any
    export const waitFor: (...args: any[]) => any;
    export const wreq: any;
    export const _resolveReady: any;
    export const lazyWebpackSearchHistory: any;
    export const mapMangledModule: any;
    export const findComponentLazy: any;
    export const findByPropsRecursive: any;

    export type FilterFn = (m: any) => boolean;

    export default {} as {
        findByProps: typeof findByProps;
        findByPropsLazy: typeof findByPropsLazy;
        findByCodeLazy: typeof findByCodeLazy;
    findComponentByCodeLazy: typeof findComponentByCodeLazy;
        findStoreLazy: typeof findStoreLazy;
        findLazy: typeof findLazy;
        filters: any;
        waitFor: typeof waitFor;
        mapMangledModuleLazy: typeof mapMangledModuleLazy;
        wreq: any;
        DefaultExtractAndLoadChunksRegex: RegExp;
        extractAndLoadChunksLazy: typeof extractAndLoadChunksLazy;
    };
}

declare module "@webpack/require" {
    export interface AnyWebpackRequire {
        // module cache
        c?: Record<string | number, any>;
        // public path
        p?: string | null;
        // chunk loading function / manifest
        u?: any;
        // onChunksLoaded / chunk loading metadata
        O?: any;
        // load chunk (id) -> Promise
        e?: (id: string | number) => Promise<any>;
        // define getter (exports, definition)
        d?: ((exports: any, definition: any) => void) | undefined;
        // module definitions
        m?: Record<number | string, any>;
        [k: string]: any;
    }

    /** Primary require-like object used across the project */
    export type WebpackRequire = AnyWebpackRequire;
}

