import { classes, humanFriendlyJoin, useAwaiter } from "../utils/misc";
import Plugins from 'plugins';
import { useSettings } from "../api/settings";
import IpcEvents from "../utils/IpcEvents";

import { Button, Switch, Forms, React, Margins, Toasts, Alerts, Parser } from "../webpack/common";
import ErrorBoundary from "./ErrorBoundary";
import { startPlugin } from "../plugins";
import { stopPlugin } from '../plugins/index';
import { Flex } from './Flex';
import { ChangeList } from '../utils/ChangeList';

function showErrorToast(message: string) {
    Toasts.show({
        message,
        type: Toasts.Type.FAILURE,
        id: Toasts.genId(),
        options: {
            position: Toasts.Position.BOTTOM
        }
    });
}

export default ErrorBoundary.wrap(function Settings() {
    const [settingsDir, , settingsDirPending] = useAwaiter(() => VencordNative.ipc.invoke<string>(IpcEvents.GET_SETTINGS_DIR), "Loading...");
    const settings = useSettings();
    const changes = React.useMemo(() => new ChangeList<string>, []);

    React.useEffect(() => {
        return () => void (changes.hasChanges && Alerts.show({
            title: "Restart required",
            body: (
                <>
                    <p>The following plugins require a restart:</p>
                    <div>{changes.map((s, i) => (
                        <>
                            {i > 0 && ", "}
                            {Parser.parse('`' + s + '`')}
                        </>
                    ))}</div>
                </>
            ),
            confirmText: "Restart now",
            cancelText: "Later!",
            onConfirm: () => location.reload()
        }));
    }, []);

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
            <Forms.FormTitle tag="h5">
                Settings
            </Forms.FormTitle>

            <Forms.FormText>
                SettingsDir: <code style={{ userSelect: 'text', cursor: 'text' }}>{settingsDir}</code>
            </Forms.FormText>

            <Flex className={classes(Margins.marginBottom20)}>
                <Button
                    onClick={() => window.DiscordNative.app.relaunch()}
                    size={Button.Sizes.SMALL}
                    color={Button.Colors.GREEN}
                >
                    Reload
                </Button>
                <Button
                    onClick={() => window.DiscordNative.fileManager.showItemInFolder(settingsDir)}
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
            <Forms.FormDivider />
            <Forms.FormTitle tag="h5">Settings</Forms.FormTitle>
            <Switch
                value={settings.useQuickCss}
                onChange={(v: boolean) => settings.useQuickCss = v}
                note="Enable QuickCSS"
            >
                Use QuickCss
            </Switch>
            <Switch
                value={settings.notifyAboutUpdates}
                onChange={(v: boolean) => settings.notifyAboutUpdates = v}
                note="Shows a Toast on StartUp"
            >
                Get notified about new Updates
            </Switch>
            <Switch
                value={settings.unsafeRequire}
                onChange={(v: boolean) => settings.unsafeRequire = v}
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
                                        settings.plugins[p.name].enabled = false;
                                        showErrorToast(`Failed to start dependency ${d}. Check the console for more info.`);
                                    }
                                });
                                if (!p.started && !startPlugin(p)) {
                                    showErrorToast(`Failed to start plugin ${p.name}. Check the console for more info.`);
                                }
                            } else {
                                if (p.started && !stopPlugin(p)) {
                                    showErrorToast(`Failed to stop plugin ${p.name}. Check the console for more info.`);
                                }
                            }
                            if (p.patches) changes.handleChange(p.name);
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
