import { relaunch, showItemInFolder } from "@utils/native";
import { SettingsRouter } from "@webpack/common";

export interface ButtonAction {
    id: string;
    label: string;
    callback?: () => void;
}

export let actions: ButtonAction[] = [
    { id: 'openVencordSettings', label: 'Open Vencord tab', callback: async () => await SettingsRouter.open("VencordSettings") },
    { id: 'openPluginSettings', label: 'Open Plugin tab', callback: () => SettingsRouter.open("VencordPlugins") },
    { id: 'openThemesSettings', label: 'Open Themes tab', callback: () => SettingsRouter.open("VencordThemes") },
    { id: 'openUpdaterSettings', label: 'Open Updater tab', callback: () => SettingsRouter.open("VencordUpdater") },
    { id: 'openVencordCloudSettings', label: 'Open Cloud tab', callback: () => SettingsRouter.open("VencordCloud") },
    { id: 'openBackupSettings', label: 'Open Backup & Restore tab', callback: () => SettingsRouter.open("VencordSettingsSync") },
    { id: 'restartClient', label: 'Restart Client', callback: () => relaunch() },
    { id: 'openQuickCSSFile', label: 'Open Quick CSS File', callback: () => VencordNative.quickCss.openEditor() },
    { id: 'openSettingsFolder', label: 'Open Settings Folder', callback: async () => showItemInFolder(await VencordNative.settings.getSettingsDir()) },
    { id: 'openInGithub', label: 'Open in Github', callback: () => VencordNative.native.openExternal("https://github.com/Vendicated/Vencord") }
];

export function registerAction(action: ButtonAction) {
    actions.push(action);
}

