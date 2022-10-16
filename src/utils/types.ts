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
    settings?: Record<string, PluginSettingsItem>;
    aboutComponent?(): React.ReactNode;
}

export enum PluginSettingType {
    STRING,
    NUMBER,
    BOOLEAN,
    SELECT,
}


export type PluginSettingsItem =
    | PluginSettingsString
    | PluginSettingsNumber
    | PluginSettingsBoolean
    | PluginSettingsSelect;

export interface PluginSettingsBase {
    name: string;
    placeholder?: string;
    onChange?(newValue: any): void;
    disabled?(): boolean;
    restartNeeded?: boolean;
    componentProps?: Record<string, any>;
    /**
     * Set this if the setting only works on Browser or Desktop, not both
     */
    target?: "WEB" | "DESKTOP" | "BOTH";
}

export interface PluginSettingsString extends PluginSettingsBase {
    type: PluginSettingType.STRING;
    default?: string;
}

export interface PluginSettingsNumber extends PluginSettingsBase {
    type: PluginSettingType.NUMBER;
    default?: number;
}

export interface PluginSettingsBoolean extends PluginSettingsBase {
    type: PluginSettingType.BOOLEAN;
    default?: boolean;
}

export interface PluginSettingsSelect extends PluginSettingsBase {
    type: PluginSettingType.SELECT;
    options: PluginSettingsItemOption[];
}
export interface PluginSettingsItemOption {
    label: string;
    value: string | number | boolean;
    default?: boolean;
}

export type IpcRes<V = any> = { ok: true; value: V; } | { ok: false, error: any; };
