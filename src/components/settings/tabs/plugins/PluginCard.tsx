/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotice } from "@api/Notices";
import { isPluginEnabled, pluginRequiresRestart, startDependenciesRecursive, startPlugin, stopPlugin } from "@api/PluginManager";
import { CogWheel, InfoIcon } from "@components/Icons";
import { AddonCard } from "@components/settings/AddonCard";
import { classNameFactory } from "@utils/css";
import { Logger } from "@utils/Logger";
import { OptionType, Plugin } from "@utils/types";
import { React, showToast, Toasts } from "@webpack/common";
import { Settings } from "Vencord";

import { PluginMeta } from "~plugins";

import { openPluginModal } from "./PluginModal";

const logger = new Logger("PluginCard");
const cl = classNameFactory("vc-plugins-");
interface PluginCardProps extends React.HTMLProps<HTMLDivElement> {
    plugin: Plugin;
    disabled?: boolean;
    onRestartNeeded(name: string, key: string): void;
    isNew?: boolean;
    onMouseEnter?: React.MouseEventHandler<HTMLDivElement>;
    onMouseLeave?: React.MouseEventHandler<HTMLDivElement>;
}

export function PluginCard({ plugin, disabled, onRestartNeeded, onMouseEnter, onMouseLeave, isNew }: PluginCardProps) {
    const settings = Settings.plugins[plugin.name];
    const pluginMeta = PluginMeta[plugin.name];
    const isEquicordPlugin = pluginMeta.folderName.startsWith("src/equicordplugins/") ?? false;
    const isVencordPlugin = pluginMeta.folderName.startsWith("src/plugins/") ?? false;
    const isUserPlugin = pluginMeta?.userPlugin ?? false;
    const isModifiedPlugin = plugin.isModified ?? false;

    const isEnabled = () => isPluginEnabled(plugin.name);

    function toggleEnabled() {
        const wasEnabled = isEnabled();

        // If we're enabling a plugin, make sure all deps are enabled recursively.
        if (!wasEnabled) {
            const { restartNeeded, failures } = startDependenciesRecursive(plugin);

            if (failures.length) {
                logger.error(`Failed to start dependencies for ${plugin.name}: ${failures.join(", ")}`);
                showNotice("Failed to start dependencies: " + failures.join(", "), "Close", () => null);
                return;
            }

            if (restartNeeded) {
                // If any dependencies have patches, don't start the plugin yet.
                settings.enabled = true;
                onRestartNeeded(plugin.name, "enabled");
                return;
            }
        }

        // if the plugin requires a restart, don't use stopPlugin/startPlugin. Wait for restart to apply changes.
        if (pluginRequiresRestart(plugin)) {
            settings.enabled = !wasEnabled;
            onRestartNeeded(plugin.name, "enabled");
            return;
        }

        // If the plugin is enabled, but hasn't been started, then we can just toggle it off.
        if (wasEnabled && !plugin.started) {
            settings.enabled = !wasEnabled;
            return;
        }

        const result = wasEnabled ? stopPlugin(plugin) : startPlugin(plugin);

        if (!result) {
            settings.enabled = false;

            const msg = `Error while ${wasEnabled ? "stopping" : "starting"} plugin ${plugin.name}`;
            showToast(msg, Toasts.Type.FAILURE, {
                position: Toasts.Position.BOTTOM,
            });

            return;
        }

        settings.enabled = !wasEnabled;
    }

    const pluginInfo = [
        {
            condition: isModifiedPlugin,
            src: "https://equicord.org/assets/icons/equicord/modified.png",
            alt: "Modified",
            title: "Modified Vencord Plugin"
        },
        {
            condition: isEquicordPlugin,
            src: "https://equicord.org/assets/favicon.png",
            alt: "Equicord",
            title: "Equicord Plugin"
        },
        {
            condition: isVencordPlugin,
            src: "https://equicord.org/assets/icons/vencord/icon-light.png",
            alt: "Vencord",
            title: "Vencord Plugin"
        },
        {
            condition: isUserPlugin,
            src: "https://equicord.org/assets/icons/misc/userplugin.png",
            alt: "User",
            title: "User Plugin"
        }
    ];

    const pluginDetails = pluginInfo.find(p => p.condition);

    const sourceBadge = pluginDetails ? (
        <img
            src={pluginDetails.src}
            alt={pluginDetails.alt}
            className={cl("source")}
        />
    ) : null;

    const tooltip = pluginDetails?.title || "Unknown Plugin";

    return (
        <AddonCard
            name={plugin.name}
            sourceBadge={sourceBadge}
            tooltip={tooltip}
            description={plugin.description}
            isNew={isNew}
            enabled={isEnabled()}
            setEnabled={toggleEnabled}
            disabled={disabled}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            infoButton={
                <button
                    role="switch"
                    onClick={() => openPluginModal(plugin, onRestartNeeded)}
                    className={cl("info-button")}
                >
                    {plugin.settings?.def && Object.values(plugin.settings.def).some(s => s.type !== OptionType.CUSTOM && !s.hidden)
                        ? <CogWheel className={cl("info-icon")} />
                        : <InfoIcon className={cl("info-icon")} />
                    }
                </button>
            } />
    );
}
