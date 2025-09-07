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
import { classNameFactory } from "@api/Styles";
import { SettingsTab, wrapTab } from "@components/settings/tabs";
import { ChangeList } from "@utils/ChangeList";
import { Logger } from "@utils/Logger";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import { useAwaiter, useCleanupEffect } from "@utils/react";
import { Plugin } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { Alerts, Button, Card, Forms, lodash, Parser, React, Select, Text, TextInput, Tooltip, useMemo, useState } from "@webpack/common";
import { JSX } from "react";

import Plugins, { ExcludedPlugins } from "~plugins";

import { PluginCard, UnavailablePluginCard } from "./PluginCard";

export const cl = classNameFactory("vc-plugins-");
export const logger = new Logger("PluginSettings", "#a6d189");

const InputStyles = findByPropsLazy("inputWrapper", "inputError", "error");

function ReloadRequiredCard({ required }: { required: boolean; }) {
    return (
        <Card className={classes(cl("info-card"), required && "vc-warning-card")}>
            {required
                ? (
                    <>
                        <Forms.FormTitle tag="h5">Restart required!</Forms.FormTitle>
                        <Forms.FormText className={cl("dep-text")}>
                            Restart now to apply new plugins and their settings
                        </Forms.FormText>
                        <Button onClick={() => location.reload()} className={cl("restart-button")}>
                            Restart
                        </Button>
                    </>
                )
                : (
                    <>
                        <Forms.FormTitle tag="h5">Plugin Management</Forms.FormTitle>
                        <Forms.FormText>Press the cog wheel or info icon to get more info on a plugin</Forms.FormText>
                        <Forms.FormText>Plugins with a cog wheel have settings you can modify!</Forms.FormText>
                    </>
                )}
        </Card>
    );
}

const enum SearchStatus {
    ALL,
    ENABLED,
    DISABLED,
    NEW
}


function ExcludedPluginsList({ search }: { search: string; }) {
    const matchingExcludedPlugins = Object.keys(ExcludedPlugins)
        .filter(name => name.toLowerCase().includes(search));

    return matchingExcludedPlugins.length ? matchingExcludedPlugins.map(name => (
        <UnavailablePluginCard
            name={name}
            description=""
            key={name}
            isMissing={true}
        />
    )) : (
        <Text variant="text-md/normal" className={Margins.top16}>
            No plugins meet the search criteria.
        </Text>
    );
}

export const showRestartAlert = (body: React.ReactNode) => Alerts.show({
    title: "Restart required",
    body,
    confirmText: "Restart now",
    cancelText: "Later!",
    onConfirm: () => location.reload()
});

const depMap: Record<string, string[]> = {};
for (const plugin in Plugins) {
    const deps = Plugins[plugin].dependencies;
    if (deps) {
        for (const dep of deps) {
            depMap[dep] ??= [];
            depMap[dep].push(plugin);
        }
    }
}

export function isPluginRequired(plugin: Plugin) {
    const dependents = depMap[plugin.name]?.filter(d => Vencord.Plugins.isPluginEnabled(d)) ?? [];
    return {
        status: plugin.required || dependents.length > 0,
        dependents
    };
}

interface PluginCardProps {
    plugin: Plugin;
    onRestartNeeded: (name: string, key: string) => void;
    key: string;
    required: { status: boolean; dependents: string[]; };
    update?: () => void;
    isNew?: boolean;
}

export function MakePluginCard({ plugin, onRestartNeeded, update, key, isNew, required: required }: PluginCardProps) {
    return required.status ? (
        <Tooltip text={required.dependents.length ? makeDependencyList(required.dependents) : "This plugin is required for Vencord to function."} key={plugin.name}>
            {({ onMouseLeave, onMouseEnter }) =>
                <PluginCard
                    onMouseLeave={onMouseLeave}
                    onMouseEnter={onMouseEnter}
                    onRestartNeeded={onRestartNeeded}
                    disabled={true}
                    update={update}
                    plugin={plugin}
                    isNew={isNew}
                    key={key}
                />
            }
        </Tooltip>
    ) : (
        <PluginCard
            onRestartNeeded={onRestartNeeded}
            disabled={false}
            update={update}
            plugin={plugin}
            isNew={isNew}
            key={key}
        />
    );
}


function PluginSettings() {
    const changes = useMemo(() => new ChangeList<string>(), []);

    useCleanupEffect(() => {
        if (changes.hasChanges)
            showRestartAlert(
                (
                    <>
                        <p>The following plugins require a restart:</p>
                        <div>{changes.map((s, i) => (
                            <>
                                {i > 0 && ", "}
                                {Parser.parse("`" + s.split(".")[0] + "`")}
                            </>
                        ))}</div>
                    </>
                )
            );
    }, []);

    const sortedPlugins = useMemo(() =>
        Object.values(Plugins).sort((a, b) => a.name.localeCompare(b.name)),
        []
    );

    const [searchValue, setSearchValue] = useState({ value: "", status: SearchStatus.ALL });

    const search = searchValue.value.toLowerCase();
    const onSearch = (query: string) => setSearchValue(prev => ({ ...prev, value: query }));
    const onStatusChange = (status: SearchStatus) => setSearchValue(prev => ({ ...prev, status }));

    const pluginFilter = (plugin: typeof Plugins[keyof typeof Plugins]) => {
        const { status } = searchValue;
        const enabled = Vencord.Plugins.isPluginEnabled(plugin.name);

        switch (status) {
            case SearchStatus.DISABLED:
                if (enabled) return false;
                break;
            case SearchStatus.ENABLED:
                if (!enabled) return false;
                break;
            case SearchStatus.NEW:
                if (!newPlugins?.includes(plugin.name)) return false;
                break;
        }

        if (!search.length) return true;

        return (
            plugin.name.toLowerCase().includes(search) ||
            plugin.description.toLowerCase().includes(search) ||
            plugin.tags?.some(t => t.toLowerCase().includes(search))
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

        return lodash.isEqual(newPlugins, sortedPluginNames) ? [] : newPlugins;
    }));

    const plugins = [] as JSX.Element[];
    const requiredPlugins = [] as JSX.Element[];

    const showApi = searchValue.value.includes("API");
    for (const p of sortedPlugins) {
        if (p.hidden || (!p.options && p.name.endsWith("API") && !showApi))
            continue;

        if (!pluginFilter(p)) continue;

        const onRestartNeeded = (name: string, key: string) => changes.handleChange(`${name}.${key}`);
        const required = isPluginRequired(p);

        const card = MakePluginCard({
            plugin: p,
            onRestartNeeded,
            isNew: newPlugins?.includes(p.name),
            required,
            key: p.name
        });

        (required.status ? requiredPlugins : plugins).push(card);
    }

    return (
        <SettingsTab title="Plugins">
            <ReloadRequiredCard required={changes.hasChanges} />

            <Forms.FormTitle tag="h5" className={classes(Margins.top20, Margins.bottom8)}>
                Filters
            </Forms.FormTitle>

            <div className={classes(Margins.bottom20, cl("filter-controls"))}>
                <TextInput autoFocus value={searchValue.value} placeholder="Search for a plugin..." onChange={onSearch} />
                <div className={InputStyles.inputWrapper}>
                    <Select
                        options={[
                            { label: "Show All", value: SearchStatus.ALL, default: true },
                            { label: "Show Enabled", value: SearchStatus.ENABLED },
                            { label: "Show Disabled", value: SearchStatus.DISABLED },
                            { label: "Show New", value: SearchStatus.NEW }
                        ]}
                        serialize={String}
                        select={onStatusChange}
                        isSelected={v => v === searchValue.status}
                        closeOnSelect={true}
                    />
                </div>
            </div>

            <Forms.FormTitle className={Margins.top20}>Plugins</Forms.FormTitle>

            {plugins.length || requiredPlugins.length
                ? (
                    <div className={cl("grid")}>
                        {plugins.length
                            ? plugins
                            : <Text variant="text-md/normal">No plugins meet the search criteria.</Text>
                        }
                    </div>
                )
                : (
                    <div className={cl("unavailable-grid")}>
                        <ExcludedPluginsList search={search} />
                    </div>
                )
            }


            <Forms.FormDivider className={Margins.top20} />

            <Forms.FormTitle tag="h5" className={classes(Margins.top20, Margins.bottom8)}>
                Required Plugins
            </Forms.FormTitle>
            <div className={cl("grid")}>
                {requiredPlugins.length
                    ? requiredPlugins
                    : <Text variant="text-md/normal">No plugins meet the search criteria.</Text>
                }
            </div>
        </SettingsTab >
    );
}

function makeDependencyList(deps: string[]) {
    return (
        <>
            <Forms.FormText>This plugin is required by:</Forms.FormText>
            {deps.map((dep: string) => <Forms.FormText key={dep} className={cl("dep-text")}>{dep}</Forms.FormText>)}
        </>
    );
}

export default wrapTab(PluginSettings, "Plugins");
