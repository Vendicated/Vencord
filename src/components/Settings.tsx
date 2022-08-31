import { lazy, LazyComponent, useAwaiter } from "../utils/misc";
import { findByDisplayName, Forms } from '../webpack';
import Plugins from 'plugins';
import { useSettings } from "../api/settings";
import { findByProps } from '../webpack/index';
import IpcEvents from "../utils/IpcEvents";

// Lazy spam because this is ran before React is a thing. Todo: Fix that and clean this up lmao

const SwitchItem = LazyComponent<React.PropsWithChildren<{
    value: boolean;
    onChange: (v: boolean) => void;
    note?: string;
    tooltipNote?: string;
    disabled?: boolean;
}>>(() => findByDisplayName("SwitchItem").default);

const getButton = lazy(() => findByProps("ButtonLooks", "default"));
const Button = LazyComponent(() => getButton().default);
const getFlex = lazy(() => findByDisplayName("Flex"));
const Flex = LazyComponent(() => getFlex().default);
const FlexChild = LazyComponent(() => getFlex().default.Child);
const getMargins = lazy(() => findByProps("marginTop8", "marginBottom8"));

export default function Settings(props) {
    const settingsDir = useAwaiter(() => VencordNative.ipc.invoke(IpcEvents.GET_SETTINGS_DIR), "Loading...");
    const settings = useSettings();

    return (
        <Forms.FormSection tag="h1" title="Vencord">
            <Forms.FormText>SettingsDir: {settingsDir}</Forms.FormText>
            <Flex className={getMargins().marginTop8 + " " + getMargins().marginBottom8}>
                <FlexChild>
                    <Button
                        onClick={() => VencordNative.ipc.invoke(IpcEvents.OPEN_PATH, settingsDir)}
                        size={getButton().ButtonSizes.SMALL}
                        disabled={settingsDir === "Loading..."}
                    >
                        Launch Directory
                    </Button>
                </FlexChild>
                <FlexChild>
                    <Button
                        onClick={() => VencordNative.ipc.invoke(IpcEvents.OPEN_PATH, settingsDir + "/quickCss.css")}
                        size={getButton().ButtonSizes.SMALL}
                        disabled={settingsDir === "Loading..."}
                    >
                        Open QuickCSS File
                    </Button>
                </FlexChild>
            </Flex>
            <Forms.FormTitle tag="h5">Settings</Forms.FormTitle>
            <SwitchItem
                value={settings.unsafeRequire}
                onChange={v => settings.unsafeRequire = v}
                note="Enables VencordNative.require. Useful for testing, very bad for security. Leave this off unless you need it."
            >
                Enable Ensafe Require
            </SwitchItem>
            <Forms.FormDivider />
            <Forms.FormTitle tag="h5">Plugins</Forms.FormTitle>
            {Plugins.map(p => (
                <SwitchItem
                    disabled={p.required === true}
                    key={p.name}
                    value={settings.plugins[p.name].enabled}
                    onChange={v => {
                        settings.plugins[p.name].enabled = v;
                        if (v) {
                            p.dependencies?.forEach(d => {
                                settings.plugins[d].enabled = true;
                            });
                        }
                    }}
                    note={p.description}
                    tooltipNote={p.required ? "This plugin is required. Thus you cannot disable it." : undefined}
                >
                    {p.name}
                </SwitchItem>
            ))
            }
        </Forms.FormSection >
    );
}