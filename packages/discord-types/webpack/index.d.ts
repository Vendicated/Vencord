/*
 * @vencord/discord-types
 * Copyright (c) 2024 Vendicated, Nuckyz and contributors
 * SPDX-License-Identifier: LGPL-3.0-or-later
 */

export type ModuleExports = any;

export type Module = {
    id: PropertyKey;
    loaded: boolean;
    exports: ModuleExports;
};

/** exports can be anything, however initially it is always an empty object */
export type ModuleFactory = (this: ModuleExports, module: Module, exports: ModuleExports, require: WebpackRequire) => void;

/** Keys here can be symbols too, but we can't properly type them */
export type AsyncModulePromise = Promise<ModuleExports> & {
    "__webpack_queues__": (fnQueue: ((queue: any[]) => any)) => any;
    "__webpack_exports__": ModuleExports;
    "__webpack_error__"?: any;
};

export type AsyncModuleBody = (
    handleAsyncDependencies: (deps: AsyncModulePromise[]) =>
        Promise<() => ModuleExports[]> | (() => ModuleExports[]),
    asyncResult: (error?: any) => void
) => Promise<void>;

export type EnsureChunkHandlers = {
    /**
     * Ensures the js file for this chunk is loaded, or starts to load if it's not.
     * @param chunkId The chunk id
     * @param promises The promises array to add the loading promise to
     */
    j: (this: EnsureChunkHandlers, chunkId: PropertyKey, promises: Promise<void[]>) => void;
    /**
     * Ensures the css file for this chunk is loaded, or starts to load if it's not.
     * @param chunkId The chunk id
     * @param promises The promises array to add the loading promise to. This array will likely contain the promise of the js file too
     */
    css: (this: EnsureChunkHandlers, chunkId: PropertyKey, promises: Promise<void[]>) => void;
    /**
     * Trigger for prefetching next chunks. This is called after ensuring a chunk is loaded and internally looks up
     * a map to see if the chunk that just loaded has next chunks to prefetch.
     *
     * Note that this does not add an extra promise to the promises array, and instead only executes the prefetching after
     * calling Promise.all on the promises array.
     * @param chunkId The chunk id
     * @param promises The promises array of ensuring the chunk is loaded
     */
    prefetch: (this: EnsureChunkHandlers, chunkId: PropertyKey, promises: Promise<void[]>) => void;
};

export type PrefetchChunkHandlers = {
    /**
     * Prefetches the js file for this chunk.
     * @param chunkId The chunk id
     */
    j: (this: PrefetchChunkHandlers, chunkId: PropertyKey) => void;
};

export type ScriptLoadDone = (event: Event) => void;

export type OnChunksLoaded = ((this: WebpackRequire, result: any, chunkIds: PropertyKey[] | undefined | null, callback: () => any, priority: number) => any) & {
    /** Check if a chunk has been loaded */
    j: (this: OnChunksLoaded, chunkId: PropertyKey) => boolean;
};

export type WebpackRequire = ((moduleId: PropertyKey) => ModuleExports) & {
    /** The module factories, where all modules that have been loaded are stored (pre-loaded or loaded by lazy chunks) */
    m: Record<PropertyKey, ModuleFactory>;
    /** The module cache, where all modules which have been WebpackRequire'd are stored */
    c: Record<PropertyKey, Module>;
    // /**
    //  * Export star. Sets properties of "fromObject" to "toObject" as getters that return the value from "fromObject", like this:
    //  * @example
    //  * const fromObject = { a: 1 };
    //  * Object.keys(fromObject).forEach(key => {
    //  *     if (key !== "default" && !Object.hasOwn(toObject, key)) {
    //  *         Object.defineProperty(toObject, key, {
    //  *             get: () => fromObject[key],
    //  *             enumerable: true
    //  *         });
    //  *     }
    //  * });
    //  * @returns fromObject
    //  */
    // es: (this: WebpackRequire, fromObject: AnyRecord, toObject: AnyRecord) => AnyRecord;
    /**
     * Creates an async module. A module that which has top level await, or requires an export from an async module.
     *
     * The body function must be an async function. "module.exports" will become an {@link AsyncModulePromise}.
     *
     * The body function will be called with a function to handle requires that import from an async module, and a function to resolve this async module. An example on how to handle async dependencies:
     * @example
     * const factory = (module, exports, wreq) => {
     *     wreq.a(module, async (handleAsyncDependencies, asyncResult) => {
     *         try {
     *             const asyncRequireA = wreq(...);
     *
     *             const asyncDependencies = handleAsyncDependencies([asyncRequire]);
     *             const [requireAResult] = asyncDependencies.then != null ? (await asyncDependencies)() : asyncDependencies;
     *
     *             // Use the required module
     *             console.log(requireAResult);
     *
     *             // Mark this async module as resolved
     *             asyncResult();
     *         } catch(error) {
     *             // Mark this async module as rejected with an error
     *             asyncResult(error);
     *         }
     *     }, false); // false because our module does not have an await after dealing with the async requires
     * }
     */
    a: (this: WebpackRequire, module: Module, body: AsyncModuleBody, hasAwaitAfterDependencies?: boolean) => void;
    /** getDefaultExport function for compatibility with non-harmony modules */
    n: (this: WebpackRequire, exports: any) => () => ModuleExports;
    /**
     * Create a fake namespace object, useful for faking an __esModule with a default export.
     *
     * mode & 1: Value is a module id, require it
     *
     * mode & 2: Merge all properties of value into the namespace
     *
     * mode & 4: Return value when already namespace object
     *
     * mode & 16: Return value when it's Promise-like
     *
     * mode & (8|1): Behave like require
     */
    t: (this: WebpackRequire, value: any, mode: number) => any;
    /**
     * Define getter functions for harmony exports. For every prop in "definiton" (the module exports), set a getter in "exports" for the getter function in the "definition", like this:
     * @example
     * const exports = {};
     * const definition = { exportName: () => someExportedValue };
     * for (const key in definition) {
     *     if (Object.hasOwn(definition, key) && !Object.hasOwn(exports, key)) {
     *         Object.defineProperty(exports, key, {
     *             get: definition[key],
     *             enumerable: true
     *         });
     *     }
     * }
     * // exports is now { exportName: someExportedValue } (but each value is actually a getter)
     */
    d: (this: WebpackRequire, exports: Record<PropertyKey, any>, definiton: Record<PropertyKey, () => ModuleExports>) => void;
    /** The ensure chunk handlers, which are used to ensure the files of the chunks are loaded, or load if necessary */
    f: EnsureChunkHandlers;
    /**
     * The ensure chunk function, it ensures a chunk is loaded, or loads if needed.
     * Internally it uses the handlers in {@link WebpackRequire.f} to load/ensure the chunk is loaded.
     */
    e: (this: WebpackRequire, chunkId: PropertyKey) => Promise<void[]>;
    /** The prefetch chunk handlers, which are used to prefetch the files of the chunks */
    F: PrefetchChunkHandlers;
    /**
     * The prefetch chunk function.
     * Internally it uses the handlers in {@link WebpackRequire.F} to prefetch a chunk.
     */
    E: (this: WebpackRequire, chunkId: PropertyKey) => void;
    /** Get the filename for the css part of a chunk */
    k: (this: WebpackRequire, chunkId: PropertyKey) => string;
    /** Get the filename for the js part of a chunk */
    u: (this: WebpackRequire, chunkId: PropertyKey) => string;
    /** The global object, will likely always be the window */
    g: typeof globalThis;
    /** Harmony module decorator. Decorates a module as an ES Module, and prevents Node.js "module.exports" from being set */
    hmd: (this: WebpackRequire, module: Module) => any;
    /** Shorthand for Object.prototype.hasOwnProperty */
    o: typeof Object.prototype.hasOwnProperty;
    /**
     * Function to load a script tag. "done" is called when the loading has finished or a timeout has occurred.
     * "done" will be attached to existing scripts loading if src === url or data-webpack === `${uniqueName}:${key}`,
     * so it will be called when that existing script finishes loading.
     */
    l: (this: WebpackRequire, url: string, done: ScriptLoadDone, key?: string | number, chunkId?: PropertyKey) => void;
    /** Defines __esModule on the exports, marking ES Modules compatibility as true */
    r: (this: WebpackRequire, exports: ModuleExports) => void;
    /** Node.js module decorator. Decorates a module as a Node.js module */
    nmd: (this: WebpackRequire, module: Module) => any;
    /**
     * Register deferred code which will be executed when the passed chunks are loaded.
     *
     * If chunkIds is defined, it defers the execution of the callback and returns undefined.
     *
     * If chunkIds is undefined, and no deferred code exists or can be executed, it returns the value of the result argument.
     *
     * If chunkIds is undefined, and some deferred code can already be executed, it returns the result of the callback function of the last deferred code.
     *
     * When (priority & 1) it will wait for all other handlers with lower priority to be executed before itself is executed.
     */
    O: OnChunksLoaded;
    /**
     * Instantiate a wasm instance with source using "wasmModuleHash", and importObject "importsObj", and then assign the exports of its instance to "exports".
     * @returns The exports argument, but now assigned with the exports of the wasm instance
     */
    v: (this: WebpackRequire, exports: ModuleExports, wasmModuleId: any, wasmModuleHash: string, importsObj?: WebAssembly.Imports) => Promise<any>;
    /** Bundle public path, where chunk files are stored. Used by other methods which load chunks to obtain the full asset url */
    p: string;
    /** The runtime id of the current runtime */
    j: string;
    /** Document baseURI or WebWorker location.href */
    b: string;

    /* rspack only */

    /** rspack version */
    rv: (this: WebpackRequire) => string;
    /** rspack unique id */
    ruid: string;
};
