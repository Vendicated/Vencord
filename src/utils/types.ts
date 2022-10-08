import { Command } from "../api/Commands";

// exists to export default definePlugin({...})
export default function definePlugin(p: PluginDef & Record<string, any>) {
    return p;
}

export interface PatchReplacement {
    match: string | RegExp;
    replace: string | ((match: string, ...groups: string[]) => string);
}

export interface Patch {
    plugin: string;
    find: string,
    replacement: PatchReplacement | PatchReplacement[];
}

export interface PluginAuthor {
    name: string;
    id: BigInt;
}

export interface Plugin extends PluginDef {
    patches?: Patch[];
    started: boolean;
}

interface PluginDef {
    name: string;
    description: string;
    authors: PluginAuthor[];
    start?(): void;
    stop?(): void;
    patches?: Omit<Patch, "plugin">[];
    commands?: Command[];
    dependencies?: string[],
    required?: boolean;
    /**
     * Set this if your plugin only works on Browser or Desktop, not both
     */
    target?: "WEB" | "DESKTOP" | "BOTH";
}

export type IpcRes<V = any> = { ok: true; value: V; } | { ok: false, error: any; };
