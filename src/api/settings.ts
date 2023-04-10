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

import { debounce } from "@utils/debounce";
import IpcEvents from "@utils/IpcEvents";
import { localStorage } from "@utils/localStorage";
import Logger from "@utils/Logger";
import { mergeDefaults } from "@utils/misc";
import { putCloudSettings } from "@utils/settingsSync";
import { DefinedSettings, OptionType, SettingsChecks, SettingsDefinition } from "@utils/types";
import { React } from "@webpack/common";

import plugins from "~plugins";

const logger = new Logger("Settings");
export interface Settings {
    notifyAboutUpdates: boolean;
    autoUpdate: boolean;
    autoUpdateNotification: boolean,
    useQuickCss: boolean;
    enableReactDevtools: boolean;
    themeLinks: string[];
    frameless: boolean;
    transparent: boolean;
    winCtrlQ: boolean;
    macosTranslucency: boolean;
    disableMinSize: boolean;
    winNativeTitleBar: boolean;
    plugins: {
        [plugin: string]: {
            enabled: boolean;
            [setting: string]: any;
        };
    };

    notifications: {
        timeout: number;
        position: "top-right" | "bottom-right";
        useNative: "always" | "never" | "not-focused";
        logLimit: number;
    };

    cloud: {
        authenticated: boolean;
        url: string;
        settingsSync: boolean;
        settingsSyncVersion: number;
    };
}

const DefaultSettings: Settings = {
    notifyAboutUpdates: true,
    autoUpdate: false,
    autoUpdateNotification: true,
    useQuickCss: true,
    themeLinks: [],
    enableReactDevtools: false,
    frameless: false,
    transparent: false,
    winCtrlQ: false,
    macosTranslucency: false,
    disableMinSize: false,
    winNativeTitleBar: false,
    plugins: {},

    notifications: {
        timeout: 5000,
        position: "bottom-right",
        useNative: "not-focused",
        logLimit: 50
    },

    cloud: {
        authenticated: false,
        url: "https://api.vencord.dev/",
        settingsSync: false,
        settingsSyncVersion: 0
    }
};

try {
    var settings = JSON.parse(VencordNative.ipc.sendSync(IpcEvents.GET_SETTINGS)) as Settings;
    mergeDefaults(settings, DefaultSettings);
} catch (err) {
    var settings = mergeDefaults({} as Settings, DefaultSettings);
    logger.error("An error occurred while loading the settings. Corrupt settings file?\n", err);
}

const saveSettingsOnFrequentAction = debounce(async () => {
    if (Settings.cloud.settingsSync && Settings.cloud.authenticated) {
        await putCloudSettings();
        delete localStorage.Vencord_settingsDirty;
    }
}, 60_000);

type SubscriptionCallback = ((newValue: any, path: string) => void) & { _path?: string; };
const subscriptions = new Set<SubscriptionCallback>();

const proxyCache = {} as Record<string, any>;

// Wraps the passed settings object in a Proxy to nicely handle change listeners and default values
function makeProxy(settings: any, root = settings, path = ""): Settings {
    return proxyCache[path] ??= new Proxy(settings, {
        get(target, p: string) {
            const v = target[p];

            // using "in" is important in the following cases to properly handle falsy or nullish values
            if (!(p in target)) {
                // Return empty for plugins with no settings
                if (path === "plugins" && p in plugins)
                    return target[p] = makeProxy({
                        enabled: plugins[p].required ?? plugins[p].enabledByDefault ?? false
                    }, root, `plugins.${p}`);

                // Since the property is not set, check if this is a plugin's setting and if so, try to resolve
                // the default value.
                if (path.startsWith("plugins.")) {
                    const plugin = path.slice("plugins.".length);
                    if (plugin in plugins) {
                        const setting = plugins[plugin].options?.[p];
                        if (!setting) return v;
                        if ("default" in setting)
                            // normal setting with a default value
                            return (target[p] = setting.default);
                        if (setting.type === OptionType.SELECT) {
                            const def = setting.options.find(o => o.default);
                            if (def)
                                target[p] = def.value;
                            return def?.value;
                        }
                    }
                }
                return v;
            }

            // Recursively proxy Objects with the updated property path
            if (typeof v === "object" && !Array.isArray(v) && v !== null)
                return makeProxy(v, root, `${path}${path && "."}${p}`);

            // primitive or similar, no need to proxy further
            return v;
        },

        set(target, p: string, v) {
            // avoid unnecessary updates to React Components and other listeners
            if (target[p] === v) return true;

            target[p] = v;
            // Call any listeners that are listening to a setting of this path
            const setPath = `${path}${path && "."}${p}`;
            delete proxyCache[setPath];
            for (const subscription of subscriptions) {
                if (!subscription._path || subscription._path === setPath) {
                    subscription(v, setPath);
                }
            }
            // And don't forget to persist the settings!
            PlainSettings.cloud.settingsSyncVersion = Date.now();
            localStorage.Vencord_settingsDirty = true;
            saveSettingsOnFrequentAction();
            VencordNative.ipc.invoke(IpcEvents.SET_SETTINGS, JSON.stringify(root, null, 4));
            return true;
        }
    });
}

/**
 * Same as {@link Settings} but unproxied. You should treat this as readonly,
 * as modifying properties on this will not save to disk or call settings
 * listeners.
 * WARNING: default values specified in plugin.options will not be ensured here. In other words,
 * settings for which you specified a default value may be uninitialised. If you need proper
 * handling for default values, use {@link Settings}
 */
export const PlainSettings = settings;
/**
 * A smart settings object. Altering props automagically saves
 * the updated settings to disk.
 * This recursively proxies objects. If you need the object non proxied, use {@link PlainSettings}
 */
export const Settings = makeProxy(settings);

/**
 * Settings hook for React components. Returns a smart settings
 * object that automagically triggers a rerender if any properties
 * are altered
 * @param paths An optional list of paths to whitelist for rerenders
 * @returns Settings
 */
// TODO: Representing paths as essentially "string[].join('.')" wont allow dots in paths, change to "paths?: string[][]" later
export function useSettings(paths?: UseSettings<Settings>[]) {
    const [, forceUpdate] = React.useReducer(() => ({}), {});

    const onUpdate: SubscriptionCallback = paths
        ? (value, path) => paths.includes(path as UseSettings<Settings>) && forceUpdate()
        : forceUpdate;

    React.useEffect(() => {
        subscriptions.add(onUpdate);
        return () => void subscriptions.delete(onUpdate);
    }, []);

    return Settings;
}

// Resolves a possibly nested prop in the form of "some.nested.prop" to type of T.some.nested.prop
type ResolvePropDeep<T, P> = P extends "" ? T :
    P extends `${infer Pre}.${infer Suf}` ?
    Pre extends keyof T ? ResolvePropDeep<T[Pre], Suf> : never : P extends keyof T ? T[P] : never;

/**
 * Add a settings listener that will be invoked whenever the desired setting is updated
 * @param path Path to the setting that you want to watch, for example "plugins.Unindent.enabled" will fire your callback
 *             whenever Unindent is toggled. Pass an empty string to get notified for all changes
 * @param onUpdate Callback function whenever a setting matching path is updated. It gets passed the new value and the path
 *                 to the updated setting. This path will be the same as your path argument, unless it was an empty string.
 *
 * @example addSettingsListener("", (newValue, path) => console.log(`${path} is now ${newValue}`))
 *          addSettingsListener("plugins.Unindent.enabled", v => console.log("Unindent is now", v ? "enabled" : "disabled"))
 */
export function addSettingsListener<Path extends keyof Settings>(path: Path, onUpdate: (newValue: Settings[Path], path: Path) => void): void;
export function addSettingsListener<Path extends string>(path: Path, onUpdate: (newValue: Path extends "" ? any : ResolvePropDeep<Settings, Path>, path: Path extends "" ? string : Path) => void): void;
export function addSettingsListener(path: string, onUpdate: (newValue: any, path: string) => void) {
    (onUpdate as SubscriptionCallback)._path = path;
    subscriptions.add(onUpdate);
}

export function migratePluginSettings(name: string, ...oldNames: string[]) {
    const { plugins } = settings;
    if (name in plugins) return;

    for (const oldName of oldNames) {
        if (oldName in plugins) {
            logger.info(`Migrating settings from old name ${oldName} to ${name}`);
            plugins[name] = plugins[oldName];
            delete plugins[oldName];
            VencordNative.ipc.invoke(
                IpcEvents.SET_SETTINGS,
                JSON.stringify(settings, null, 4)
            );
            break;
        }
    }
}

export function definePluginSettings<D extends SettingsDefinition, C extends SettingsChecks<D>>(def: D, checks?: C) {
    const definedSettings: DefinedSettings<D> = {
        get store() {
            if (!definedSettings.pluginName) throw new Error("Cannot access settings before plugin is initialized");
            return Settings.plugins[definedSettings.pluginName] as any;
        },
        use: settings => useSettings(
            settings?.map(name => `plugins.${definedSettings.pluginName}.${name}`) as UseSettings<Settings>[]
        ).plugins[definedSettings.pluginName] as any,
        def,
        checks: checks ?? {},
        pluginName: "",
    };
    return definedSettings;
}

type UseSettings<T extends object> = ResolveUseSettings<T>[keyof T];

type ResolveUseSettings<T extends object> = {
    [Key in keyof T]:
    Key extends string
    ? T[Key] extends Record<string, unknown>
    // @ts-ignore "Type instantiation is excessively deep and possibly infinite"
    ? UseSettings<T[Key]> extends string ? `${Key}.${UseSettings<T[Key]>}` : never
    : Key
    : never;
};
