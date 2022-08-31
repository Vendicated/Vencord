import plugins from "plugins";
import IpcEvents from "../utils/IpcEvents";
import { React } from "../webpack";
import { mergeDefaults } from '../utils/misc';

interface Settings {
    unsafeRequire: boolean;
    plugins: {
        [plugin: string]: {
            enabled: boolean;
            [setting: string]: any;
        };
    };
}

const DefaultSettings: Settings = {
    unsafeRequire: false,
    plugins: {}
};

for (const plugin of plugins) {
    DefaultSettings.plugins[plugin.name] = {
        enabled: plugin.required ?? false
    };
}

try {
    var settings = JSON.parse(VencordNative.ipc.sendSync(IpcEvents.GET_SETTINGS)) as Settings;
    for (const key in DefaultSettings) {
        settings[key] ??= DefaultSettings[key];
    }
    mergeDefaults(settings, DefaultSettings);
} catch (err) {
    console.error("Corrupt settings file. ", err);
    var settings = mergeDefaults({} as Settings, DefaultSettings);
}

const subscriptions = new Set<() => void>();

function makeProxy(settings: Settings, root = settings): Settings {
    return new Proxy(settings, {
        get(target, p) {
            const v = target[p];
            if (typeof v === "object" && !Array.isArray(v)) return makeProxy(v, root);
            return v;
        },
        set(target, p, v) {
            if (target[p] === v) return true;

            target[p] = v;
            for (const subscription of subscriptions) {
                subscription();
            }
            VencordNative.ipc.invoke(IpcEvents.SET_SETTINGS, JSON.stringify(root));
            return true;
        }
    });
}

/**
 * A smart settings object. Altering props automagically saves
 * the updated settings to disk.
 */
export const Settings = makeProxy(settings);

/**
 * Settings hook for React components. Returns a smart settings
 * object that automagically triggers a rerender if any properties
 * are altered
 * @returns Settings
 */
export function useSettings() {
    const [, forceUpdate] = React.useReducer(x => ({}), {});

    React.useEffect(() => {
        subscriptions.add(forceUpdate);
        return () => void subscriptions.delete(forceUpdate);
    }, []);

    return Settings;
}