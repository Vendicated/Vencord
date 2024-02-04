import { relaunch, showItemInFolder } from "@utils/native";
import { Alerts, GuildStore, NavigationRouter, Parser, SettingsRouter, Toasts, UserStore, React } from "@webpack/common";
import { openSimpleTextInput } from "./components/TextInput";
import { checkForUpdates, getRepo } from "@utils/updater";
import Plugins from "~plugins";
import { Settings } from "@api/Settings";
import { openMultipleChoice } from "./components/MultipleChoice";
import { Clipboard } from "@webpack/common";
import { showNotification } from "@api/Notifications";
import { PresenceStore, Tooltip } from "@webpack/common";
import { findStore } from "@webpack";
import { FluxDispatcher } from "@webpack/common";
import { ChannelStore } from "@webpack/common";
import { ChangeList } from "@utils/ChangeList";

export interface ButtonAction {
    id: string;
    label: string;
    callback?: () => void;
    registrar?: string;
}

export let actions: ButtonAction[] = [
    { id: 'openVencordSettings', label: 'Open Vencord tab', callback: async () => await SettingsRouter.open("VencordSettings"), registrar: "Vencord" },
    { id: 'openPluginSettings', label: 'Open Plugin tab', callback: () => SettingsRouter.open("VencordPlugins"), registrar: "Vencord" },
    { id: 'openThemesSettings', label: 'Open Themes tab', callback: () => SettingsRouter.open("VencordThemes"), registrar: "Vencord" },
    { id: 'openUpdaterSettings', label: 'Open Updater tab', callback: () => SettingsRouter.open("VencordUpdater"), registrar: "Vencord" },
    { id: 'openVencordCloudSettings', label: 'Open Cloud tab', callback: () => SettingsRouter.open("VencordCloud"), registrar: "Vencord" },
    { id: 'openBackupSettings', label: 'Open Backup & Restore tab', callback: () => SettingsRouter.open("VencordSettingsSync"), registrar: "Vencord" },
    { id: 'restartClient', label: 'Restart Client', callback: () => relaunch(), registrar: "Vencord" },
    { id: 'openQuickCSSFile', label: 'Open Quick CSS File', callback: () => VencordNative.quickCss.openEditor(), registrar: "Vencord" },
    { id: 'openSettingsFolder', label: 'Open Settings Folder', callback: async () => showItemInFolder(await VencordNative.settings.getSettingsDir()), registrar: "Vencord" },
    { id: 'openInGithub', label: 'Open in Github', callback: async () => VencordNative.native.openExternal(await getRepo()), registrar: "Vencord" },

    {
        id: 'openInBrowser', label: 'Open in Browser', callback: async () => {
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
        }, registrar: "Vencord"
    },

    {
        id: 'togglePlugin', label: 'Toggle Plugin', callback: async () => {
            const plugins = Object.keys(Plugins);
            let options: ButtonAction[] = [];

            for (const plugin of plugins) {
                options.push({
                    id: plugin,
                    label: plugin
                });
            }

            const choice = await openMultipleChoice(options);

            const enabled = await openMultipleChoice([
                { id: 'enable', label: 'Enable' },
                { id: 'disable', label: 'Disable' }
            ]);

            if (choice && enabled) {
                return togglePlugin(choice, enabled.id === 'enable');
            }
        }, registrar: "Vencord"
    },

    {
        id: 'quickFetch', label: 'Quick Fetch', callback: async () => {
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
        }, registrar: "Vencord"
    },

    {
        id: 'checkForUpdates', label: 'Check for Updates', callback: async () => {
            const isOutdated = await checkForUpdates();

            if (isOutdated) {
                setTimeout(() => showNotification({
                    title: "A Vencord update is available!",
                    body: "Click here to view the update",
                    permanent: true,
                    noPersist: true,
                    onClick() {
                        SettingsRouter.open("VencordUpdater");
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
        }, registrar: "Vencord"
    },

    {
        id: 'navToServer', label: 'Navigate to Server', callback: async () => {
            const allServers = Object.values(GuildStore.getGuilds());
            let options: ButtonAction[] = [];

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
        }, registrar: "Vencord"
    }
];

function togglePlugin(plugin: ButtonAction, enabled: boolean) {

    Settings.plugins[plugin.id].enabled = enabled;

    Toasts.show({
        message: `Successfully ${enabled ? 'enabled' : 'disabled'} ${plugin.id}`,
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

