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

import { registerCommand, unregisterCommand } from "@api/Commands";
import { addContextMenuPatch, removeContextMenuPatch } from "@api/ContextMenu";
import { Settings } from "@api/Settings";
import { Logger } from "@utils/Logger";
import { canonicalizeFind } from "@utils/patches";
import { type Patch, type Plugin, ReporterTestable, StartAt } from "@utils/types";
import type { FluxActionType } from "@vencord/discord-types";
import { FluxDispatcher } from "@webpack/common";

import Plugins from "~plugins";

import { traceFunction } from "../debug/Tracer";

const logger = new Logger("PluginManager", "#a6d189");

export const PMLogger = logger;
export const plugins = Plugins;
export const patches: Patch[] = [];

/** Whether we have subscribed to flux events of all the enabled plugins when FluxDispatcher was ready */
let enabledPluginsSubscribedFlux = false;
const subscribedFluxEventsPlugins = new Set<string>();

const pluginsValues = Object.values(Plugins);
const settings = Settings.plugins;

export function isPluginEnabled(pluginName: string) {
    return (
        Plugins[pluginName]?.required ||
        Plugins[pluginName]?.isDependency ||
        settings[pluginName]?.enabled
    ) ?? false;
}

export function addPatch(newPatch: Omit<Patch, "plugin">, pluginName: string) {
    const patch = newPatch as Patch;
    patch.plugin = pluginName;

    if (IS_REPORTER) {
        delete patch.predicate;
        delete patch.group;
    }

    canonicalizeFind(patch);
    if (!Array.isArray(patch.replacement)) {
        patch.replacement = [patch.replacement];
    }

    if (IS_REPORTER) {
        patch.replacement.forEach(r => {
            delete r.predicate;
        });
    }

    patches.push(patch);
}

function isReporterTestable(plugin: Plugin, part: ReporterTestable) {
    return plugin.reporterTestable == null
        ? true
        : (plugin.reporterTestable & part) === part;
}

// First round-trip to mark and force enable dependencies
//
// FIXME: might need to revisit this if there's ever nested (dependencies of dependencies) dependencies since this only
// goes for the top level and their children, but for now this works okay with the current API plugins
for (const p of pluginsValues) if (isPluginEnabled(p.name)) {
    p.dependencies?.forEach(d => {
        const dep = Plugins[d];

        if (!dep) {
            const error = new Error(`Plugin ${p.name} has unresolved dependency ${d}`);

            if (IS_DEV) {
                throw error;
            }

            logger.warn(error);
            return;
        }

        settings[d]!.enabled = true;
        dep.isDependency = true;
    });
}

for (const p of pluginsValues) {
    if (p.settings) {
        p.settings.pluginName = p.name;
        p.options ??= {};
        for (const [name, def] of Object.entries(p.settings.def)) {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            const checks = p.settings.checks?.[name];
            p.options[name] = { ...def, ...checks };
        }
    }

    if (p.patches && isPluginEnabled(p.name)) {
        if (!IS_REPORTER || isReporterTestable(p, ReporterTestable.Patches)) {
            for (const patch of p.patches) {
                addPatch(patch, p.name);
            }
        }
    }
}

export const startAllPlugins = traceFunction("startAllPlugins", function startAllPlugins(target: StartAt) {
    logger.info(`Starting plugins (stage ${target})`);
    for (const name in Plugins) {
        const plugin = Plugins[name]!;
        if (isPluginEnabled(name) && (!IS_REPORTER || isReporterTestable(plugin, ReporterTestable.Start))) {

            const startAt = plugin.startAt ?? StartAt.WebpackReady;
            if (startAt !== target) continue;

            startPlugin(plugin);
        }
    }
});

export function startDependenciesRecursive(plugin: Plugin) {
    let restartNeeded = false;
    const failures: string[] = [];

    plugin.dependencies?.forEach(depName => {
        if (!settings[depName]!.enabled) {
            const dep = Plugins[depName]!;
            startDependenciesRecursive(dep);

            // If the plugin has patches, don't start the plugin, just enable it.
            settings[depName]!.enabled = true;
            dep.isDependency = true;

            if (dep.patches) {
                logger.warn(`Enabling dependency ${depName} requires restart.`);
                restartNeeded = true;
                return;
            }

            const result = startPlugin(dep);
            if (!result) failures.push(depName);
        }
    });

    return { restartNeeded, failures };
}

export function subscribePluginFluxEvents(plugin: Plugin, fluxDispatcher: typeof FluxDispatcher) {
    if (plugin.flux && !subscribedFluxEventsPlugins.has(plugin.name) && (!IS_REPORTER || isReporterTestable(plugin, ReporterTestable.FluxActions))) {
        subscribedFluxEventsPlugins.add(plugin.name);

        logger.debug("Subscribing to Flux actions of plugin", plugin.name);
        for (const [action, handler] of Object.entries(plugin.flux)) {
            fluxDispatcher.subscribe(action as FluxActionType, handler);
        }
    }
}

export function unsubscribePluginFluxEvents(plugin: Plugin, fluxDispatcher: typeof FluxDispatcher) {
    if (plugin.flux) {
        subscribedFluxEventsPlugins.delete(plugin.name);

        logger.debug("Unsubscribing from Flux action of plugin", plugin.name);
        for (const [action, handler] of Object.entries(plugin.flux)) {
            fluxDispatcher.unsubscribe(action as FluxActionType, handler);
        }
    }
}

export function subscribeAllPluginsFluxEvents(fluxDispatcher: typeof FluxDispatcher) {
    enabledPluginsSubscribedFlux = true;

    for (const name in Plugins) {
        if (!isPluginEnabled(name)) continue;
        subscribePluginFluxEvents(Plugins[name]!, fluxDispatcher);
    }
}

export const startPlugin = traceFunction("startPlugin", function startPlugin(plugin: Plugin) {
    const { name, commands, contextMenus } = plugin;

    if (plugin.start) {
        logger.info("Starting plugin", name);
        if (plugin.started) {
            logger.warn(`${name} already started`);
            return false;
        }
        try {
            plugin.start();
        } catch (e) {
            logger.error(`Failed to start ${name}\n`, e);
            return false;
        }
    }

    plugin.started = true;

    if (commands?.length) {
        logger.debug("Registering commands of plugin", name);
        for (const cmd of commands) {
            try {
                registerCommand(cmd, name);
            } catch (e) {
                logger.error(`Failed to register command ${cmd.name}\n`, e);
                return false;
            }
        }
    }

    if (enabledPluginsSubscribedFlux) {
        subscribePluginFluxEvents(plugin, FluxDispatcher);
    }


    if (contextMenus) {
        logger.debug("Adding context menus patches of plugin", name);
        for (const navId in contextMenus) {
            addContextMenuPatch(navId, contextMenus[navId]!);
        }
    }

    return true;
}, p => `startPlugin ${p.name}`);

export const stopPlugin = traceFunction("stopPlugin", function stopPlugin(plugin: Plugin) {
    const { name, commands, contextMenus } = plugin;

    if (plugin.stop) {
        logger.info("Stopping plugin", name);
        if (!plugin.started) {
            logger.warn(`${name} already stopped`);
            return false;
        }
        try {
            plugin.stop();
        } catch (e) {
            logger.error(`Failed to stop ${name}\n`, e);
            return false;
        }
    }

    plugin.started = false;

    if (commands?.length) {
        logger.debug("Unregistering commands of plugin", name);
        for (const cmd of commands) {
            try {
                unregisterCommand(cmd.name);
            } catch (e) {
                logger.error(`Failed to unregister command ${cmd.name}\n`, e);
                return false;
            }
        }
    }

    unsubscribePluginFluxEvents(plugin, FluxDispatcher);

    if (contextMenus) {
        logger.debug("Removing context menus patches of plugin", name);
        for (const navId in contextMenus) {
            removeContextMenuPatch(navId, contextMenus[navId]!);
        }
    }

    return true;
}, p => `stopPlugin ${p.name}`);
