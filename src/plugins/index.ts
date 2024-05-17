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
import { Settings } from "@api/settings";
import Logger from "@utils/Logger";
import { Patch, Plugin } from "@utils/types";

import Plugins from "~plugins";

import { traceFunction } from "../debug/Tracer";

const logger = new Logger("PluginManager", "#a6d189");

export const PMLogger = logger;
export const plugins = Plugins;
export const patches = [] as Patch[];

const settings = Settings.plugins;

export function isPluginEnabled(p: string) {
    return (
        Plugins[p]?.required ||
        Plugins[p]?.isDependency ||
        settings[p]?.enabled
    ) ?? false;
}

const pluginsValues = Object.values(Plugins);

// First roundtrip to mark and force enable dependencies (only for enabled plugins)
//
// FIXME: might need to revisit this if there's ever nested (dependencies of dependencies) dependencies since this only
// goes for the top level and their children, but for now this works okay with the current API plugins
for (const p of pluginsValues) if (settings[p.name]?.enabled) {
    p.dependencies?.forEach(d => {
        const dep = Plugins[d];
        if (dep) {
            settings[d].enabled = true;
            dep.isDependency = true;
        }
        else {
            const error = new Error(`Plugin ${p.name} has unresolved dependency ${d}`);
            if (IS_DEV)
                throw error;
            logger.warn(error);
        }
    });
}

for (const p of pluginsValues) {
    if (p.settings) {
        p.settings.pluginName = p.name;
        p.options ??= {};
        for (const [name, def] of Object.entries(p.settings.def)) {
            const checks = p.settings.checks?.[name];
            p.options[name] = { ...def, ...checks };
        }
    }

    if (p.patches && isPluginEnabled(p.name)) {
        for (const patch of p.patches) {
            patch.plugin = p.name;
            if (!Array.isArray(patch.replacement))
                patch.replacement = [patch.replacement];
            patches.push(patch);
        }
    }
}

export const startAllPlugins = traceFunction("startAllPlugins", function startAllPlugins() {
    for (const name in Plugins)
        if (isPluginEnabled(name)) {
            startPlugin(Plugins[name]);
        }
});

export function startDependenciesRecursive(p: Plugin) {
    let restartNeeded = false;
    const failures: string[] = [];
    p.dependencies?.forEach(dep => {
        if (!Settings.plugins[dep].enabled) {
            startDependenciesRecursive(Plugins[dep]);
            // If the plugin has patches, don't start the plugin, just enable it.
            if (Plugins[dep].patches) {
                logger.warn(`Enabling dependency ${dep} requires restart.`);
                Settings.plugins[dep].enabled = true;
                restartNeeded = true;
                return;
            }
            const result = startPlugin(Plugins[dep]);
            if (!result) failures.push(dep);
        }
    });
    return { restartNeeded, failures };
}

export const startPlugin = traceFunction("startPlugin", function startPlugin(p: Plugin) {
    if (p.start) {
        logger.info("Starting plugin", p.name);
        if (p.started) {
            logger.warn(`${p.name} already started`);
            return false;
        }
        try {
            p.start();
            p.started = true;
        } catch (e) {
            logger.error(`Failed to start ${p.name}\n`, e);
            return false;
        }
    }

    if (p.commands?.length) {
        logger.info("Registering commands of plugin", p.name);
        for (const cmd of p.commands) {
            try {
                registerCommand(cmd, p.name);
            } catch (e) {
                logger.error(`Failed to register command ${cmd.name}\n`, e);
                return false;
            }
        }

    }

    return true;
}, p => `startPlugin ${p.name}`);

export const stopPlugin = traceFunction("stopPlugin", function stopPlugin(p: Plugin) {
    if (p.stop) {
        logger.info("Stopping plugin", p.name);
        if (!p.started) {
            logger.warn(`${p.name} already stopped`);
            return false;
        }
        try {
            p.stop();
            p.started = false;
        } catch (e) {
            logger.error(`Failed to stop ${p.name}\n`, e);
            return false;
        }
    }

    if (p.commands?.length) {
        logger.info("Unregistering commands of plugin", p.name);
        for (const cmd of p.commands) {
            try {
                unregisterCommand(cmd.name);
            } catch (e) {
                logger.error(`Failed to unregister command ${cmd.name}\n`, e);
                return false;
            }
        }
    }

    return true;
}, p => `stopPlugin ${p.name}`);
