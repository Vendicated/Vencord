import { useAwaiter } from "../utils/misc";
import Plugins from 'plugins';
import { useSettings } from "../api/settings";
import IpcEvents from "../utils/IpcEvents";

import { Button, ButtonProps, Flex, Switch, Forms } from "../webpack/common";
import ErrorBoundary from "./ErrorBoundary";
import { startPlugin } from "../plugins";
import { stopPlugin } from '../plugins/index';

export default ErrorBoundary.wrap(function Settings(props) {
    const [settingsDir, , settingsDirPending] = useAwaiter(() => VencordNative.ipc.invoke<string>(IpcEvents.GET_SETTINGS_DIR), "Loading...");
    const settings = useSettings();

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
            {Plugins.map(p => (
                <Switch
                    disabled={p.required === true}
                    key={p.name}
                    value={settings.plugins[p.name].enabled}
                    onChange={v => {
                        settings.plugins[p.name].enabled = v;
                        if (v) {
                            p.dependencies?.forEach(d => {
                                // TODO: start every dependency
                                settings.plugins[d].enabled = true;
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
                    tooltipNote={p.required ? "This plugin is required. Thus you cannot disable it." : undefined}
                >
                    {p.name}
                </Switch>
            ))
            }
        </Forms.FormSection >
    );
});