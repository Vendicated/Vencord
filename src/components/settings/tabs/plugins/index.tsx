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
import { isPluginEnabled, stopPlugin } from "@api/PluginManager";
import { useSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { Card } from "@components/Card";
import { Divider } from "@components/Divider";
import ErrorBoundary from "@components/ErrorBoundary";
import { HeadingTertiary } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { SettingsTab } from "@components/settings";
import { debounce } from "@shared/debounce";
import { ChangeList } from "@utils/ChangeList";
import { classNameFactory } from "@utils/css";
import { isTruthy } from "@utils/guards";
import { Logger } from "@utils/Logger";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import { useAwaiter, useIntersection } from "@utils/react";
import { Alerts, lodash, Parser, React, Select, TextInput, Toasts, Tooltip, useCallback, useMemo, useState } from "@webpack/common";
import { JSX } from "react";

import Plugins, { ExcludedPlugins, PluginMeta } from "~plugins";

import { PluginCard } from "./PluginCard";
import { openWarningModal } from "./PluginModal";
import { StockPluginsCard, UserPluginsCard } from "./PluginStatCards";
import { UIElementsButton } from "./UIElements";

export const cl = classNameFactory("vc-plugins-");
export const logger = new Logger("PluginSettings", "#a6d189");

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

function ReloadRequiredCard({ required, enabledPlugins, openWarningModal, resetCheckAndDo }) {
    return (
        <Card className={classes(cl("info-card"), required && "vc-warning-card")}>
            {required ? (
                <>
                    <HeadingTertiary>Restart required!</HeadingTertiary>
                    <Paragraph className={cl("dep-text")}>
                        Restart now to apply new plugins and their settings
                    </Paragraph>
                    <Button variant="primary" className={cl("restart-button")} onClick={() => location.reload()}>
                        Restart
                    </Button>
                </>
            ) : (
                <>
                    <HeadingTertiary>Plugin Management</HeadingTertiary>
                    <Paragraph>Press the cog wheel or info icon to get more info on a plugin</Paragraph>
                    <Paragraph>Plugins with a cog wheel have settings you can modify!</Paragraph>
                </>
            )}
            {enabledPlugins.length > 0 && !required && (
                <Button
                    variant="secondary"
                    size="small"
                    className={"vc-plugins-disable-warning vc-modal-align-reset"}
                    onClick={() => {
                        return openWarningModal(null, undefined, false, enabledPlugins.length, resetCheckAndDo);
                    }}
                >
                    Disable All Plugins
                </Button>
            )}
        </Card>
    );
}

const enum SearchStatus {
    ALL,
    ENABLED,
    DISABLED,
    EQUICORD,
    VENCORD,
    NEW,
    USER_PLUGINS,
    API_PLUGINS
}

export const ExcludedReasons: Record<"web" | "discordDesktop" | "vesktop" | "equibop" | "desktop" | "dev", string> = {
    desktop: "Discord Desktop app or Vesktop/Equibop",
    discordDesktop: "Discord Desktop app",
    vesktop: "Vesktop/Equibop apps",
    equibop: "Vesktop/Equibop apps",
    web: "Vesktop/Equibop apps & Discord web",
    dev: "Developer version of Equicord"
};

function ExcludedPluginsList({ search }: { search: string; }) {
    const matchingExcludedPlugins = search
        ? Object.entries(ExcludedPlugins)
            .filter(([name]) => name.toLowerCase().includes(search))
        : [];

    return (
        <Paragraph className={Margins.top16}>
            {matchingExcludedPlugins.length
                ? <>
                    <Paragraph>Are you looking for:</Paragraph>
                    <ul>
                        {matchingExcludedPlugins.map(([name, reason]) => (
                            <li key={name}>
                                <b>{name}</b>: Only available on the {ExcludedReasons[reason]}
                            </li>
                        ))}
                    </ul>
                </>
                : "No plugins meet the search criteria."
            }
        </Paragraph>
    );
}

export default function PluginSettings() {
    const settings = useSettings();
    const changes = React.useMemo(() => new ChangeList<string>(), []);

    React.useEffect(() => {
        return () => {
            if (!changes.hasChanges) return;

            const allChanges = [...changes.getChanges()];
            const pluginNames = [...new Set(allChanges.map(s => s.split(":")[0]))];
            const maxDisplay = 15;
            const displayed = pluginNames.slice(0, maxDisplay);
            const remainingCount = pluginNames.length - displayed.length;

            Alerts.show({
                title: "Restart required",
                body: (
                    <div>
                        {displayed.map((s, i) => (
                            <span key={i}>
                                {i > 0 && ", "}
                                {Parser.parse("`" + s + "`")}
                            </span>
                        ))}
                        {remainingCount > 0 && <span> and {remainingCount} more</span>}
                    </div>
                ),
                confirmText: "Restart now",
                cancelText: "Later!",
                onConfirm: () => location.reload()
            });
        };
    }, []);

    const depMap = useMemo(() => {
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

    const sortedPlugins = useMemo(() => Object.values(Plugins)
        .sort((a, b) => a.name.localeCompare(b.name)), []);

    const hasUserPlugins = useMemo(() => !IS_STANDALONE && Object.values(PluginMeta).some(m => m.userPlugin), []);

    const [searchValue, setSearchValue] = useState({ value: "", status: SearchStatus.ALL });
    const [searchInput, setSearchInput] = useState("");

    const debouncedSetSearch = useMemo(
        () => debounce((query: string) => setSearchValue(prev => ({ ...prev, value: query })), 150),
        []
    );

    const search = searchValue.value.toLowerCase();
    const onSearch = useCallback((query: string) => {
        setSearchInput(query);
        debouncedSetSearch(query);
    }, [debouncedSetSearch]);
    const onStatusChange = useCallback((status: SearchStatus) => {
        setSearchValue(prev => ({ ...prev, status }));
    }, []);

    const pluginFilter = useCallback((plugin: typeof Plugins[keyof typeof Plugins], newPluginsSet: Set<string> | null) => {
        const { status } = searchValue;
        const enabled = isPluginEnabled(plugin.name);

        switch (status) {
            case SearchStatus.DISABLED:
                if (enabled) return false;
                break;
            case SearchStatus.ENABLED:
                if (!enabled) return false;
                break;
            case SearchStatus.EQUICORD:
                if (!PluginMeta[plugin.name].folderName.startsWith("src/equicordplugins/")) return false;
                break;
            case SearchStatus.VENCORD:
                if (!PluginMeta[plugin.name].folderName.startsWith("src/plugins/")) return false;
                break;
            case SearchStatus.NEW:
                if (!newPluginsSet?.has(plugin.name)) return false;
                break;
            case SearchStatus.USER_PLUGINS:
                if (!PluginMeta[plugin.name]?.userPlugin) return false;
                break;
            case SearchStatus.API_PLUGINS:
                if (!plugin.name.endsWith("API")) return false;
                break;
        }

        if (!search.length) return true;

        return (
            plugin.name.toLowerCase().includes(search.replace(/\s+/g, "")) ||
            plugin.description.toLowerCase().includes(search) ||
            plugin.tags?.some(t => t.toLowerCase().includes(search))
        );
    }, [searchValue, search]);

    const [newPluginsSet] = useAwaiter(() => DataStore.get("Vencord_existingPlugins").then((cachedPlugins: Record<string, number> | undefined) => {
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

        return lodash.isEqual(newPlugins, sortedPluginNames) ? null : new Set(newPlugins);
    }));

    const handleRestartNeeded = useCallback((name: string, key: string) => changes.handleChange(`${name}:${key}`), [changes]);

    const { plugins, requiredPlugins } = useMemo(() => {
        const plugins = [] as JSX.Element[];
        const requiredPlugins = [] as JSX.Element[];

        const showApi = searchValue.status === SearchStatus.API_PLUGINS;
        for (const p of sortedPlugins) {
            if (p.hidden || (!p.settings?.def && p.name.endsWith("API") && !showApi))
                continue;

            if (!pluginFilter(p, newPluginsSet)) continue;

            const isRequired = p.required || p.isDependency || depMap[p.name]?.some(d => settings.plugins[d].enabled);

            if (isRequired) {
                const tooltipText = p.required || !depMap[p.name]
                    ? "This plugin is required for Equicord to function."
                    : <PluginDependencyList deps={depMap[p.name]?.filter(d => settings.plugins[d].enabled)} />;

                requiredPlugins.push(
                    <Tooltip text={tooltipText} key={p.name}>
                        {({ onMouseLeave, onMouseEnter }) => (
                            <PluginCard
                                onMouseLeave={onMouseLeave}
                                onMouseEnter={onMouseEnter}
                                onRestartNeeded={handleRestartNeeded}
                                disabled={true}
                                plugin={p}
                            />
                        )}
                    </Tooltip>
                );
            } else {
                plugins.push(
                    <PluginCard
                        onRestartNeeded={handleRestartNeeded}
                        disabled={false}
                        plugin={p}
                        isNew={newPluginsSet?.has(p.name)}
                        key={p.name}
                    />
                );
            }
        }
        return { plugins, requiredPlugins };
    }, [sortedPlugins, searchValue, newPluginsSet, depMap, settings.plugins, pluginFilter, handleRestartNeeded]);

    function resetCheckAndDo() {
        let restartNeeded = false;

        for (const plugin of enabledPlugins) {
            const pluginSettings = settings.plugins[plugin];

            if (Plugins[plugin].patches?.length) {
                pluginSettings.enabled = false;
                changes.handleChange(plugin);
                restartNeeded = true;
                continue;
            }

            const result = stopPlugin(Plugins[plugin]);

            if (!result) {
                logger.error(`Error while stopping plugin ${plugin}`);
                showErrorToast(`Error while stopping plugin ${plugin}`);
                continue;
            }

            pluginSettings.enabled = false;
        }

        if (restartNeeded) {
            Alerts.show({
                title: "Restart Required",
                body: (
                    <>
                        <p style={{ textAlign: "center" }}>Some plugins require a restart to fully disable.</p>
                        <p style={{ textAlign: "center" }}>Would you like to restart now?</p>
                    </>
                ),
                confirmText: "Restart Now",
                cancelText: "Later",
                onConfirm: () => location.reload()
            });
        }
    }

    // Code directly taken from supportHelper.tsx
    const { totalStockPlugins, totalUserPlugins, enabledStockPlugins, enabledUserPlugins, enabledPlugins } = useMemo(() => {
        const isApiPlugin = (plugin: string) => plugin.endsWith("API") || Plugins[plugin].required;

        const totalPlugins = Object.keys(Plugins).filter(p => !isApiPlugin(p));
        const enabledPlugins = Object.keys(Plugins).filter(p => isPluginEnabled(p) && !isApiPlugin(p));

        const totalStockPlugins = totalPlugins.filter(p => !PluginMeta[p].userPlugin && !Plugins[p].hidden).length;
        const totalUserPlugins = totalPlugins.filter(p => PluginMeta[p].userPlugin).length;
        const enabledStockPlugins = enabledPlugins.filter(p => !PluginMeta[p].userPlugin).length;
        const enabledUserPlugins = enabledPlugins.filter(p => PluginMeta[p].userPlugin).length;
        return { totalStockPlugins, totalUserPlugins, enabledStockPlugins, enabledUserPlugins, enabledPlugins };
    }, [settings.plugins]);
    const pluginsToLoad = Math.min(36, plugins.length);
    const [visibleCount, setVisibleCount] = React.useState(pluginsToLoad);
    const loadMore = React.useCallback(() => {
        setVisibleCount(v => Math.min(v + pluginsToLoad, plugins.length));
    }, [plugins.length]);

    const dLoadMore = useMemo(() => debounce(loadMore, 100), [loadMore]);

    const [sentinelRef, isSentinelVisible] = useIntersection();
    React.useEffect(() => {
        if (isSentinelVisible && visibleCount < plugins.length) {
            dLoadMore();
        }
    }, [isSentinelVisible, visibleCount, plugins.length, dLoadMore]);

    const visiblePlugins = plugins.slice(0, visibleCount);

    return (
        <SettingsTab>
            <ReloadRequiredCard required={changes.hasChanges} enabledPlugins={enabledPlugins} openWarningModal={openWarningModal} resetCheckAndDo={resetCheckAndDo} />

            <div className={cl("stats-container")}>
                <StockPluginsCard
                    totalStockPlugins={totalStockPlugins}
                    enabledStockPlugins={enabledStockPlugins}
                />
                <UserPluginsCard
                    totalUserPlugins={totalUserPlugins}
                    enabledUserPlugins={enabledUserPlugins}
                />
            </div>

            <div className={cl("ui-elements")}>
                <UIElementsButton />
            </div>

            <HeadingTertiary className={classes(Margins.top20, Margins.bottom8)}>
                Filters
            </HeadingTertiary>

            <div className={classes(Margins.bottom20, cl("filter-controls"))}>
                <ErrorBoundary noop>
                    <TextInput autoFocus value={searchInput} placeholder="Search for a plugin..." onChange={onSearch} />
                </ErrorBoundary>
                <div>
                    <ErrorBoundary noop>
                        <Select
                            options={[
                                { label: "Show All", value: SearchStatus.ALL, default: true },
                                { label: "Show Enabled", value: SearchStatus.ENABLED },
                                { label: "Show Disabled", value: SearchStatus.DISABLED },
                                { label: "Show Equicord", value: SearchStatus.EQUICORD },
                                { label: "Show Vencord", value: SearchStatus.VENCORD },
                                { label: "Show New", value: SearchStatus.NEW },
                                hasUserPlugins && { label: "Show UserPlugins", value: SearchStatus.USER_PLUGINS },
                                { label: "Show API Plugins", value: SearchStatus.API_PLUGINS },
                            ].filter(isTruthy)}
                            serialize={String}
                            select={onStatusChange}
                            isSelected={v => v === searchValue.status}
                            closeOnSelect={true}
                        />
                    </ErrorBoundary>
                </div>
            </div>

            <HeadingTertiary className={Margins.top20}>Plugins</HeadingTertiary>

            {plugins.length || requiredPlugins.length
                ? (
                    <>
                        <div className={cl("grid")}>
                            {visiblePlugins.length
                                ? visiblePlugins
                                : <Paragraph>No plugins meet the search criteria.</Paragraph>
                            }
                        </div>
                        {visibleCount < plugins.length && (
                            <div ref={sentinelRef} style={{ height: 32 }} />
                        )}
                    </>
                )
                : <ExcludedPluginsList search={search} />
            }

            <Divider className={Margins.top20} />

            <HeadingTertiary className={classes(Margins.top20, Margins.bottom8)}>
                Required Plugins
            </HeadingTertiary>
            <div className={cl("grid")}>
                {requiredPlugins.length
                    ? requiredPlugins
                    : <Paragraph>No plugins meet the search criteria.</Paragraph>
                }
            </div>
        </SettingsTab >
    );
}

export function PluginDependencyList({ deps }: { deps: string[]; }) {
    return (
        <>
            <Paragraph>This plugin is required by:</Paragraph>
            {deps.map((dep: string) => <Paragraph key={dep} className={cl("dep-text")}>{dep}</Paragraph>)}
        </>
    );
}
