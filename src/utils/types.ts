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

import { ProfileBadge } from "@api/Badges";
import { ChatBarButtonData } from "@api/ChatButtons";
import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { MemberListDecoratorFactory } from "@api/MemberListDecorators";
import { MessageAccessoryFactory } from "@api/MessageAccessories";
import { MessageDecorationFactory } from "@api/MessageDecorations";
import { MessageClickListener, MessageEditListener, MessageSendListener } from "@api/MessageEvents";
import { MessagePopoverButtonData } from "@api/MessagePopover";
import { Command, FluxEvents } from "@vencord/discord-types";
import { ReactNode } from "react";
import { LiteralUnion } from "type-fest";

// exists to export default definePlugin({...})
export default function definePlugin<P extends PluginDef>(p: P & Record<PropertyKey, any>) {
    return p as typeof p & Plugin;
}

export function makeRange(start: number, end: number, step = 1) {
    const ranges: number[] = [];
    for (let value = start; value <= end; value += step) {
        ranges.push(Math.round(value * 100) / 100);
    }
    return ranges;
}

export const PluginTags = [
    "Accessibility",
    "Activity",
    "Appearance",
    "Chat",
    "Commands",
    "Console",
    "Customisation",
    "Developers",
    "Emotes",
    "Friends",
    "Fun",
    "Media",
    "Notifications",
    "Organisation",
    "Privacy",
    "Reactions",
    "Roles",
    "Servers",
    "Shortcuts",
    "Utility",
    "Voice"
] as const;

export type PluginTag = typeof PluginTags[number];

export type ReplaceFn = (match: string, ...groups: string[]) => string;

export interface PatchReplacement {
    /** The match for the patch replacement. If you use a string it will be implicitly converted to a RegExp */
    match: string | RegExp;
    /** The replacement string or function which returns the string for the patch replacement */
    replace: string | ReplaceFn;
    /** Do not warn if this replacement did no changes */
    noWarn?: boolean;
    /**
     * A function which returns whether this patch replacement should be applied.
     * This is ran before patches are registered, so if this returns false, the patch will never be registered.
     */
    predicate?(): boolean;
    /** The minimum build number for this patch to be applied */
    fromBuild?: number;
    /** The maximum build number for this patch to be applied */
    toBuild?: number;
}

export interface Patch {
    plugin: string;
    /** A string or RegExp which is only include/matched in the module code you wish to patch. Prefer only using a RegExp if a simple string test is not enough */
    find: string | RegExp;
    /** The replacement(s) for the module being patched */
    replacement: PatchReplacement | PatchReplacement[];
    /** Whether this patch should apply to multiple modules */
    all?: boolean;
    /** Do not warn if this patch did no changes */
    noWarn?: boolean;
    /** Only apply this set of replacements if all of them succeed. Use this if your replacements depend on each other */
    group?: boolean;
    /**
     * A function which returns whether this patch replacement should be applied.
     * This is ran before patches are registered, so if this returns false, the patch will never be registered.
     */
    predicate?(): boolean;
    /** The minimum build number for this patch to be applied */
    fromBuild?: number;
    /** The maximum build number for this patch to be applied */
    toBuild?: number;
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

export type IconComponent = (props: IconProps & Record<string, any>) => ReactNode;
export type IconProps = { height?: number | string; width?: number | string; className?: string; };
export interface PluginDef {
    name: string;
    description: string;
    /** Additional search terms that will bring up your plugin */
    searchTerms?: string[];
    tags?: PluginTag[];
    authors: PluginAuthor[];
    start?(): void;
    stop?(): void;
    patches?: Omit<Patch, "plugin">[];
    /**
     * List of commands that your plugin wants to register
     */
    commands?: Command[];
    /**
     * A list of other plugins that your plugin depends on.
     * These will automatically be enabled and loaded before your plugin
     * Generally these will be API plugins
     */
    dependencies?: string[],
    /**
     * Whether this plugin is required and forcefully enabled
     */
    required?: boolean;
    /**
     * Whether this plugin should be hidden from the user
     */
    hidden?: boolean;
    /**
     * Whether this plugin should be enabled by default, but can be disabled
     */
    enabledByDefault?: boolean;
    /**
     * Whether enabling or disabling this plugin requires a restart. Defaults to true if the plugin has patches.
     */
    requiresRestart?: boolean;
    /**
     * When to call the start() method
     * @default StartAt.WebpackReady
     */
    startAt?: StartAt,
    /**
     * Which parts of the plugin can be tested by the reporter. Defaults to all parts
     */
    reporterTestable?: number;
    /**
     * Optionally provide settings that the user can configure in the Plugins tab of settings.
     */
    settings?: DefinedSettings;
    /**
     * Allows you to specify a custom Component that will be rendered in your
     * plugin's settings page
     */
    settingsAboutComponent?: React.ComponentType<{}>;
    /**
     * Allows you to subscribe to Flux events
     */
    flux?: Partial<{
        [E in LiteralUnion<FluxEvents, string>]: (event: any) => void | Promise<void>;
    }>;
    /**
     * Allows you to manipulate context menus
     */
    contextMenus?: Record<string, NavContextMenuPatchCallback>;
    /**
     * Allows you to add custom actions to the Vencord Toolbox.
     *
     * Can either be an object mapping labels to action functions or a Function returning Menu components.
     * Please note that you can only use Menu components.
     *
     * @example
     * toolboxActions: {
     *   "Click Me": () => alert("Hi")
     * }
     */
    toolboxActions?: Record<string, () => void> | (() => ReactNode);

    /**
     * Managed style to automatically enable and disable when the plugin is enabled or disabled
     */
    managedStyle?: string;

    userProfileBadge?: ProfileBadge;

    messagePopoverButton?: MessagePopoverButtonData;
    chatBarButton?: ChatBarButtonData;

    onMessageClick?: MessageClickListener;
    onBeforeMessageSend?: MessageSendListener;
    onBeforeMessageEdit?: MessageEditListener;

    renderMessageAccessory?: MessageAccessoryFactory;
    renderMessageDecoration?: MessageDecorationFactory;

    renderMemberListDecorator?: MemberListDecoratorFactory;
}

export const enum StartAt {
    /** Right away, as soon as Vencord initialised */
    Init = "Init",
    /** On the DOMContentLoaded event, so once the document is ready */
    DOMContentLoaded = "DOMContentLoaded",
    /** Once Discord's core webpack modules have finished loading, so as soon as things like react and flux are available */
    WebpackReady = "WebpackReady"
}

export const enum ReporterTestable {
    None = 1 << 1,
    Start = 1 << 2,
    Patches = 1 << 3,
    FluxEvents = 1 << 4
}

export function defineDefault<T = any>(value: T) {
    return value;
}

export const enum OptionType {
    STRING,
    NUMBER,
    BIGINT,
    BOOLEAN,
    SELECT,
    SLIDER,
    COMPONENT,
    CUSTOM
}

export type SettingsDefinition = Record<string, PluginSettingDef>;
export type SettingsChecks<D extends SettingsDefinition> = {
    [K in keyof D]?: D[K] extends PluginSettingComponentDef ? IsDisabledOrHidden<DefinedSettings<D>> :
    (IsDisabledOrHidden<DefinedSettings<D>> & IsValid<PluginSettingType<D[K]>, DefinedSettings<D>>);
};

export type PluginSettingDef =
    | PluginSettingCustomDef
    | PluginSettingComponentDef
    | PluginSettingStringDef
    | PluginSettingNumberDef
    | PluginSettingBooleanDef
    | PluginSettingSelectDef
    | PluginSettingSliderDef
    | PluginSettingBigIntDef;

export interface PluginSettingDefCommon extends IsDisabledOrHidden, IsValid<unknown> {
    description: string;
    placeholder?: string;
    onChange?(newValue: any): void;
    /**
     * Whether changing this setting requires a restart
     */
    restartNeeded?: boolean;
    componentProps?: Record<string, any>;
    /**
     * Set this if the setting only works on Browser or Desktop, not both
     */
    target?: "WEB" | "DESKTOP" | "BOTH";
}

interface IsDisabledOrHidden<D extends DefinedSettings = DefinedSettings> {
    /**
     * Whether this setting should be disabled
     */
    disabled?: boolean | ((this: D) => boolean);
    /**
     * Whether this setting should be hidden from the user
     */
    hidden?: boolean | ((this: D) => boolean);
}

interface IsValid<T, D extends DefinedSettings = DefinedSettings> {
    /**
     * Whether the value the user provided is valid. Either return a boolean for a generic error message or a string for a custom error message.
     */
    isValid?(this: D, value: T): boolean | string;
}

export interface PluginSettingStringDef extends PluginSettingDefCommon {
    type: OptionType.STRING;
    default?: string;
    /** Whether to use a multiline text area */
    multiline?: boolean;
}
export interface PluginSettingNumberDef extends PluginSettingDefCommon {
    type: OptionType.NUMBER;
    default?: number;
}
export interface PluginSettingBigIntDef extends PluginSettingDefCommon {
    type: OptionType.BIGINT;
    default?: BigInt;
}
export interface PluginSettingBooleanDef extends PluginSettingDefCommon {
    type: OptionType.BOOLEAN;
    default?: boolean;
}

export interface PluginSettingSelectDef extends PluginSettingDefCommon {
    type: OptionType.SELECT;
    options: readonly PluginSettingSelectOption[];
}

export interface PluginSettingSelectOption {
    label: string;
    value: string | number | boolean;
    default?: boolean;
}

export interface PluginSettingCustomDef {
    type: OptionType.CUSTOM;
    default?: any;
    onChange?: PluginSettingDefCommon["onChange"];
}

export interface PluginSettingSliderDef extends PluginSettingDefCommon {
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

export interface PluginSettingComponentDef extends Omit<PluginSettingDefCommon, "description" | "placeholder"> {
    type: OptionType.COMPONENT;
    component: (props: PluginSettingComponentProps) => ReactNode | Promise<ReactNode>;
    default?: any;
}
export interface PluginSettingComponentProps {
    /**
     * Run this when the value changes.
     */
    setValue(newValue: any): void;
    /**
     * The options object
     */
    option: PluginSettingComponentDef;
}

/** Maps a `PluginSettingDef` to its value type */
type PluginSettingType<O extends PluginSettingDef> = O extends PluginSettingStringDef ? string :
    O extends PluginSettingNumberDef ? number :
    O extends PluginSettingBigIntDef ? BigInt :
    O extends PluginSettingBooleanDef ? boolean :
    O extends PluginSettingSelectDef ? O["options"][number]["value"] :
    O extends PluginSettingSliderDef ? number :
    O extends PluginSettingComponentDef ? O extends { default: infer Default; } ? Default : any :
    O extends PluginSettingCustomDef ? O extends { default: infer Default; } ? Default : any :
    never;

type PluginSettingDefaultType<O extends PluginSettingDef> = O extends PluginSettingSelectDef ? (
    O["options"] extends { default?: boolean; }[] ? O["options"][number]["value"] : undefined
) : O extends { default: infer T; } ? T : undefined;

type SettingsStore<D extends SettingsDefinition> = {
    [K in keyof D]: PluginSettingType<D[K]> | PluginSettingDefaultType<D[K]>;
};

/** An instance of defined plugin settings */
export interface DefinedSettings<
    Def extends SettingsDefinition = SettingsDefinition,
    PrivateSettings extends object = {}
> {
    /** Definitions of each setting */
    def: Def;
    /** Reactive Read/Write settings store - This is a Proxy, use .plain for a plain object */
    store: SettingsStore<Def> & PrivateSettings;
    /** Pure Read-only settings object */
    plain: SettingsStore<Def> & PrivateSettings;
    /**
     * React hook for getting the settings for this plugin
     * @param filter optional filter to avoid rerenders for irrelevant settings
     */
    use<F extends Extract<keyof Def | keyof PrivateSettings, string>>(filter?: F[]): Pick<SettingsStore<Def> & PrivateSettings, F>;
    /**
     * Name of the plugin these settings belong to,
     * will be an empty string until plugin is initialized
     */
    pluginName: string;
    /** Extend this Settings object type with more properties, useful for non-user-facing settings */
    withPrivateSettings<T extends object>(): DefinedSettings<Def, T>;
}

export type PartialExcept<T, R extends keyof T> = Partial<T> & Required<Pick<T, R>>;

export type IpcRes<V = any> = { ok: true; value: V; } | { ok: false, error: any; };

export type PluginNative<PluginExports extends Record<string, (event: Electron.IpcMainInvokeEvent, ...args: any[]) => any>> = {
    [key in keyof PluginExports]:
    PluginExports[key] extends (event: Electron.IpcMainInvokeEvent, ...args: infer Args) => infer Return
    ? (...args: Args) => Return extends Promise<any> ? Return : Promise<Return>
    : never;
};

export type AllOrNothing<T> = T | { [K in keyof T]?: never; };
