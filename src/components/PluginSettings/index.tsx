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

import "./styles.css";

import * as DataStore from "@api/DataStore";
import { showNotice } from "@api/Notices";
import { useSettings } from "@api/settings";
import { classNameFactory } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { handleComponentFailed } from "@components/handleComponentFailed";
import { Badge } from "@components/PluginSettings/components";
import PluginModal from "@components/PluginSettings/PluginModal";
import { Switch } from "@components/Switch";
import { ChangeList } from "@utils/ChangeList";
import Logger from "@utils/Logger";
import { Margins } from "@utils/margins";
import { classes, LazyComponent, useAwaiter } from "@utils/misc";
import { openModalLazy } from "@utils/modal";
import { Plugin } from "@utils/types";
import { findByCode, findByPropsLazy } from "@webpack";
import { Alerts, Button, Card, Forms, Parser, React, Select, Text, TextInput, Toasts, Tooltip } from "@webpack/common";

import Plugins from "~plugins";

import { startDependenciesRecursive, startPlugin, stopPlugin } from "../../plugins";


const cl = classNameFactory("vc-plugins-");
const logger = new Logger("PluginSettings", "#a6d189");

const InputStyles = findByPropsLazy("inputDefault", "inputWrapper");
const ButtonClasses = findByPropsLazy("button", "disabled", "enabled");

const CogWheel = LazyComponent(() => findByCode("18.564C15.797 19.099 14.932 19.498 14 19.738V22H10V19.738C9.069"));
const InfoIcon = LazyComponent(() => findByCode("4.4408921e-16 C4.4771525,-1.77635684e-15 4.4408921e-16"));

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

function ReloadRequiredCard({ required }: { required: boolean; }) {
    return (
        <Card className={cl("info-card", { "restart-card": required })}>
            {required ? (
                <>
                    <Forms.FormTitle tag="h5">Restart required!</Forms.FormTitle>
                    <Forms.FormText className={cl("dep-text")}>
                        Restart now to apply new plugins and their settings
                    </Forms.FormText>
                    <Button color={Button.Colors.YELLOW} onClick={() => location.reload()}>
                        Restart
                    </Button>
                </>
            ) : (
                <>
                    <Forms.FormTitle tag="h5">Plugin Management</Forms.FormTitle>
                    <Forms.FormText>Press the cog wheel or info icon to get more info on a plugin</Forms.FormText>
                    <Forms.FormText>Plugins with a cog wheel have settings you can modify!</Forms.FormText>
                </>
            )}
        </Card>
    );
}

interface PluginCardProps extends React.HTMLProps<HTMLDivElement> {
    plugin: Plugin;
    disabled: boolean;
    onRestartNeeded(name: string): void;
    isNew?: boolean;
}

function PluginCard({ plugin, disabled, onRestartNeeded, onMouseEnter, onMouseLeave, isNew }: PluginCardProps) {
    const settings = useSettings([`plugins.${plugin.name}.enabled`]).plugins[plugin.name];

    const isEnabled = () => settings.enabled ?? false;

    function openModal() {
        openModalLazy(async () => {
            return modalProps => {
                return <PluginModal {...modalProps} plugin={plugin} onRestartNeeded={() => onRestartNeeded(plugin.name)} />;
            };
        });
    }

    function toggleEnabled() {
        const wasEnabled = isEnabled();

        // If we're enabling a plugin, make sure all deps are enabled recursively.
        if (!wasEnabled) {
            const { restartNeeded, failures } = startDependenciesRecursive(plugin);
            if (failures.length) {
                logger.error(`Failed to start dependencies for ${plugin.name}: ${failures.join(", ")}`);
                showNotice("Failed to start dependencies: " + failures.join(", "), "Close", () => null);
                return;
            } else if (restartNeeded) {
                // If any dependencies have patches, don't start the plugin yet.
                settings.enabled = true;
                onRestartNeeded(plugin.name);
                return;
            }
        }

        // if the plugin has patches, dont use stopPlugin/startPlugin. Wait for restart to apply changes.
        if (plugin.patches) {
            settings.enabled = !wasEnabled;
            onRestartNeeded(plugin.name);
            return;
        }

        // If the plugin is enabled, but hasn't been started, then we can just toggle it off.
        if (wasEnabled && !plugin.started) {
            settings.enabled = !wasEnabled;
            return;
        }

        const result = wasEnabled ? stopPlugin(plugin) : startPlugin(plugin);
        const action = wasEnabled ? "stop" : "start";

        if (!result) {
            logger.error(`Failed to ${action} plugin ${plugin.name}`);
            showErrorToast(`Failed to ${action} plugin: ${plugin.name}`);
            return;
        }

        settings.enabled = !wasEnabled;
    }

    return (
        <Flex className={cl("card", { "card-disabled": disabled })} flexDirection="column" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
            <div className={cl("card-header")}>
                <Text variant="text-md/bold" className={cl("name")}>
                    {plugin.name}{isNew && <Badge text="NEW" color="#ED4245" />}
                </Text>
                <button role="switch" onClick={() => openModal()} className={classes(ButtonClasses.button, cl("info-button"))}>
                    {plugin.options
                        ? <CogWheel />
                        : <InfoIcon width="24" height="24" />}
                </button>
                <Switch
                    checked={isEnabled()}
                    onChange={toggleEnabled}
                    disabled={disabled}
                />
            </div>
            <Text className={cl("note")} variant="text-sm/normal">{plugin.description}</Text>
        </Flex >
    );
}

enum SearchStatus {
    ALL,
    ENABLED,
    DISABLED
}

export default ErrorBoundary.wrap(function PluginSettings() {
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
        .sort((a, b) => a.name.localeCompare(b.name)), []);

    const [searchValue, setSearchValue] = React.useState({ value: "", status: SearchStatus.ALL });

    const onSearch = (query: string) => setSearchValue(prev => ({ ...prev, value: query }));
    const onStatusChange = (status: SearchStatus) => setSearchValue(prev => ({ ...prev, status }));

    const pluginFilter = (plugin: typeof Plugins[keyof typeof Plugins]) => {
        const enabled = settings.plugins[plugin.name]?.enabled;
        if (enabled && searchValue.status === SearchStatus.DISABLED) return false;
        if (!enabled && searchValue.status === SearchStatus.ENABLED) return false;
        if (!searchValue.value.length) return true;
        return (
            plugin.name.toLowerCase().includes(searchValue.value.toLowerCase()) ||
            plugin.description.toLowerCase().includes(searchValue.value.toLowerCase())
        );
    };

    const [newPlugins] = useAwaiter(() => DataStore.get("Vencord_existingPlugins").then((cachedPlugins: Record<string, number> | undefined) => {
        const now = Date.now() / 1000;
        const existingTimestamps: Record<string, number> = {};
        const sortedPluginNames = Object.values(sortedPlugins).map(plugin => plugin.name);

        const newPlugins: string[] = [];
        for (const { name: p } of sortedPlugins) {
            const time = existingTimestamps[p] = cachedPlugins?.[p] ?? now;
            if ((time + 60 * 60 * 24 * 2) > now) {
                newPlugins.push(p);
            }
        }
        DataStore.set("Vencord_existingPlugins", existingTimestamps);

        return window._.isEqual(newPlugins, sortedPluginNames) ? [] : newPlugins;
    }));

    type P = JSX.Element | JSX.Element[];
    let plugins: P, requiredPlugins: P;
    if (sortedPlugins?.length) {
        plugins = [];
        requiredPlugins = [];

        for (const p of sortedPlugins) {
            if (!pluginFilter(p)) continue;

            const isRequired = p.required || depMap[p.name]?.some(d => settings.plugins[d].enabled);

            if (isRequired) {
                const tooltipText = p.required
                    ? "This plugin is required for Vencord to function."
                    : makeDependencyList(depMap[p.name]?.filter(d => settings.plugins[d].enabled));

                requiredPlugins.push(
                    <Tooltip text={tooltipText} key={p.name}>
                        {({ onMouseLeave, onMouseEnter }) => (
                            <PluginCard
                                onMouseLeave={onMouseLeave}
                                onMouseEnter={onMouseEnter}
                                onRestartNeeded={name => changes.handleChange(name)}
                                disabled={true}
                                plugin={p}
                            />
                        )}
                    </Tooltip>
                );
            } else {
                plugins.push(
                    <PluginCard
                        onRestartNeeded={name => changes.handleChange(name)}
                        disabled={false}
                        plugin={p}
                        isNew={newPlugins?.includes(p.name)}
                        key={p.name}
                    />
                );
            }

        }
    } else {
        plugins = requiredPlugins = <Text variant="text-md/normal">No plugins meet search criteria.</Text>;
    }

    return (
        <Forms.FormSection className={Margins.top16}>
            <ReloadRequiredCard required={changes.hasChanges} />

            <Forms.FormTitle tag="h5" className={classes(Margins.top20, Margins.bottom8)}>
                Filters
            </Forms.FormTitle>

            <div className={cl("filter-controls")}>
                <TextInput autoFocus value={searchValue.value} placeholder="Search for a plugin..." onChange={onSearch} className={Margins.bottom20} />
                <div className={InputStyles.inputWrapper}>
                    <Select
                        className={InputStyles.inputDefault}
                        options={[
                            { label: "Show All", value: SearchStatus.ALL, default: true },
                            { label: "Show Enabled", value: SearchStatus.ENABLED },
                            { label: "Show Disabled", value: SearchStatus.DISABLED }
                        ]}
                        serialize={String}
                        select={onStatusChange}
                        isSelected={v => v === searchValue.status}
                        closeOnSelect={true}
                    />
                </div>
            </div>

            <Forms.FormTitle className={Margins.top20}>Plugins</Forms.FormTitle>

            <div className={cl("grid")}>
                {plugins}
            </div>

            <Forms.FormDivider className={Margins.top20} />

            <Forms.FormTitle tag="h5" className={classes(Margins.top20, Margins.bottom8)}>
                Required Plugins
            </Forms.FormTitle>
            <div className={cl("grid")}>
                {requiredPlugins}
            </div>
        </Forms.FormSection >
    );
}, {
    message: "Failed to render the Plugin Settings. If this persists, try using the installer to reinstall!",
    onError: handleComponentFailed,
});

function makeDependencyList(deps: string[]) {
    return (
        <React.Fragment>
            <Forms.FormText>This plugin is required by:</Forms.FormText>
            {deps.map((dep: string) => <Forms.FormText className={cl("dep-text")}>{dep}</Forms.FormText>)}
        </React.Fragment>
    );
}
