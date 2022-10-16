import { classes, humanFriendlyJoin, lazyWebpack, useAwaiter } from "../../utils/misc";
import Plugins from "plugins";
import { useSettings } from "../../api/settings";
import IpcEvents from "../../utils/IpcEvents";

import { Button, Switch, Forms, React, Margins, Toasts, Alerts, Parser, TextInput, Text, TextVariant } from "../../webpack/common";
import ErrorBoundary from "../ErrorBoundary";
import { startPlugin } from "../../plugins";
import { stopPlugin } from "../../plugins/index";
import { Flex } from "../Flex";
import { ChangeList } from "../../utils/ChangeList";
import * as styles from "./styles";
import { Modals } from "../../utils";
import PluginModal from "./PluginModal";
import { Plugin } from "../../utils/types";
import { filters } from "../../webpack";
import { ModalSize } from "../../utils/modal";

const Select = lazyWebpack(filters.byCode("optionClassName", "popoutPosition", "autoFocus", "maxVisibleItems"));
const InputStyles = lazyWebpack(filters.byProps(["inputDefault", "inputWrapper"]));

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

function PluginCard(props: { plugin: Plugin; disabled: boolean; onRestartNeeded(): void; }) {
    const { plugin, disabled, onRestartNeeded } = props;
    const settings = useSettings().plugins[plugin.name];

    function isEnabled() {
        return settings?.enabled || plugin.started;
    }

    function openModal() {
        Modals.openModalLazy(async () => {
            return modalProps => {
                return <PluginModal {...modalProps} plugin={plugin} onRestartNeeded={onRestartNeeded} />;
            };
        });
    }

    function toggleEnabled() {
        const enabled = isEnabled();
        const result = enabled ? stopPlugin(plugin) : startPlugin(plugin);
        const action = enabled ? "stop" : "start";
        if (!result) {
            showErrorToast(`Failed to ${action} plugin: ${plugin.name}`);
            return;
        }
        settings.enabled = !settings.enabled;
        if (plugin.patches) props.onRestartNeeded();
    }

    return (
        <Flex style={styles.PluginsGridItem} flexDirection="column" onClick={() => openModal()}>
            <Text variant="heading-md/bold">{plugin.name}</Text>
            <Text variant="text-md/normal" style={{ height: 40, overflow: "hidden" }}>{plugin.description}</Text>
            <Flex flexDirection="row" style={{ marginTop: "auto", marginLeft: "auto", gap: 10 }}>
                <Button color={Button.Colors.BRAND}>Settings</Button>
                <Button
                    onClick={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleEnabled();
                    }}
                    disabled={disabled}
                    color={isEnabled() ? Button.Colors.RED : Button.Colors.GREEN}
                >
                    {isEnabled() ? "Disable" : "Enable"}
                </Button>
            </Flex>
        </Flex>
    );
}

export default ErrorBoundary.wrap(function Settings() {
    const [settingsDir, , settingsDirPending] = useAwaiter(() => VencordNative.ipc.invoke<string>(IpcEvents.GET_SETTINGS_DIR), "Loading...");
    const settings = useSettings();
    const changes = React.useMemo(() => new ChangeList<string>(), []);

    React.useEffect(() => {
        return () => void (changes.hasChanges && Alerts.show({
            title: "Restart required",
            body: (
                <>
                    <p>The following plugins require a restart:</p>
                    <div>{changes.map((s, i) => (
                        <>
                            {i > 0 && ", "}
                            {Parser.parse("`" + s + "`")}
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

    const sortedPlugins = React.useMemo(() => Object.values(Plugins)
        .sort((a, b) => a.name.localeCompare(b.name))
        .sort((a, b) => a.required === b.required ? 0 : b.required ? -1 : 1), []);

    const [searchValue, setSearchValue] = React.useState({ value: "", status: "all" });

    const onSearch = (query: string) => setSearchValue(prev => ({ ...prev, value: query }));
    const onStatusChange = (status: string) => setSearchValue(prev => ({ ...prev, status }));

    const pluginFilter = (plugin: typeof Plugins[keyof typeof Plugins]) => {
        const showEnabled = searchValue.status === "enabled" || searchValue.status === "all";
        const showDisabled = searchValue.status === "disabled" || searchValue.status === "all";
        const enabled = settings.plugins[plugin.name]?.enabled || plugin.started;
        return (
            ((showEnabled && enabled) || (showDisabled && !enabled)) &&
            (
                plugin.name.toLowerCase().includes(searchValue.value.toLowerCase()) ||
                plugin.description.toLowerCase().includes(searchValue.value.toLowerCase())
            )
        );
    };

    return (
        <Forms.FormSection tag="h1" title="Vencord">
            <Forms.FormTitle tag="h5" className={classes(Margins.marginTop20, Margins.marginBottom8)}>
                Plugins
            </Forms.FormTitle>
            <div style={styles.FiltersBar}>
                <TextInput value={searchValue.value} placeholder={"Search for a plugin..."} onChange={onSearch} style={{ marginBottom: 24 }} />
                <div className={InputStyles.inputWrapper}>
                    <Select
                        className={InputStyles.inputDefault}
                        options={[
                            { label: "Show All", value: "all", default: true },
                            { label: "Show Enabled", value: "enabled" },
                            { label: "Show Disabled", value: "disabled" }
                        ]}
                        serialize={v => String(v)}
                        select={onStatusChange}
                        isSelected={v => v === searchValue.status}
                        closeOnSelect={true}
                    />
                </div>
            </div>

            <div style={styles.PluginsGrid}>
                {sortedPlugins
                    .filter(pluginFilter)
                    .map(plugin => {
                        const enabledDependants = depMap[plugin.name]?.filter(d => settings.plugins[d].enabled);
                        const dependency = enabledDependants?.length;

                        return <PluginCard
                            onRestartNeeded={() => {
                                if (plugin.patches) changes.handleChange(plugin.name);
                            }}
                            disabled={plugin.required || !!dependency}
                            plugin={plugin}
                        />;
                    })
                }
            </div>
        </Forms.FormSection >
    );
});
