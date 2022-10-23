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

import Plugins from "@plugins";

import { Settings, useSettings } from "../../api/settings";
import { startPlugin, stopPlugin } from "../../plugins";
import { Modals } from "../../utils";
import { ChangeList } from "../../utils/ChangeList";
import { classes, lazyWebpack } from "../../utils/misc";
import { Plugin } from "../../utils/types";
import { filters } from "../../webpack";
import { Alerts, Button, Forms, Margins, Parser, React, Switch, Text, TextInput, Toasts, Tooltip } from "../../webpack/common";
import ErrorBoundary from "../ErrorBoundary";
import { Flex } from "../Flex";
import PluginModal from "./PluginModal";
import * as styles from "./styles";

const Select = lazyWebpack(filters.byCode("optionClassName", "popoutPosition", "autoFocus", "maxVisibleItems"));
const InputStyles = lazyWebpack(filters.byProps(["inputDefault", "inputWrapper"]));

const CogWheel = lazyWebpack(filters.byCode("18.564C15.797 19.099 14.932 19.498 14 19.738V22H10V19.738C9.069"));
const InfoIcon = lazyWebpack(filters.byCode("4.4408921e-16 C4.4771525,-1.77635684e-15 4.4408921e-16"));

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

interface PluginCardProps extends React.HTMLProps<HTMLDivElement> {
    plugin: Plugin;
    disabled: boolean;
    onRestartNeeded(): void;
}

function PluginCard({ plugin, disabled, onRestartNeeded, onMouseEnter, onMouseLeave }: PluginCardProps) {
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
        if (plugin.patches) onRestartNeeded();
    }

    return (
        <Flex style={styles.PluginsGridItem} flexDirection="column" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
            <Switch
                onChange={toggleEnabled}
                disabled={disabled}
                value={isEnabled()}
                note={<Text variant="text-md/normal" style={{ height: 40, overflow: "hidden" }}>{plugin.description}</Text>}
                hideBorder={true}
            >
                <Flex style={{ marginTop: "auto", width: "100%", height: "100%", alignItems: "center" }}>
                    <Text variant="text-md/bold" style={{ flexGrow: "1" }}>{plugin.name}</Text>
                    <button role="switch" onClick={() => openModal()} style={styles.SettingsIcon} className="button-12Fmur">
                        {plugin.options ? <CogWheel /> : <InfoIcon width="24" height="24" />}
                    </button>
                </Flex>
            </Switch>
        </Flex>
    );
}

export default ErrorBoundary.wrap(function Settings() {
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

    function hasDependents(plugin: Plugin) {
        const enabledDependants = depMap[plugin.name]?.filter(d => settings.plugins[d].enabled);
        return !!enabledDependants?.length;
    }

    const sortedPlugins = React.useMemo(() => Object.values(Plugins)
        .sort((a, b) => a.name.localeCompare(b.name)), []);

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
                {sortedPlugins?.length ? sortedPlugins
                    .filter(a => !a.required && !dependencyCheck(a.name, depMap).length && pluginFilter(a))
                    .map(plugin => {
                        const enabledDependants = depMap[plugin.name]?.filter(d => settings.plugins[d].enabled);
                        const dependency = enabledDependants?.length;
                        return <PluginCard
                            onRestartNeeded={() => {
                                changes.handleChange(plugin.name);
                            }}
                            disabled={plugin.required || !!dependency}
                            plugin={plugin}
                        />;
                    })
                    : <Text variant="text-md/normal">No plugins meet search criteria.</Text>
                }
            </div>
            <Forms.FormDivider />
            <Forms.FormTitle tag="h5" className={classes(Margins.marginTop20, Margins.marginBottom8)}>
                Required Plugins
            </Forms.FormTitle>
            <div style={styles.PluginsGrid}>
                {sortedPlugins?.length ? sortedPlugins
                    .filter(a => a.required || dependencyCheck(a.name, depMap).length && pluginFilter(a))
                    .map(plugin => {
                        const enabledDependants = depMap[plugin.name]?.filter(d => settings.plugins[d].enabled);
                        const dependency = enabledDependants?.length;
                        const tooltipText = plugin.required
                            ? "This plugin is required for Vencord to function."
                            : makeDependencyList(dependencyCheck(plugin.name, depMap));
                        return <Tooltip text={tooltipText}>
                            {({ onMouseLeave, onMouseEnter }) => (
                                <PluginCard
                                    onMouseLeave={onMouseLeave}
                                    onMouseEnter={onMouseEnter}
                                    onRestartNeeded={() => {
                                        changes.handleChange(plugin.name);
                                    }}
                                    disabled={plugin.required || !!dependency}
                                    plugin={plugin}
                                />
                            )}
                        </Tooltip>;
                    })
                    : <Text variant="text-md/normal">No plugins meet search criteria.</Text>
                }
            </div>
        </Forms.FormSection >
    );
});

function makeDependencyList(deps: string[]) {
    return (
        <React.Fragment>
            <Forms.FormText>This plugin is required by:</Forms.FormText>
            {deps.map((dep: string) => <Forms.FormText style={{ margin: "0 auto" }}>{dep}</Forms.FormText>)}
        </React.Fragment>
    );
}

function dependencyCheck(pluginName: string, depMap: Record<string, string[]>): string[] {
    return depMap[pluginName]?.filter(d => Settings.plugins[d].enabled) || [];
}
