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
    /**
     * List of commands. If you specify these, you must add CommandsAPI to dependencies
     */
    commands?: Command[];
    /**
     * A list of other plugins that your plugin depends on.
     * These will automatically be enabled and loaded before your plugin
     * Common examples are CommandsAPI, MessageEventsAPI...
     */
    dependencies?: string[],
    /**
     * Whether this plugin is required and forcefully enabled
     */
    required?: boolean;
    /**
     * Set this if your plugin only works on Browser or Desktop, not both
     */
    target?: "WEB" | "DESKTOP" | "BOTH";
    /**
     * Allows
     */
    settings?: Record<string, PluginSettingsItem>;
    /**
     * Allows you to specify a custom Component that will be rendered in your
     * plugin's settings page
     */
    settingsAboutComponent?: React.ComponentType;
}

export enum SettingType {
    STRING,
    NUMBER,
    BIGINT,
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
    type: SettingType.STRING;
    default?: string;
}

export interface PluginSettingsNumber extends PluginSettingsBase {
    type: SettingType.NUMBER | SettingType.BIGINT;
    default?: number;
}

export interface PluginSettingsBoolean extends PluginSettingsBase {
    type: SettingType.BOOLEAN;
    default?: boolean;
}

export interface PluginSettingsSelect extends PluginSettingsBase {
    type: SettingType.SELECT;
    options: PluginSettingsItemOption[];
}
export interface PluginSettingsItemOption {
    label: string;
    value: string | number | boolean;
    default?: boolean;
}

export type IpcRes<V = any> = { ok: true; value: V; } | { ok: false, error: any; };
