import { Command } from "../api/Commands";

// exists to export default definePlugin({...})
export default function definePlugin<P extends PluginDef>(p: P & Record<string, any>) {
    return p;
}

export interface PatchReplacement {
    match: string | RegExp;
    replace: string | ((match: string, ...groups: string[]) => string);
}

export interface Patch {
    plugin: string;
    find: string;
    replacement: PatchReplacement | PatchReplacement[];
    all?: boolean;
    predicate?(): boolean;
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
    settings?: PluginSettingsItem[];
}

export interface PluginSettingsItem {
    /** Unique key of the setting. Try not to change this. */
    key: string;
    name: string;
    type: "string" | "number" | "boolean" | "select";
    /** On selects, use default key in .options instead of this */
    default?: string | number | boolean;
    placeholder?: string;
    options?: PluginSettingsItemOption[];
    onChange?(newValue: any): void;
    disabled?(): boolean;
    restartNeeded?: boolean;
    componentProps?: Record<string, any>;
}

export interface PluginSettingsItemOption {
    label: string;
    value: string | number | boolean;
    default?: boolean;
}

export type IpcRes<V = any> = { ok: true; value: V; } | { ok: false, error: any; };

export enum PluginCategory {
    Utility = "Utility",
}
