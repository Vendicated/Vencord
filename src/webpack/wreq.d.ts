/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

type AnyRecord = Record<PropertyKey, any>;

type ModuleExports = any;

type Module = {
    id: PropertyKey;
    loaded: boolean;
    exports: ModuleExports;
};

/** exports ({@link ModuleExports}) can be anything, however initially it is always an empty object */
type ModuleFactory = (module: Module, exports: AnyRecord, require: WebpackRequire) => void;

type AsyncModuleBody = (
    handleDependencies: (deps: Promise<any>[]) => Promise<any[]> & (() => void)
) => Promise<void>;

type ChunkHandlers = {
    /**
     * Ensures the js file for this chunk is loaded, or starts to load if it's not
     * @param chunkId The chunk id
     * @param promises The promises array to add the loading promise to.
     */
    j: (chunkId: string | number, promises: Promise<void[]>) => void,
    /**
     * Ensures the css file for this chunk is loaded, or starts to load if it's not
     * @param chunkId The chunk id
     * @param promises The promises array to add the loading promise to. This array will likely contain the promise of the js file too.
     */
    css: (chunkId: string | number, promises: Promise<void[]>) => void,
};

type ScriptLoadDone = (event: Event) => void;

type OnChunksLoaded = ((result: any, chunkIds: (string | number)[] | undefined, callback: () => any, priority: number) => any) & {
    /** Check if a chunk has been loaded */
    j: (chunkId: string | number) => boolean;
};

type WebpackRequire = ((moduleId: PropertyKey) => Module) & {
    /** The module factories, where all modules that have been loaded are stored (pre-loaded or loaded by lazy chunks) */
    m: Record<PropertyKey, ModuleFactory>;
    /** The module cache, where all modules which have been WebpackRequire'd are stored */
    c: Record<PropertyKey, Module>;
    /**
     * Export star. Sets properties of "fromObject" to "toObject" as getters that return the value from "fromObject", like this:
     * @example
     * const fromObject = { a: 1 };
     * Object.defineProperty(to, "a", {
     *      get: () => fromObject.a
     * });
     * @returns fromObject
     */
    es: (fromObject: AnyRecord, toObject: AnyRecord) => AnyRecord;
    /**
     * Creates an async module. The body function must be a async function.
     * "module.exports" will be decorated with an AsyncModulePromise.
     * The body function will be called.
     * To handle async dependencies correctly do this inside the body: "([a, b, c] = await handleDependencies([a, b, c]));".
     * If "hasAwaitAfterDependencies" is truthy, "handleDependencies()" must be called at the end of the body function.
     */
    a: (module: Module, body: AsyncModuleBody, hasAwaitAfterDependencies?: boolean) => void;
    /** getDefaultExport function for compatibility with non-harmony modules */
    n: (module: Module) => () => ModuleExports;
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
    t: (value: any, mode: number) => any;
    /**
     * Define property getters. For every prop in "definiton", set a getter in "exports" for the value in "definitiion", like this:
     * @example
     * const exports = {};
     * const definition = { a: 1 };
     * for (const key in definition) {
     *      Object.defineProperty(exports, key, { get: definition[key] }
     * }
    */
    d: (exports: AnyRecord, definiton: AnyRecord) => void;
    /** The chunk handlers, which are used to ensure the files of the chunks are loaded, or load if necessary */
    f: ChunkHandlers;
    /**
     * The ensure chunk function, it ensures a chunk is loaded, or loads if needed.
     * Internally it uses the handlers in {@link WebpackRequire.f} to load/ensure the chunk is loaded.
     */
    e: (chunkId: string | number) => Promise<void[]>;
    /** Get the filename name for the css part of a chunk */
    k: (chunkId: string | number) => `${chunkId}.css`;
    /** Get the filename for the js part of a chunk */
    u: (chunkId: string | number) => string;
    /** The global object, will likely always be the window */
    g: Window;
    /** Harmony module decorator. Decorates a module as an ES Module, and prevents Node.js "module.exports" from being set */
    hmd: (module: Module) => any;
    /** Shorthand for Object.prototype.hasOwnProperty */
    o: typeof Object.prototype.hasOwnProperty;
    /**
     * Function to load a script tag. "done" is called when the loading has finished or a timeout has occurred.
     * "done" will be attached to existing scripts loading if src === url or data-webpack === `${uniqueName}:${key}`,
     * so it will be called when that existing script finishes loading.
     */
    l: (url: string, done: ScriptLoadDone, key?: string | number, chunkId?: string | number) => void;
    /** Defines __esModule on the exports, marking ES Modules compatibility as true */
    r: (exports: AnyRecord) => void;
    /** Node.js module decorator. Decorates a module as a Node.js module */
    nmd: (module: Module) => any;
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
     * Instantiate a wasm instance with source using "wasmModuleHash", and importObject "importsObj", and then assign the exports of its instance to "exports"
     * @returns The exports of the wasm instance
     */
    v: (exports: AnyRecord, wasmModuleId: any, wasmModuleHash: string, importsObj?: WebAssembly.Imports) => Promise<any>;
    /** Bundle public path, where chunk files are stored. Used by other methods which load chunks to obtain the full asset url */
    p: string;
    /** Document baseURI or WebWorker location.href */
    b: string;
};
