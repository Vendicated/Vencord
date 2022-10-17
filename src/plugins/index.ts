import Plugins from "plugins";

import { registerCommand, unregisterCommand } from "../api/Commands";
import { Settings } from "../api/settings";
import Logger from "../utils/logger";
import { Patch, Plugin } from "../utils/types";

const logger = new Logger("PluginManager", "#a6d189");

export const plugins = Plugins;
export const patches = [] as Patch[];

for (const plugin of Object.values(Plugins)) if (plugin.patches && Settings.plugins[plugin.name].enabled) {
    for (const patch of plugin.patches) {
        patch.plugin = plugin.name;
        if (!Array.isArray(patch.replacement)) patch.replacement = [patch.replacement];
        patches.push(patch);
    }
}

export function startAllPlugins() {
    for (const name in Plugins) if (Settings.plugins[name].enabled) {
        startPlugin(Plugins[name]);
    }
}

export function startPlugin(p: Plugin) {
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
}

export function stopPlugin(p: Plugin) {
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
}
