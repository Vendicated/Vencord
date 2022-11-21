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

import { Promisable } from "type-fest";

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
     * Set this if your plugin only works on Browser or Desktop, not both
     */
    target?: "WEB" | "DESKTOP" | "BOTH";
    /**
     * Optionally provide settings that the user can configure in the Plugins tab of settings.
     */
    options?: Record<string, PluginOptionsItem>;
    /**
     * Check that this returns true before allowing a save to complete.
     * If a string is returned, show the error to the user.
     */
    beforeSave?(options: Record<string, any>): Promisable<true | string>;
    /**
     * Allows you to specify a custom Component that will be rendered in your
     * plugin's settings page
     */
    settingsAboutComponent?: React.ComponentType;
    /**
     * If this plugin is an external / user plugin, this link will point to
     * the external webpage responsible for this plugin. Local plugins should
     * not have this set, however, not every UserPlugin will have this set to
     * a link.
     */
    externalLink?: string;
    /**
     * Signifies whether this plugin is a UserPlugin or not.
     * This value is set using a build time script in globPlugins.
     */
    isUserPlugin?: boolean;
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

export type PluginOptionsItem =
    | PluginOptionString
    | PluginOptionNumber
    | PluginOptionBoolean
    | PluginOptionSelect
    | PluginOptionSlider
    | PluginOptionComponent;

export interface PluginOptionBase {
    description: string;
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

export interface PluginOptionString extends PluginOptionBase {
    type: OptionType.STRING;
    /**
     * Prevents the user from saving settings if this is false or a string
     */
    isValid?(value: string): boolean | string;
    default?: string;
}

export interface PluginOptionNumber extends PluginOptionBase {
    type: OptionType.NUMBER | OptionType.BIGINT;
    /**
     * Prevents the user from saving settings if this is false or a string
     */
    isValid?(value: number | BigInt): boolean | string;
    default?: number;
}

export interface PluginOptionBoolean extends PluginOptionBase {
    type: OptionType.BOOLEAN;
    /**
     * Prevents the user from saving settings if this is false or a string
     */
    isValid?(value: boolean): boolean | string;
    default?: boolean;
}

export interface PluginOptionSelect extends PluginOptionBase {
    type: OptionType.SELECT;
    /**
     * Prevents the user from saving settings if this is false or a string
     */
    isValid?(value: PluginOptionSelectOption): boolean | string;
    options: PluginOptionSelectOption[];
}
export interface PluginOptionSelectOption {
    label: string;
    value: string | number | boolean;
    default?: boolean;
}

export interface PluginOptionSlider extends PluginOptionBase {
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
    /**
     * Prevents the user from saving settings if this is false or a string
     */
    isValid?(value: number): boolean | string;
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
    option: PluginOptionComponent;
}

export interface PluginOptionComponent extends PluginOptionBase {
    type: OptionType.COMPONENT;
    component: (props: IPluginOptionComponentProps) => JSX.Element;
}

export type IpcRes<V = any> = { ok: true; value: V; } | { ok: false, error: any; };
