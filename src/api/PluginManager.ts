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

import { addProfileBadge, removeProfileBadge } from "@api/Badges";
import { addChatBarButton, removeChatBarButton } from "@api/ChatButtons";
import { registerCommand, unregisterCommand } from "@api/Commands";
import { addContextMenuPatch, removeContextMenuPatch } from "@api/ContextMenu";
import { addMemberListDecorator, removeMemberListDecorator } from "@api/MemberListDecorators";
import { addMessageAccessory, removeMessageAccessory } from "@api/MessageAccessories";
import { addMessageDecoration, removeMessageDecoration } from "@api/MessageDecorations";
import { addMessageClickListener, addMessagePreEditListener, addMessagePreSendListener, removeMessageClickListener, removeMessagePreEditListener, removeMessagePreSendListener } from "@api/MessageEvents";
import { addMessagePopoverButton, removeMessagePopoverButton } from "@api/MessagePopover";
import { bindHooks, getBoundHookKeys, getRequiredApis, pluginHooks } from "@api/pluginHooks";
import { Settings, SettingsStore } from "@api/Settings";
import { disableStyle, enableStyle } from "@api/Styles";
import { traceFunction } from "@debug/Tracer";
import { Logger } from "@utils/Logger";
import { onlyOnce } from "@utils/onlyOnce";
import { canonicalizeFind, canonicalizeReplacement } from "@utils/patches";
import { DefinedSettings, Patch, Plugin, PluginDef, PluginSettingDef, ReporterTestable, StartAt } from "@utils/types";
import { FluxEvents } from "@vencord/discord-types";
import { FluxDispatcher } from "@webpack/common";
import { patches } from "@webpack/patcher";

import Plugins from "~plugins";
export { Plugins as plugins };
const logger = new Logger("PluginManager", "#a6d189");

const hookActions: Partial<Record<keyof PluginDef, { add: (p: Plugin) => void; remove: (p: Plugin) => void }>> = {
    commands: {
        add: p => { for (const cmd of p.commands!) registerCommand(cmd, p.name); },
        remove: p => { for (const cmd of p.commands!) unregisterCommand(cmd.name); }
    },
    contextMenus: {
        add: p => { for (const navId in p.contextMenus) addContextMenuPatch(navId, p.contextMenus[navId]); },
        remove: p => { for (const navId in p.contextMenus) removeContextMenuPatch(navId, p.contextMenus[navId]); }
    },
    managedStyle: { add: p => enableStyle(p.managedStyle!), remove: p => disableStyle(p.managedStyle!) },
    userProfileBadge: { add: p => addProfileBadge(p.userProfileBadge!), remove: p => removeProfileBadge(p.userProfileBadge!) },
    messagePopoverButton: {
        add: p => addMessagePopoverButton(p.name, p.messagePopoverButton!.render, p.messagePopoverButton!.icon),
        remove: p => removeMessagePopoverButton(p.name)
    },
    chatBarButton: {
        add: p => addChatBarButton(p.name, p.chatBarButton!.render, p.chatBarButton!.icon),
        remove: p => removeChatBarButton(p.name)
    },
    onMessageClick: { add: p => addMessageClickListener(p.onMessageClick!), remove: p => removeMessageClickListener(p.onMessageClick!) },
    onBeforeMessageSend: { add: p => addMessagePreSendListener(p.onBeforeMessageSend!), remove: p => removeMessagePreSendListener(p.onBeforeMessageSend!) },
    onBeforeMessageEdit: { add: p => addMessagePreEditListener(p.onBeforeMessageEdit!), remove: p => removeMessagePreEditListener(p.onBeforeMessageEdit!) },
    renderMessageAccessory: { add: p => addMessageAccessory(p.name, p.renderMessageAccessory!), remove: p => removeMessageAccessory(p.name) },
    renderMessageDecoration: { add: p => addMessageDecoration(p.name, p.renderMessageDecoration!), remove: p => removeMessageDecoration(p.name) },
    renderMemberListDecorator: { add: p => addMemberListDecorator(p.name, p.renderMemberListDecorator!), remove: p => removeMemberListDecorator(p.name) }
};

export const PMLogger = logger;

/** Whether we have subscribed to flux events of all the enabled plugins when FluxDispatcher was ready */
let enabledPluginsSubscribedFlux = false;
const subscribedFluxEventsPlugins = new Set<string>();

export function isPluginEnabled(p: string) {
    return (
        Plugins[p]?.required ||
        Plugins[p]?.isDependency ||
        Settings.plugins[p]?.enabled
    ) ?? false;
}

export function isSettingHidden(settings: DefinedSettings, setting: PluginSettingDef) {
    if (!("hidden" in setting)) return false;

    return typeof setting.hidden === "function"
        ? setting.hidden.call(settings)
        : Boolean(setting.hidden);
}

export function isSettingDisabled(settings: DefinedSettings, setting: PluginSettingDef) {
    if (!("disabled" in setting)) return false;

    return typeof setting.disabled === "function"
        ? setting.disabled.call(settings)
        : Boolean(setting.disabled);
}

export function hasAnyVisibleSettings({ settings }: Plugin) {
    return !!settings && Object.values(settings.def).some(s => !isSettingHidden(settings, s));
}

export function addPatch(newPatch: Omit<Patch, "plugin">, pluginName: string, pluginPath = `Vencord.Plugins.plugins[${JSON.stringify(pluginName)}]`) {
    // TODO: this causes crashes
    if (pluginName === "Vesktop" && newPatch.find === ".STREAMING_AUTO_STREAMER_MODE,") return;

    const patch = newPatch as Patch;
    patch.plugin = pluginName;

    if (IS_REPORTER) {
        delete patch.predicate;
        delete patch.group;
    }

    if (patch.predicate && !patch.predicate()) return;

    canonicalizeFind(patch);
    if (!Array.isArray(patch.replacement)) {
        patch.replacement = [patch.replacement];
    }

    for (const replacement of patch.replacement) {
        canonicalizeReplacement(replacement, pluginPath);

        if (IS_REPORTER) {
            delete replacement.predicate;
        }
    }

    patch.replacement = patch.replacement.filter(({ predicate }) => !predicate || predicate());

    patches.push(patch);
}

function isReporterTestable(p: Plugin, part: ReporterTestable) {
    return p.reporterTestable == null
        ? true
        : (p.reporterTestable & part) === part;
}

export function pluginRequiresRestart(p: Plugin) {
    return p.requiresRestart !== false && (p.requiresRestart || !!p.patches?.length);
}

export const startAllPlugins = traceFunction("startAllPlugins", function startAllPlugins(target: StartAt) {
    logger.info(`Starting plugins (stage ${target})`);
    for (const name in Plugins) {
        if (isPluginEnabled(name) && (!IS_REPORTER || isReporterTestable(Plugins[name], ReporterTestable.Start))) {
            const p = Plugins[name];

            const startAt = p.startAt ?? StartAt.WebpackReady;
            if (startAt !== target) continue;

            startPlugin(Plugins[name]);
        }
    }
});

export function startDependenciesRecursive(p: Plugin) {
    const settings = Settings.plugins;
    let restartNeeded = false;
    const failures: string[] = [];

    p.dependencies?.forEach(d => {
        if (!settings[d].enabled) {
            const dep = Plugins[d];
            startDependenciesRecursive(dep);

            // If the plugin has patches, don't start the plugin, just enable it.
            settings[d].enabled = true;
            dep.isDependency = true;

            if (pluginRequiresRestart(dep)) {
                logger.warn(`Enabling dependency ${d} requires restart.`);
                restartNeeded = true;
                return;
            }

            const result = startPlugin(dep);
            if (!result) failures.push(d);
        }
    });

    return { restartNeeded, failures };
}

export function subscribePluginFluxEvents(p: Plugin, fluxDispatcher: typeof FluxDispatcher) {
    if (p.flux && !subscribedFluxEventsPlugins.has(p.name) && (!IS_REPORTER || isReporterTestable(p, ReporterTestable.FluxEvents))) {
        subscribedFluxEventsPlugins.add(p.name);

        logger.debug("Subscribing to flux events of plugin", p.name);
        for (const [event, handler] of Object.entries(p.flux)) {
            const wrappedHandler = p.flux[event] = function () {
                try {
                    const res = handler!.apply(p, arguments as any);
                    return res instanceof Promise
                        ? res.catch(e => logger.error(`${p.name}: Error while handling ${event}\n`, e))
                        : res;
                } catch (e) {
                    logger.error(`${p.name}: Error while handling ${event}\n`, e);
                }
            };

            fluxDispatcher.subscribe(event as FluxEvents, wrappedHandler);
        }
    }
}

export function unsubscribePluginFluxEvents(p: Plugin, fluxDispatcher: typeof FluxDispatcher) {
    if (p.flux) {
        subscribedFluxEventsPlugins.delete(p.name);

        logger.debug("Unsubscribing from flux events of plugin", p.name);
        for (const [event, handler] of Object.entries(p.flux)) {
            fluxDispatcher.unsubscribe(event as FluxEvents, handler!);
        }
    }
}

export function subscribeAllPluginsFluxEvents(fluxDispatcher: typeof FluxDispatcher) {
    enabledPluginsSubscribedFlux = true;

    for (const name in Plugins) {
        if (!isPluginEnabled(name)) continue;
        subscribePluginFluxEvents(Plugins[name], fluxDispatcher);
    }
}

export const startPlugin = traceFunction("startPlugin", function startPlugin(p: Plugin) {
    const { name } = p;

    if (p.start) {
        logger.info("Starting plugin", name);
        if (p.started) {
            logger.warn(`${name} already started`);
            return false;
        }
        try {
            p.start();
        } catch (e) {
            logger.error(`Failed to start ${name}\n`, e);
            return false;
        }
    }

    p.started = true;

    if (enabledPluginsSubscribedFlux) {
        subscribePluginFluxEvents(p, FluxDispatcher);
    }

    for (const hook of pluginHooks) {
        const action = hookActions[hook.key];
        if (!action) continue;
        const value = p[hook.key];
        if (value == null || (hook.nonEmpty && (value as unknown[]).length === 0)) continue;
        try {
            action.add(p);
        } catch (e) {
            logger.error(`Failed to start ${name} (${String(hook.key)})\n`, e);
            return false;
        }
    }

    return true;
}, p => `startPlugin ${p.name}`);

export const stopPlugin = traceFunction("stopPlugin", function stopPlugin(p: Plugin) {
    const { name } = p;

    if (p.stop) {
        logger.info("Stopping plugin", name);
        if (!p.started) {
            logger.warn(`${name} already stopped`);
            return false;
        }
        try {
            p.stop();
        } catch (e) {
            logger.error(`Failed to stop ${name}\n`, e);
            return false;
        }
    }

    p.started = false;

    unsubscribePluginFluxEvents(p, FluxDispatcher);

    for (const hook of pluginHooks) {
        const action = hookActions[hook.key];
        if (!action) continue;
        const value = p[hook.key];
        if (value == null || (hook.nonEmpty && (value as unknown[]).length === 0)) continue;
        try {
            action.remove(p);
        } catch (e) {
            logger.error(`Failed to stop ${name} (${String(hook.key)})\n`, e);
            return false;
        }
    }

    return true;
}, p => `stopPlugin ${p.name}`);

export const initPluginManager = onlyOnce(function init() {
    const pluginsValues = Object.values(Plugins);
    const settings = Settings.plugins;

    const pluginKeysToBind = getBoundHookKeys();

    const neededApiPlugins = new Set<string>();

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

            settings[d].enabled = true;
            dep.isDependency = true;
        });

        for (const api of getRequiredApis(p)) neededApiPlugins.add(api);

        bindHooks(p, pluginKeysToBind);
    }

    for (const p of neededApiPlugins) {
        Plugins[p].isDependency = true;
        settings[p].enabled = true;
    }

    for (const p of pluginsValues) {
        if (p.settings) {
            p.settings.pluginName = p.name;

            for (const [key, def] of Object.entries(p.settings.def)) {
                if (def.onChange)
                    SettingsStore.addChangeListener(`plugins.${p.name}.${key}`, def.onChange);
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
});
