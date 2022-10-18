import plugins from "plugins";
import IpcEvents from "../utils/IpcEvents";
import { React } from "../webpack/common";
import { mergeDefaults } from "../utils/misc";
import { OptionType } from "../utils/types";

export interface Settings {
    notifyAboutUpdates: boolean;
    useQuickCss: boolean;
    enableReactDevtools: boolean;
    plugins: {
        [plugin: string]: {
            enabled: boolean;
            [setting: string]: any;
        };
    };
}

const DefaultSettings: Settings = {
    notifyAboutUpdates: true,
    useQuickCss: true,
    enableReactDevtools: false,
    plugins: {}
};

for (const plugin in plugins) {
    DefaultSettings.plugins[plugin] = {
        enabled: plugins[plugin].required ?? false
    };
}

try {
    var settings = JSON.parse(VencordNative.ipc.sendSync(IpcEvents.GET_SETTINGS)) as Settings;
    mergeDefaults(settings, DefaultSettings);
} catch (err) {
    console.error("Corrupt settings file. ", err);
    var settings = mergeDefaults({} as Settings, DefaultSettings);
}

type SubscriptionCallback = ((newValue: any, path: string) => void) & { _path?: string; };
const subscriptions = new Set<SubscriptionCallback>();

// Wraps the passed settings object in a Proxy to nicely handle change listeners and default values
function makeProxy(settings: Settings, root = settings, path = ""): Settings {
    return new Proxy(settings, {
        get(target, p: string) {
            const v = target[p];

            // using "in" is important in the following cases to properly handle falsy or nullish values
            if (!(p in target)) {
                // Since the property is not set, check if this is a plugin's setting and if so, try to resolve
                // the default value.
                if (path.startsWith("plugins.")) {
                    const plugin = path.slice(8);
                    if (plugin in plugins) {
                        const setting = plugins[plugin].options?.[p];
                        if (!setting) return v;
                        if ("default" in setting)
                            // normal setting with a default value
                            return setting.default;
                        if (setting.type === OptionType.SELECT)
                            return setting.options.find(o => o.default);
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
            for (const subscription of subscriptions) {
                if (!subscription._path || subscription._path === setPath) {
                    subscription(v, setPath);
                }
            }
            // And don't forget to persist the settings!
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
 * @returns Settings
 */
export function useSettings() {
    const [, forceUpdate] = React.useReducer(() => ({}), {});

    React.useEffect(() => {
        subscriptions.add(forceUpdate);
        return () => void subscriptions.delete(forceUpdate);
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
