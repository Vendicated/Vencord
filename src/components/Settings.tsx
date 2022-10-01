import { classes, humanFriendlyJoin, lazy, useAwaiter } from "../utils/misc";
import Plugins from 'plugins';
import { useSettings } from "../api/settings";
import IpcEvents from "../utils/IpcEvents";

import { Button, Switch, Forms, React, Margins } from "../webpack/common";
import ErrorBoundary from "./ErrorBoundary";
import { startPlugin } from "../plugins";
import { stopPlugin } from '../plugins/index';
import { Flex } from './Flex';
import { isOutdated } from "../utils/updater";
import { Updater } from "./Updater";

export default ErrorBoundary.wrap(function Settings(props) {
    const [settingsDir, , settingsDirPending] = useAwaiter(() => VencordNative.ipc.invoke<string>(IpcEvents.GET_SETTINGS_DIR), "Loading...");
    const [outdated, setOutdated] = React.useState(isOutdated);
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

    const sortedPlugins = React.useMemo(() => Object.values(Plugins).sort((a, b) => a.name.localeCompare(b.name)), []);

    return (
        <Forms.FormSection tag="h1" title="Vencord">
            {outdated && (
                <>
                    <Forms.FormTitle tag="h5">Updater</Forms.FormTitle>
                    <Updater setIsOutdated={setOutdated} />
                </>
            )}

            <Forms.FormDivider />

            <Forms.FormTitle tag="h5" className={outdated ? `${Margins.marginTop20} ${Margins.marginBottom8}` : ""}>
                Settings
            </Forms.FormTitle>

            <Forms.FormText>
                SettingsDir: {settingsDir}
            </Forms.FormText>

            <Flex className={classes(Margins.marginBottom20)}>
                <Button
                    onClick={() => VencordNative.ipc.invoke(IpcEvents.OPEN_PATH, settingsDir)}
                    size={Button.Sizes.SMALL}
                    disabled={settingsDirPending}
                >
                    Launch Directory
                </Button>
                <Button
                    onClick={() => VencordNative.ipc.invoke(IpcEvents.OPEN_PATH, settingsDir, "quickCss.css")}
                    size={Button.Sizes.SMALL}
                    disabled={settingsDir === "Loading..."}
                >
                    Open QuickCSS File
                </Button>
            </Flex>

            <Switch
                value={settings.useQuickCss}
                onChange={v => settings.useQuickCss = v}
                note="Enable QuickCss"
            >
                Use QuickCss
            </Switch>
            <Switch
                value={settings.notifyAboutUpdates}
                onChange={v => settings.notifyAboutUpdates = v}
                note="Shows a Toast on StartUp"
            >
                Get notified about new Updates
            </Switch>
            <Switch
                value={settings.unsafeRequire}
                onChange={v => settings.unsafeRequire = v}
                note="Enables VencordNative.require. Useful for testing, very bad for security. Leave this off unless you need it."
            >
                Enable Unsafe Require
            </Switch>

            <Forms.FormDivider />

            <Forms.FormTitle tag="h5" className={classes(Margins.marginTop20, Margins.marginBottom8)}>
                Plugins
            </Forms.FormTitle>

            {sortedPlugins.map(p => {
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
                                    : null
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
