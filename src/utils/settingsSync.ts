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

import * as DataStore from "@api/DataStore";
import { showNotification } from "@api/Notifications";
import { PlainSettings, Settings } from "@api/settings";
import { Toasts } from "@webpack/common";
import { deflateSync, inflateSync, strFromU8, strToU8 } from "fflate";

import { getCloudAuth } from "./cloud";
import IpcEvents from "./IpcEvents";
import Logger from "./Logger";

export async function importSettings(data: string) {
    try {
        var parsed = JSON.parse(data);
    } catch (err) {
        console.log(data);
        throw new Error("Failed to parse JSON: " + String(err));
    }

    if ("settings" in parsed && "quickCss" in parsed) {
        await VencordNative.ipc.invoke(IpcEvents.SET_SETTINGS, JSON.stringify(parsed.settings, null, 4));
        await VencordNative.ipc.invoke(IpcEvents.SET_QUICK_CSS, parsed.quickCss);
    } else
        throw new Error("Invalid Settings. Is this even a Vencord Settings file?");
}

export async function exportSettings() {
    const settings = JSON.parse(VencordNative.ipc.sendSync(IpcEvents.GET_SETTINGS));
    const quickCss = await VencordNative.ipc.invoke(IpcEvents.GET_QUICK_CSS);
    return JSON.stringify({ settings, quickCss }, null, 4);
}

export async function downloadSettingsBackup() {
    const filename = "vencord-settings-backup.json";
    const backup = await exportSettings();
    const data = new TextEncoder().encode(backup);

    if (IS_WEB) {
        const file = new File([data], filename, { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(file);
        a.download = filename;

        document.body.appendChild(a);
        a.click();
        setImmediate(() => {
            URL.revokeObjectURL(a.href);
            document.body.removeChild(a);
        });
    } else {
        DiscordNative.fileManager.saveWithDialog(data, filename);
    }
}

const toast = (type: number, message: string) =>
    Toasts.show({
        type,
        message,
        id: Toasts.genId()
    });

const toastSuccess = () =>
    toast(Toasts.Type.SUCCESS, "Settings successfully imported. Restart to apply changes!");

const toastFailure = (err: any) =>
    toast(Toasts.Type.FAILURE, `Failed to import settings: ${String(err)}`);

export async function uploadSettingsBackup(showToast = true): Promise<void> {
    if (IS_WEB) {
        const input = document.createElement("input");
        input.type = "file";
        input.style.display = "none";
        input.accept = "application/json";
        input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async () => {
                try {
                    await importSettings(reader.result as string);
                    if (showToast) toastSuccess();
                } catch (err) {
                    new Logger("SettingsSync").error(err);
                    if (showToast) toastFailure(err);
                }
            };
            reader.readAsText(file);
        };

        document.body.appendChild(input);
        input.click();
        setImmediate(() => document.body.removeChild(input));
    } else {
        const [file] = await DiscordNative.fileManager.openFiles({
            filters: [
                { name: "Vencord Settings Backup", extensions: ["json"] },
                { name: "all", extensions: ["*"] }
            ]
        });

        if (file) {
            try {
                await importSettings(new TextDecoder().decode(file.data));
                if (showToast) toastSuccess();
            } catch (err) {
                new Logger("SettingsSync").error(err);
                if (showToast) toastFailure(err);
            }
        }
    }
}

// Cloud settings
const cloudSettingsLogger = new Logger("Cloud:Settings", "#39b7e0");

export async function putCloudSettings() {
    const settings = await exportSettings();

    try {
        const res = await fetch("https://vencord.vendicated.dev/api/v1/settings", {
            method: "PUT",
            headers: new Headers({
                Authorization: await getCloudAuth(),
                "Content-Type": "application/octet-stream"
            }),
            body: deflateSync(strToU8(settings))
        });

        if (!res.ok) {
            cloudSettingsLogger.error(`Failed to sync up, API returned ${res.status}`);
            toast(Toasts.Type.FAILURE, `Synchronization failed (API returned ${res.status}).`);
            return;
        }

        const { written } = await res.json();
        Settings.backend.settingsSyncVersion = written;

        cloudSettingsLogger.info("Settings uploaded to cloud successfully");
        toast(Toasts.Type.SUCCESS, "Synchronized your settings!");
    } catch (e) {
        cloudSettingsLogger.error("Failed to sync up", e);
        toast(Toasts.Type.FAILURE, "Settings synchronization failed. Check console.");
    }
}

export async function getCloudSettings(shouldNotify = true, force = false) {
    try {
        const res = await fetch("https://vencord.vendicated.dev/api/v1/settings", {
            method: "GET",
            headers: new Headers({
                Authorization: await getCloudAuth(),
                Accept: "application/octet-stream",
                "if-none-match": Settings.backend.settingsSyncVersion.toString()
            }),
        });

        if (res.status === 404) {
            cloudSettingsLogger.info("No settings on the cloud");
            if (shouldNotify)
                showNotification({
                    title: "Cloud Settings",
                    body: "There are no settings in the cloud."
                });
            return false;
        }

        if (res.status === 304) {
            cloudSettingsLogger.info("Settings up to date");
            if (shouldNotify)
                showNotification({
                    title: "Cloud Settings",
                    body: "Your settings are up to date."
                });
            return false;
        }

        if (!res.ok) {
            cloudSettingsLogger.error(`Failed to sync down, API returned ${res.status}`);
            showNotification({
                title: "Cloud Settings",
                body: `Could not synchronize settings (API returned ${res.status}).`
            });
            return false;
        }

        const written = parseInt(res.headers.get("etag")!);
        const localWritten = Settings.backend.settingsSyncVersion;

        // don't need to check for written > localWritten because the server will return 304 due to if-none-match
        if (!force && written < localWritten) {
            if (shouldNotify)
                showNotification({
                    title: "Cloud Settings",
                    body: "Your local settings are newer than the cloud ones."
                });
            return;
        }

        const data = await res.arrayBuffer();

        const settings = strFromU8(inflateSync(new Uint8Array(data)));
        await importSettings(settings);

        // sync with server timestamp instead of local one
        PlainSettings.backend.settingsSyncVersion = written;

        cloudSettingsLogger.info("Settings loaded from cloud successfully");
        if (shouldNotify)
            showNotification({
                title: "Cloud Settings",
                body: "Your settings have been updated! Reload to apply changes."
            });

        return true;
    } catch (e: any) {
        cloudSettingsLogger.error("Failed to sync down", e);
        toast(Toasts.Type.FAILURE, `Settings synchronization failed (${e.toString()}).`);

        return false;
    }
}

export async function deleteCloudSettings() {
    try {
        const res = await fetch("https://vencord.vendicated.dev/api/v1/settings", {
            method: "DELETE",
            headers: new Headers({
                Authorization: await getCloudAuth()
            }),
        });

        if (!res.ok) {
            cloudSettingsLogger.error(`Failed to delete, API returned ${res.status}`);
            toast(Toasts.Type.FAILURE, `Deletion failed (API returned ${res.status}).`);
            return;
        }

        await DataStore.set("Vencord_settingsLastSaved", 0);

        cloudSettingsLogger.info("Settings deleted from cloud successfully");
        toast(Toasts.Type.SUCCESS, "Deleted your settings from the cloud!");
    } catch (e: any) {
        cloudSettingsLogger.error("Failed to delete", e);
        toast(Toasts.Type.FAILURE, `Deletion failed (${e.toString()}).`);
    }
}
