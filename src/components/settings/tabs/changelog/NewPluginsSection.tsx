/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { Card } from "@components/Card";
import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { PluginCard } from "@components/settings/tabs/plugins/PluginCard";
import { ChangeList } from "@utils/ChangeList";
import { classNameFactory } from "@utils/css";
import { Margins } from "@utils/margins";
import { useForceUpdater } from "@utils/react";
import { React, Tooltip } from "@webpack/common";

import Plugins from "~plugins";

const cl = classNameFactory("vc-changelog-");

interface NewPluginsSectionProps {
    newPlugins: string[];
    onPluginToggle?: (pluginName: string, enabled: boolean) => void;
}

export function NewPluginsSection({
    newPlugins,
    onPluginToggle,
}: NewPluginsSectionProps) {
    const settings = useSettings();
    const changes = React.useMemo(() => new ChangeList<string>(), []);
    const forceUpdate = useForceUpdater();

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

    const mapPlugins = (array: string[]) =>
        array
            .map(pn => Plugins[pn])
            .filter(p => p && !p.hidden)
            .sort((a, b) => a.name.localeCompare(b.name));

    const sortedPlugins = React.useMemo(
        () => mapPlugins(newPlugins),
        [newPlugins],
    );

    if (sortedPlugins.length === 0) {
        return null;
    }

    const makeDependencyList = (deps: string[]) => {
        if (!deps) return null;
        return (
            <React.Fragment>
                <Paragraph>This plugin is required by:</Paragraph>
                {deps.map((dep: string) => (
                    <Paragraph key={dep} className="vc-changelog-dep-text">
                        {dep}
                    </Paragraph>
                ))}
            </React.Fragment>
        );
    };

    return (
        <div className={cl("new-plugins-section")}>
            <Heading className={Margins.bottom8}>
                New Plugins ({sortedPlugins.length})
            </Heading>

            <Paragraph className={Margins.bottom16}>
                The following plugins have been added in recent updates:
            </Paragraph>

            <div className={cl("new-plugins-grid")}>
                {sortedPlugins.map(plugin => {
                    const isRequired =
                        plugin.required ||
                        depMap[plugin.name]?.some(
                            d => settings.plugins[d].enabled,
                        ) ||
                        plugin.name.endsWith("API");
                    const tooltipText = plugin.required
                        ? "This plugin is required for Equicord to function."
                        : makeDependencyList(
                            depMap[plugin.name]?.filter(
                                d => settings.plugins[d].enabled,
                            ),
                        );

                    if (isRequired) {
                        return (
                            <Tooltip text={tooltipText} key={plugin.name}>
                                {({ onMouseLeave, onMouseEnter }) => (
                                    <Card
                                        className={cl(
                                            "new-plugin-card",
                                            "required",
                                        )}
                                    >
                                        <PluginCard
                                            onMouseLeave={onMouseLeave}
                                            onMouseEnter={onMouseEnter}
                                            onRestartNeeded={name => {
                                                changes.handleChange(name);
                                                forceUpdate();
                                            }}
                                            disabled={true}
                                            plugin={plugin}
                                            isNew={true}
                                        />
                                    </Card>
                                )}
                            </Tooltip>
                        );
                    }

                    return (
                        <Card
                            key={plugin.name}
                            className={cl("new-plugin-card")}
                        >
                            <PluginCard
                                onRestartNeeded={name => {
                                    changes.handleChange(name);
                                    forceUpdate();
                                }}
                                disabled={false}
                                plugin={plugin}
                                isNew={true}
                            />
                        </Card>
                    );
                })}
            </div>

            {changes.hasChanges && (
                <div className={cl("restart-notice")}>
                    <Tooltip
                        text={
                            <>
                                The following plugins require a restart:
                                <div className={Margins.bottom8} />
                                <ul>
                                    {changes.map(p => (
                                        <li key={p}>{p}</li>
                                    ))}
                                </ul>
                            </>
                        }
                    >
                        {tooltipProps => (
                            <Button
                                {...tooltipProps}
                                variant="link"
                                size="small"
                                onClick={() => location.reload()}
                                className={Margins.top16}
                            >
                                Restart Required
                            </Button>
                        )}
                    </Tooltip>
                </div>
            )}
        </div>
    );
}

interface NewPluginsCompactProps {
    newPlugins: string[];
    maxDisplay?: number;
}

function CompactPluginCard({
    pluginName,
    depMap,
    settings,
}: {
    pluginName: string;
    depMap: Record<string, string[]>;
    settings: any;
}) {
    const plugin = Plugins[pluginName];
    if (!plugin || plugin.hidden) return null;

    const isRequired =
        plugin.required ||
        depMap[plugin.name]?.some(d => settings.plugins[d].enabled);

    const tooltipText = plugin.required
        ? "This plugin is required for Equicord to function."
        : depMap[plugin.name]?.length > 0
            ? `This plugin is required by: ${depMap[plugin.name]
                ?.filter(d => settings.plugins[d].enabled)
                .join(", ")}`
            : null;

    return (
        <div className={`vc-changelog-entry ${isRequired ? "required" : ""}`}>
            <div className="vc-changelog-entry-header">
                <span className="vc-changelog-entry-hash">
                    {plugin.name}
                    {isRequired && " *"}
                </span>
                <span className="vc-changelog-entry-author">
                    {plugin.authors?.[0]?.name || "Unknown"}
                </span>
            </div>
            <div className="vc-changelog-entry-message">
                {plugin.description || "No description available"}
            </div>
            {tooltipText && (
                <div className="vc-changelog-dep-text">{tooltipText}</div>
            )}
        </div>
    );
}

export function NewPluginsCompact({
    newPlugins,
    maxDisplay = 20,
}: NewPluginsCompactProps) {
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

    if (newPlugins.length === 0) {
        return null;
    }

    const displayPlugins = newPlugins.slice(0, maxDisplay);
    const hasMore = newPlugins.length > maxDisplay;

    return (
        <div className={cl("new-plugins-compact")}>
            <div className="vc-changelog-plugins-list">
                {displayPlugins.map(pluginName => (
                    <CompactPluginCard
                        key={pluginName}
                        pluginName={pluginName}
                        depMap={depMap}
                        settings={settings}
                    />
                ))}

                {hasMore && (
                    <div className="vc-changelog-entry">
                        <div className="vc-changelog-entry-message">
                            +{newPlugins.length - maxDisplay} more plugins
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
