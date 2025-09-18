/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotice } from "@api/Notices";
import { classNameFactory } from "@api/Styles";
import { CogWheel, InfoIcon } from "@components/Icons";
import { AddonCard } from "@components/settings/AddonCard";
import { proxyLazy } from "@utils/lazy";
import { Logger } from "@utils/Logger";
import { classes, isObjectEmpty } from "@utils/misc";
import { Plugin } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { React, showToast, Toasts } from "@webpack/common";
import { Settings } from "Vencord";

import { PluginMeta } from "~plugins";

import { openPluginModal } from "./PluginModal";

const logger = new Logger("PluginCard");
const cl = classNameFactory("vc-plugins-");

// Avoid circular dependency
const { startDependenciesRecursive, startPlugin, stopPlugin, isPluginEnabled } = proxyLazy(() => require("plugins") as typeof import("plugins"));

export const ButtonClasses = findByPropsLazy("button", "disabled", "enabled");

interface PluginCardProps extends React.HTMLProps<HTMLDivElement> {
    plugin: Plugin;
    disabled: boolean;
    onRestartNeeded(name: string, key: string): void;
    isNew?: boolean;
}

export function PluginCard({ plugin, disabled, onRestartNeeded, onMouseEnter, onMouseLeave, isNew }: PluginCardProps) {
    const settings = Settings.plugins[plugin.name];
    const pluginMeta = PluginMeta[plugin.name];
    const isEquicordPlugin = pluginMeta?.folderName?.startsWith("src/equicordplugins/") ?? false;
    const isUserplugin = pluginMeta?.userPlugin ?? false;

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

        // if the plugin has patches, dont use stopPlugin/startPlugin. Wait for restart to apply changes.
        if (plugin.patches?.length) {
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

    const sourceBadge = isEquicordPlugin ? (
        <img
            src="https://equicord.org/assets/favicon.png"
            alt="Equicord"
            title="Equicord Plugin"
            style={{
                width: "20px",
                height: "20px",
                marginLeft: "8px",
                borderRadius: "2px"
            }}
        />
    ) : isUserplugin ? (
        <img
            src="https://equicord.org/assets/icons/userplugin.png"
            alt="Userplugin"
            title="Userplugin"
            style={{
                width: "20px",
                height: "20px",
                marginLeft: "8px",
                borderRadius: "2px"
            }}
        />
    ) : (
        <img
            src="https://vencord.dev/assets/favicon-dark.png"
            alt="Vencord"
            title="Vencord Plugin"
            style={{
                width: "20px",
                height: "20px",
                marginLeft: "8px",
                borderRadius: "2px"
            }}
        />
    );

    return (
        <AddonCard
            name={plugin.name}
            sourceBadge={sourceBadge}
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
                    className={classes(ButtonClasses.button, cl("info-button"))}
                >
                    {plugin.options && !isObjectEmpty(plugin.options)
                        ? <CogWheel className={cl("info-icon")} />
                        : <InfoIcon className={cl("info-icon")} />
                    }
                </button>
            } />
    );
}
