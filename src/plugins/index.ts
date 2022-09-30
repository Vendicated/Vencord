import Plugins from "plugins";
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
    for (const plugin in Plugins) if (Settings.plugins[plugin].enabled) {
        startPlugin(Plugins[plugin]);
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
            return true;
        } catch (err: any) {
            logger.error(`Failed to start ${p.name}\n`, err);
            return false;
        }
    }
}

export function stopPlugin(p: Plugin) {
    if (p.stop) {
        logger.info("Stopping plugin", p.name);
        if (!p.started) {
            logger.warn(`${p.name} already stopped / never started`);
            return false;
        }
        try {
            p.stop();
            p.started = false;
            return true;
        } catch (err: any) {
            logger.error(`Failed to stop ${p.name}\n`, err);
            return false;
        }
    }
}
