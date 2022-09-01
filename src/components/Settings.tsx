import { humanFriendlyJoin, useAwaiter } from "../utils/misc";
import Plugins from 'plugins';
import { useSettings } from "../api/settings";
import IpcEvents from "../utils/IpcEvents";

import { Button, ButtonProps, Flex, Switch, Forms, React } from "../webpack/common";
import ErrorBoundary from "./ErrorBoundary";
import { startPlugin } from "../plugins";
import { stopPlugin } from '../plugins/index';

export default ErrorBoundary.wrap(function Settings(props) {
    const [settingsDir, , settingsDirPending] = useAwaiter(() => VencordNative.ipc.invoke<string>(IpcEvents.GET_SETTINGS_DIR), "Loading...");
    const settings = useSettings();

    const depMap = React.useMemo(() => {
        const o = {} as Record<string, string[]>;
        for (const plugin in Plugins) {
            const deps = Plugins[plugin].dependencies;
            if (deps) {
                for (const dep of deps) {
                    o[dep] ??= [];
                    o[dep].push(plugin);
                }
            }
        }
        return o;
    }, []);

    console.log(depMap);

    return (
        <Forms.FormSection tag="h1" title="Vencord">
            <Forms.FormText>SettingsDir: {settingsDir}</Forms.FormText>
            <Flex style={{ marginTop: "8px", marginBottom: "8px" }}>
                <Flex.Child>
                    <Button
                        onClick={() => VencordNative.ipc.invoke(IpcEvents.OPEN_PATH, settingsDir)}
                        size={ButtonProps.ButtonSizes.SMALL}
                        disabled={settingsDirPending}
                    >
                        Launch Directory
                    </Button>
                </Flex.Child>
                <Flex.Child>
                    <Button
                        onClick={() => VencordNative.ipc.invoke(IpcEvents.OPEN_PATH, settingsDir + "/quickCss.css")}
                        size={ButtonProps.ButtonSizes.SMALL}
                        disabled={settingsDir === "Loading..."}
                    >
                        Open QuickCSS File
                    </Button>
                </Flex.Child>
            </Flex>
            <Forms.FormTitle tag="h5">Settings</Forms.FormTitle>
            <Switch
                value={settings.unsafeRequire}
                onChange={v => settings.unsafeRequire = v}
                note="Enables VencordNative.require. Useful for testing, very bad for security. Leave this off unless you need it."
            >
                Enable Ensafe Require
            </Switch>
            <Forms.FormDivider />
            <Forms.FormTitle tag="h5">Plugins</Forms.FormTitle>
            {Object.values(Plugins).map(p => {
                const enabledDependants = depMap[p.name]?.filter(d => settings.plugins[d].enabled);
                const dependency = enabledDependants?.length;

                return (
                    <Switch
                        disabled={p.required || dependency}
                        key={p.name}
                        value={settings.plugins[p.name].enabled || p.required || dependency}
                        onChange={v => {
                            settings.plugins[p.name].enabled = v;
                            if (v) {
                                p.dependencies?.forEach(d => {
                                    settings.plugins[d].enabled = true;
                                    if (!Plugins[d].started && !stopPlugin) {
                                        // TODO show notification
                                        settings.plugins[p.name].enabled = false;
                                    }
                                });
                                if (!p.started && !startPlugin(p)) {
                                    // TODO show notification
                                }
                            } else {
                                if (p.started && !stopPlugin(p)) {
                                    // TODO show notification
                                }
                            }
                            if (p.patches) {
                                // TODO show notification
                            }
                        }}
                        note={p.description}
                        tooltipNote={
                            p.required ?
                                "This plugin is required. Thus you cannot disable it."
                                : dependency ?
                                    `${humanFriendlyJoin(enabledDependants)} ${enabledDependants.length === 1 ? "depends" : "depend"} on this plugin. Thus you cannot disable it.`
                                    : ""
                        }
                    >
                        {p.name}
                    </Switch>
                );
            })
            }
        </Forms.FormSection >
    );
});