declare module "@vencord/discord-types/webpack" {
    // Minimal permissive shims so CommonJS files can import types without
    // TypeScript attempting to resolve the real ESM package file.
    export type WebpackRequire = any;
    export type ModuleExports = any;
    export interface Module {
        id?: any;
        exports?: ModuleExports;
        hot?: any;
        [k: string]: any;
    }
    export type ModuleFactory = any;
    export type WebpackRequireFunction = (...args: any[]) => any;
    export const ModuleFactory: ModuleFactory;
    const _default: unknown;
    export default _default;
}
