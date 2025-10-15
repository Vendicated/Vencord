declare module "plugins" {
    // permissive plugin manager ambient used by UI. Return shapes approximate runtime.
    export type StartDepsResult = { restartNeeded: boolean; failures: Array<{ plugin: string; reason?: string }>; };

    export function startDependenciesRecursive(id: string | any): StartDepsResult;
    export function startPlugin(id: string | any): boolean | { ok: boolean; message?: string };
    export function stopPlugin(id: string | any): boolean | { ok: boolean; message?: string };
    export function isPluginEnabled(id: string | any): boolean;
    const _default: {
        startDependenciesRecursive: typeof startDependenciesRecursive;
        startPlugin: typeof startPlugin;
        stopPlugin: typeof stopPlugin;
        isPluginEnabled: typeof isPluginEnabled;
        [k: string]: any;
    };
    export default _default;
}
