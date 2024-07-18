/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotification } from "@api/Notifications";
import { Settings } from "@api/Settings";
import { relaunch, showItemInFolder } from "@utils/native";
import { checkForUpdates, getRepo } from "@utils/updater";
import { Clipboard, GuildStore, NavigationRouter, SettingsRouter, Toasts } from "@webpack/common";

import gitHash from "~git-hash";
import gitRemote from "~git-remote";
import Plugins from "~plugins";

import { openMultipleChoice } from "./components/MultipleChoice";
import { openSimpleTextInput } from "./components/TextInput";

export interface ButtonAction {
    id: string;
    label: string;
    callback?: () => void;
    registrar?: string;
}

export const actions: ButtonAction[] = [
    { id: "openSuncordSettings", label: "Open Suncord tab", callback: async () => await SettingsRouter.open("SuncordSettings"), registrar: "Suncord" },
    { id: "openPluginSettings", label: "Open Plugin tab", callback: () => SettingsRouter.open("SuncordPlugins"), registrar: "Suncord" },
    { id: "openThemesSettings", label: "Open Themes tab", callback: () => SettingsRouter.open("SuncordThemes"), registrar: "Suncord" },
    { id: "openUpdaterSettings", label: "Open Updater tab", callback: () => SettingsRouter.open("SuncordUpdater"), registrar: "Suncord" },
    { id: "openSuncordCloudSettings", label: "Open Cloud tab", callback: () => SettingsRouter.open("SuncordCloud"), registrar: "Suncord" },
    { id: "openBackupSettings", label: "Open Backup & Restore tab", callback: () => SettingsRouter.open("SuncordSettingsSync"), registrar: "Suncord" },
    { id: "restartClient", label: "Restart Client", callback: () => relaunch(), registrar: "Suncord" },
    { id: "openQuickCSSFile", label: "Open Quick CSS File", callback: () => VencordNative.quickCss.openEditor(), registrar: "Suncord" },
    { id: "openSettingsFolder", label: "Open Settings Folder", callback: async () => showItemInFolder(await VencordNative.settings.getSettingsDir()), registrar: "Suncord" },
    { id: "openInGithub", label: "Open in Github", callback: async () => VencordNative.native.openExternal(await getRepo()), registrar: "Suncord" },

    {
        id: "openInBrowser", label: "Open in Browser", callback: async () => {
            const url = await openSimpleTextInput("Enter a URL");
            const newUrl = url.replace(/(https?:\/\/)?([a-zA-Z0-9-]+)\.([a-zA-Z0-9-]+)/, "https://$2.$3");

            try {
                new URL(newUrl); // Throws if invalid
                VencordNative.native.openExternal(newUrl);
            } catch {
                Toasts.show({
                    message: "Invalid URL",
                    type: Toasts.Type.FAILURE,
                    id: Toasts.genId(),
                    options: {
                        position: Toasts.Position.BOTTOM
                    }
                });
            }
        }, registrar: "Suncord"
    },

    {
        id: "togglePlugin", label: "Toggle Plugin", callback: async () => {
            const plugins = Object.keys(Plugins);
            const options: ButtonAction[] = [];

            for (const plugin of plugins) {
                options.push({
                    id: plugin,
                    label: plugin
                });
            }

            const choice = await openMultipleChoice(options);

            const enabled = await openMultipleChoice([
                { id: "enable", label: "Enable" },
                { id: "disable", label: "Disable" }
            ]);

            if (choice && enabled) {
                return togglePlugin(choice, enabled.id === "enable");
            }
        }, registrar: "Suncord"
    },

    {
        id: "quickFetch", label: "Quick Fetch", callback: async () => {
            try {
                const url = await openSimpleTextInput("Enter URL to fetch (GET only)");
                const newUrl = url.replace(/(https?:\/\/)?([a-zA-Z0-9-]+)\.([a-zA-Z0-9-]+)/, "https://$2.$3");
                const res = (await fetch(newUrl));
                const text = await res.text();
                Clipboard.copy(text);

                Toasts.show({
                    message: "Copied response to clipboard!",
                    type: Toasts.Type.SUCCESS,
                    id: Toasts.genId(),
                    options: {
                        position: Toasts.Position.BOTTOM
                    }
                });

            } catch (e) {
                Toasts.show({
                    message: "Issue fetching URL",
                    type: Toasts.Type.FAILURE,
                    id: Toasts.genId(),
                    options: {
                        position: Toasts.Position.BOTTOM
                    }
                });
            }
        }, registrar: "Suncord"
    },

    {
        id: "copyGitInfo", label: "Copy Git Info", callback: async () => {
            Clipboard.copy(`gitHash: ${gitHash}\ngitRemote: ${gitRemote}`);

            Toasts.show({
                message: "Copied git info to clipboard!",
                type: Toasts.Type.SUCCESS,
                id: Toasts.genId(),
                options: {
                    position: Toasts.Position.BOTTOM
                }
            });
        }, registrar: "Suncord"
    },

    {
        id: "checkForUpdates", label: "Check for Updates", callback: async () => {
            const isOutdated = await checkForUpdates();

            if (isOutdated) {
                setTimeout(() => showNotification({
                    title: "A Suncord update is available!",
                    body: "Click here to view the update",
                    permanent: true,
                    noPersist: true,
                    onClick() {
                        SettingsRouter.open("SuncordUpdater");
                    }
                }), 10_000);
            } else {
                Toasts.show({
                    message: "No updates available",
                    type: Toasts.Type.MESSAGE,
                    id: Toasts.genId(),
                    options: {
                        position: Toasts.Position.BOTTOM
                    }
                });
            }
        }, registrar: "Suncord"
    },

    {
        id: "navToServer", label: "Navigate to Server", callback: async () => {
            const allServers = Object.values(GuildStore.getGuilds());
            const options: ButtonAction[] = [];

            for (const server of allServers) {
                options.push({
                    id: server.id,
                    label: server.name
                });
            }

            const choice = await openMultipleChoice(options);

            if (choice) {
                NavigationRouter.transitionToGuild(choice.id);
            }
        }, registrar: "Suncord"
    }
];

function togglePlugin(plugin: ButtonAction, enabled: boolean) {

    Settings.plugins[plugin.id].enabled = enabled;

    Toasts.show({
        message: `Successfully ${enabled ? "enabled" : "disabled"} ${plugin.id}`,
        type: Toasts.Type.SUCCESS,
        id: Toasts.genId(),
        options: {
            position: Toasts.Position.BOTTOM
        }
    });
}

export function registerAction(action: ButtonAction) {
    actions.push(action);
}
