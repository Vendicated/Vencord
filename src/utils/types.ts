/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { Command } from "@api/Commands";
import { Promisable } from "type-fest";

// exists to export default definePlugin({...})
export default function definePlugin<P extends PluginDef>(p: P & Record<string, any>) {
    return p;
}

export type ReplaceFn = (match: string, ...groups: string[]) => string;

export interface PatchReplacement {
    match: string | RegExp;
    replace: string | ReplaceFn;
    predicate?(): boolean;
}

export interface Patch {
    plugin: string;
    find: string;
    replacement: PatchReplacement | PatchReplacement[];
    /** Whether this patch should apply to multiple modules */
    all?: boolean;
    /** Do not warn if this patch did no changes */
    noWarn?: boolean;
    predicate?(): boolean;
}

export interface PluginAuthor {
    name: string;
    id: BigInt;
}

export interface Plugin extends PluginDef {
    patches?: Patch[];
    started: boolean;
    isDependency?: boolean;
}

export interface PluginDef {
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
     * Whether this plugin should be enabled by default, but can be disabled
     */
    enabledByDefault?: boolean;
    /**
     * Optionally provide settings that the user can configure in the Plugins tab of settings.
     * @deprecated Use `settings` instead
     */
    // TODO: Remove when everything is migrated to `settings`
    options?: Record<string, PluginOptionsItem>;
    /**
     * Optionally provide settings that the user can configure in the Plugins tab of settings.
     */
    settings?: DefinedSettings;
    /**
     * Check that this returns true before allowing a save to complete.
     * If a string is returned, show the error to the user.
     */
    beforeSave?(options: Record<string, any>): Promisable<true | string>;
    /**
     * Allows you to specify a custom Component that will be rendered in your
     * plugin's settings page
     */
    settingsAboutComponent?: React.ComponentType<{
        tempSettings?: Record<string, any>;
    }>;
}

export enum OptionType {
    STRING,
    NUMBER,
    BIGINT,
    BOOLEAN,
    SELECT,
    SLIDER,
    COMPONENT,
}

export type SettingsDefinition = Record<string, PluginSettingDef>;
export type SettingsChecks<D extends SettingsDefinition> = {
    [K in keyof D]?: D[K] extends PluginSettingComponentDef ? IsDisabled<DefinedSettings<D>> :
    (IsDisabled<DefinedSettings<D>> & IsValid<PluginSettingType<D[K]>, DefinedSettings<D>>);
};

export type PluginSettingDef = (
    | PluginSettingStringDef
    | PluginSettingNumberDef
    | PluginSettingBooleanDef
    | PluginSettingSelectDef
    | PluginSettingSliderDef
    | PluginSettingComponentDef
) & PluginSettingCommon;

export interface PluginSettingCommon {
    description: string;
    placeholder?: string;
    onChange?(newValue: any): void;
    restartNeeded?: boolean;
    componentProps?: Record<string, any>;
    /**
     * Set this if the setting only works on Browser or Desktop, not both
     */
    target?: "WEB" | "DESKTOP" | "BOTH";
}
interface IsDisabled<D = unknown> {
    /**
     * Checks if this setting should be disabled
     */
    disabled?(this: D): boolean;
}
interface IsValid<T, D = unknown> {
    /**
     * Prevents the user from saving settings if this is false or a string
     */
    isValid?(this: D, value: T): boolean | string;
}

export interface PluginSettingStringDef {
    type: OptionType.STRING;
    default?: string;
}
export interface PluginSettingNumberDef {
    type: OptionType.NUMBER;
    default?: number;
}
export interface PluginSettingBigIntDef {
    type: OptionType.BIGINT;
    default?: BigInt;
}
export interface PluginSettingBooleanDef {
    type: OptionType.BOOLEAN;
    default?: boolean;
}

export interface PluginSettingSelectDef {
    type: OptionType.SELECT;
    options: readonly PluginSettingSelectOption[];
}
export interface PluginSettingSelectOption {
    label: string;
    value: string | number | boolean;
    default?: boolean;
}

export interface PluginSettingSliderDef {
    type: OptionType.SLIDER;
    /**
     * All the possible values in the slider. Needs at least two values.
     */
    markers: number[];
    /**
     * Default value to use
     */
    default: number;
    /**
     * If false, allow users to select values in-between your markers.
     */
    stickToMarkers?: boolean;
}

interface IPluginOptionComponentProps {
    /**
     * Run this when the value changes.
     *
     * NOTE: The user will still need to click save to apply these changes.
     */
    setValue(newValue: any): void;
    /**
     * Set to true to prevent the user from saving.
     *
     * NOTE: This will not show the error to the user. It will only stop them saving.
     * Make sure to show the error in your component.
     */
    setError(error: boolean): void;
    /**
     * The options object
     */
    option: PluginSettingComponentDef;
}

export interface PluginSettingComponentDef {
    type: OptionType.COMPONENT;
    component: (props: IPluginOptionComponentProps) => JSX.Element;
}

/** Maps a `PluginSettingDef` to its value type */
type PluginSettingType<O extends PluginSettingDef> = O extends PluginSettingStringDef ? string :
    O extends PluginSettingNumberDef ? number :
    O extends PluginSettingBigIntDef ? BigInt :
    O extends PluginSettingBooleanDef ? boolean :
    O extends PluginSettingSelectDef ? O["options"][number]["value"] :
    O extends PluginSettingSliderDef ? number :
    O extends PluginSettingComponentDef ? any :
    never;
type PluginSettingDefaultType<O extends PluginSettingDef> = O extends PluginSettingSelectDef ? (
    O["options"] extends { default?: boolean; }[] ? O["options"][number]["value"] : undefined
) : O extends { default: infer T; } ? T : undefined;

type SettingsStore<D extends SettingsDefinition> = {
    [K in keyof D]: PluginSettingType<D[K]> | PluginSettingDefaultType<D[K]>;
};

/** An instance of defined plugin settings */
export interface DefinedSettings<D extends SettingsDefinition = SettingsDefinition, C extends SettingsChecks<D> = {}> {
    /** Shorthand for `Vencord.Settings.plugins.PluginName`, but with typings */
    store: SettingsStore<D>;
    /**
     * React hook for getting the settings for this plugin
     * @param filter optional filter to avoid rerenders for irrelavent settings
     */
    use<F extends Extract<keyof D, string>>(filter?: F[]): Pick<SettingsStore<D>, F>;
    /** Definitions of each setting */
    def: D;
    /** Setting methods with return values that could rely on other settings */
    checks: C;
    /**
     * Name of the plugin these settings belong to,
     * will be an empty string until plugin is initialized
     */
    pluginName: string;
}

export type PartialExcept<T, R extends keyof T> = Partial<T> & Required<Pick<T, R>>;

export type IpcRes<V = any> = { ok: true; value: V; } | { ok: false, error: any; };

/* -------------------------------------------- */
/*             Legacy Options Types             */
/* -------------------------------------------- */

export type PluginOptionBase = PluginSettingCommon & IsDisabled;
export type PluginOptionsItem =
    | PluginOptionString
    | PluginOptionNumber
    | PluginOptionBoolean
    | PluginOptionSelect
    | PluginOptionSlider
    | PluginOptionComponent;
export type PluginOptionString = PluginSettingStringDef & PluginSettingCommon & IsDisabled & IsValid<string>;
export type PluginOptionNumber = (PluginSettingNumberDef | PluginSettingBigIntDef) & PluginSettingCommon & IsDisabled & IsValid<number | BigInt>;
export type PluginOptionBoolean = PluginSettingBooleanDef & PluginSettingCommon & IsDisabled & IsValid<boolean>;
export type PluginOptionSelect = PluginSettingSelectDef & PluginSettingCommon & IsDisabled & IsValid<PluginSettingSelectOption>;
export type PluginOptionSlider = PluginSettingSliderDef & PluginSettingCommon & IsDisabled & IsValid<number>;
export type PluginOptionComponent = PluginSettingComponentDef & PluginSettingCommon;
