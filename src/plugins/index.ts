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
import { Settings, SettingsStore } from "@api/Settings";
import { disableStyle, enableStyle } from "@api/Styles";
import { Logger } from "@utils/Logger";
import { canonicalizeFind, canonicalizeReplacement } from "@utils/patches";
import { Patch, Plugin, PluginDef, ReporterTestable, StartAt } from "@utils/types";
import { FluxEvents } from "@vencord/discord-types";
import { FluxDispatcher } from "@webpack/common";
import { patches } from "@webpack/patcher";

import Plugins from "~plugins";

import { traceFunction } from "../debug/Tracer";

const logger = new Logger("PluginManager", "#a6d189");

export const PMLogger = logger;
export const plugins = Plugins;
export { patches };

/** Whether we have subscribed to flux events of all the enabled plugins when FluxDispatcher was ready */
let enabledPluginsSubscribedFlux = false;
const subscribedFluxEventsPlugins = new Set<string>();

const pluginsValues = Object.values(Plugins);
const settings = Settings.plugins;

export function isPluginEnabled(p: string) {
    return (
        Plugins[p]?.required ||
        Plugins[p]?.isDependency ||
        settings[p]?.enabled
    ) ?? false;
}

export function addPatch(newPatch: Omit<Patch, "plugin">, pluginName: string, pluginPath = `Vencord.Plugins.plugins[${JSON.stringify(pluginName)}]`) {
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

const pluginKeysToBind: Array<keyof PluginDef & `${"on" | "render"}${string}`> = [
    "onBeforeMessageEdit", "onBeforeMessageSend", "onMessageClick",
    "renderChatBarButton", "renderMemberListDecorator", "renderMessageAccessory", "renderMessageDecoration", "renderMessagePopoverButton"
];

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

    if (p.commands?.length) neededApiPlugins.add("CommandsAPI");
    if (p.onBeforeMessageEdit || p.onBeforeMessageSend || p.onMessageClick) neededApiPlugins.add("MessageEventsAPI");
    if (p.renderChatBarButton) neededApiPlugins.add("ChatInputButtonAPI");
    if (p.renderMemberListDecorator) neededApiPlugins.add("MemberListDecoratorsAPI");
    if (p.renderMessageAccessory) neededApiPlugins.add("MessageAccessoriesAPI");
    if (p.renderMessageDecoration) neededApiPlugins.add("MessageDecorationsAPI");
    if (p.renderMessagePopoverButton) neededApiPlugins.add("MessagePopoverAPI");
    if (p.userProfileBadge) neededApiPlugins.add("BadgeAPI");

    for (const key of pluginKeysToBind) {
        p[key] &&= p[key].bind(p) as any;
    }
}

for (const p of neededApiPlugins) {
    Plugins[p].isDependency = true;
    settings[p].enabled = true;
}

for (const p of pluginsValues) {
    if (p.settings) {
        p.options ??= {};

        p.settings.pluginName = p.name;
        for (const name in p.settings.def) {
            const def = p.settings.def[name];
            const checks = p.settings.checks?.[name];
            p.options[name] = { ...def, ...checks };
        }
    }

    if (p.options) {
        for (const name in p.options) {
            const opt = p.options[name];
            if (opt.onChange != null) {
                SettingsStore.addChangeListener(`plugins.${p.name}.${name}`, opt.onChange);
            }
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
        if (isPluginEnabled(name) && (!IS_REPORTER || isReporterTestable(Plugins[name], ReporterTestable.Start))) {
            const p = Plugins[name];

            const startAt = p.startAt ?? StartAt.WebpackReady;
            if (startAt !== target) continue;

            startPlugin(Plugins[name]);
        }
    }
});

export function startDependenciesRecursive(p: Plugin) {
    let restartNeeded = false;
    const failures: string[] = [];

    p.dependencies?.forEach(d => {
        if (!settings[d].enabled) {
            const dep = Plugins[d];
            startDependenciesRecursive(dep);

            // If the plugin has patches, don't start the plugin, just enable it.
            settings[d].enabled = true;
            dep.isDependency = true;

            if (dep.patches) {
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
                    const res = handler.apply(p, arguments as any);
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
            fluxDispatcher.unsubscribe(event as FluxEvents, handler);
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
    const {
        name, commands, contextMenus, managedStyle, userProfileBadge,
        onBeforeMessageEdit, onBeforeMessageSend, onMessageClick,
        renderChatBarButton, renderMemberListDecorator, renderMessageAccessory, renderMessageDecoration, renderMessagePopoverButton
    } = p;

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
        subscribePluginFluxEvents(p, FluxDispatcher);
    }

    if (contextMenus) {
        logger.debug("Adding context menus patches of plugin", name);
        for (const navId in contextMenus) {
            addContextMenuPatch(navId, contextMenus[navId]);
        }
    }

    if (managedStyle) enableStyle(managedStyle);

    if (userProfileBadge) addProfileBadge(userProfileBadge);

    if (onBeforeMessageEdit) addMessagePreEditListener(onBeforeMessageEdit);
    if (onBeforeMessageSend) addMessagePreSendListener(onBeforeMessageSend);
    if (onMessageClick) addMessageClickListener(onMessageClick);

    if (renderChatBarButton) addChatBarButton(name, renderChatBarButton);
    if (renderMemberListDecorator) addMemberListDecorator(name, renderMemberListDecorator);
    if (renderMessageDecoration) addMessageDecoration(name, renderMessageDecoration);
    if (renderMessageAccessory) addMessageAccessory(name, renderMessageAccessory);
    if (renderMessagePopoverButton) addMessagePopoverButton(name, renderMessagePopoverButton);

    return true;
}, p => `startPlugin ${p.name}`);

export const stopPlugin = traceFunction("stopPlugin", function stopPlugin(p: Plugin) {
    const {
        name, commands, contextMenus, managedStyle, userProfileBadge,
        onBeforeMessageEdit, onBeforeMessageSend, onMessageClick,
        renderChatBarButton, renderMemberListDecorator, renderMessageAccessory, renderMessageDecoration, renderMessagePopoverButton
    } = p;

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

    unsubscribePluginFluxEvents(p, FluxDispatcher);

    if (contextMenus) {
        logger.debug("Removing context menus patches of plugin", name);
        for (const navId in contextMenus) {
            removeContextMenuPatch(navId, contextMenus[navId]);
        }
    }

    if (managedStyle) disableStyle(managedStyle);

    if (userProfileBadge) removeProfileBadge(userProfileBadge);

    if (onBeforeMessageEdit) removeMessagePreEditListener(onBeforeMessageEdit);
    if (onBeforeMessageSend) removeMessagePreSendListener(onBeforeMessageSend);
    if (onMessageClick) removeMessageClickListener(onMessageClick);

    if (renderChatBarButton) removeChatBarButton(name);
    if (renderMemberListDecorator) removeMemberListDecorator(name);
    if (renderMessageDecoration) removeMessageDecoration(name);
    if (renderMessageAccessory) removeMessageAccessory(name);
    if (renderMessagePopoverButton) removeMessagePopoverButton(name);

    return true;
}, p => `stopPlugin ${p.name}`);
