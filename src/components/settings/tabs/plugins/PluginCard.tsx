/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotice } from "@api/Notices";
import { CogWheel, InfoIcon, WarningIcon } from "@components/Icons";
import { AddonCard } from "@components/settings/AddonCard";
import { proxyLazy } from "@utils/lazy";
import { classes, isObjectEmpty } from "@utils/misc";
import { Plugin } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { React, showToast, Toasts, Tooltip } from "@webpack/common";
import { Settings } from "Vencord";

import { ExcludedPlugins } from "~plugins";

import { cl, logger } from ".";
import { openPluginModal } from "./PluginModal";

// Avoid circular dependency
const { startDependenciesRecursive, startPlugin, stopPlugin, isPluginEnabled } = proxyLazy(() => require("plugins") as typeof import("plugins"));

export const ButtonClasses = findByPropsLazy("button", "disabled", "enabled");

const ExcludedReasons: Record<"web" | "discordDesktop" | "vencordDesktop" | "desktop" | "dev", string> = {
    desktop: "Discord Desktop app or Vesktop",
    discordDesktop: "Discord Desktop app",
    vencordDesktop: "Vesktop app",
    web: "Vesktop app and the Web version of Discord",
    dev: "Developer version of Vencord"
};

interface PluginCardProps extends React.HTMLProps<HTMLDivElement> {
    plugin: Plugin;
    disabled: boolean;
    onRestartNeeded(name: string, key: string): void;
    isNew?: boolean;
    update?: () => void;
}

export function PluginCard({ plugin, disabled, onRestartNeeded, onMouseEnter, onMouseLeave, isNew, update }: PluginCardProps) {
    const settings = Settings.plugins[plugin.name];

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
                onRestartNeeded(plugin.name, wasEnabled ? "disabled" : "enabled");
                return;
            }
        }

        // if the plugin has patches, dont use stopPlugin/startPlugin. Wait for restart to apply changes.
        if (plugin.patches?.length) {
            settings.enabled = !wasEnabled;
            onRestartNeeded(plugin.name, wasEnabled ? "disabled" : "enabled");
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
        update?.();
    }

    return (
        <AddonCard
            name={plugin.name}
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

export function UnavailablePluginCard({ name, description, isMissing }: { name: string; description: string, isMissing: boolean; }) {
    const toolTipText = isMissing
        ? `${name} is only available on the ${ExcludedReasons[ExcludedPlugins[name]]}`
        : "This plugin is not on this version of Vencord. Try updating!";

    return description ? (
        <Tooltip text={toolTipText} key={name}>
            {({ onMouseLeave, onMouseEnter }) =>
                <AddonCard
                    name={name}
                    description={description || toolTipText}
                    enabled={false}
                    setEnabled={() => { }}
                    disabled={true}
                    onMouseEnter={onMouseEnter}
                    onMouseLeave={onMouseLeave}
                    infoButton={<WarningIcon />}
                />
            }
        </Tooltip>
    ) : (
        <AddonCard
            name={name}
            description={description || toolTipText}
            enabled={false}
            setEnabled={() => { }}
            disabled={true}
            infoButton={<WarningIcon />}
        />
    );
}
