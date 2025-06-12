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

import { showNotification } from "@api/Notifications";
import { PlainSettings, Settings } from "@api/Settings";
import { moment, Toasts } from "@webpack/common";
import { deflateSync, inflateSync } from "fflate";

import { checkCloudUrlCsp, getCloudAuth, getCloudUrl } from "./cloud";
import { Logger } from "./Logger";
import { relaunch } from "./native";
import { chooseFile, saveFile } from "./web";

export async function importSettings(data: string) {
    try {
        var parsed = JSON.parse(data);
    } catch (err) {
        console.log(data);
        throw new Error("Failed to parse JSON: " + String(err));
    }

    if ("settings" in parsed && "quickCss" in parsed) {
        Object.assign(PlainSettings, parsed.settings);
        await VencordNative.settings.set(parsed.settings);
        await VencordNative.quickCss.set(parsed.quickCss);
    } else
        throw new Error("Invalid Settings. Is this even a Vencord Settings file?");
}

export async function exportSettings({ minify }: { minify?: boolean; } = {}) {
    const settings = VencordNative.settings.get();
    const quickCss = await VencordNative.quickCss.get();
    return JSON.stringify({ settings, quickCss }, null, minify ? undefined : 4);
}

export async function downloadSettingsBackup() {
    const filename = `vencord-settings-backup-${moment().format("YYYY-MM-DD")}.json`;
    const backup = await exportSettings();
    const data = new TextEncoder().encode(backup);

    if (IS_DISCORD_DESKTOP) {
        DiscordNative.fileManager.saveWithDialog(data, filename);
    } else {
        saveFile(new File([data], filename, { type: "application/json" }));
    }
}

const toast = (type: string, message: string) =>
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
    if (IS_DISCORD_DESKTOP) {
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
    } else {
        const file = await chooseFile("application/json");
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
    }
}

// Cloud settings
const cloudSettingsLogger = new Logger("Cloud:Settings", "#39b7e0");

export async function putCloudSettings(manual?: boolean) {
    const settings = await exportSettings({ minify: true });

    if (!await checkCloudUrlCsp()) return;

    try {
        const res = await fetch(new URL("/v1/settings", getCloudUrl()), {
            method: "PUT",
            headers: {
                Authorization: await getCloudAuth(),
                "Content-Type": "application/octet-stream"
            },
            body: deflateSync(new TextEncoder().encode(settings))
        });

        if (!res.ok) {
            cloudSettingsLogger.error(`Failed to sync up, API returned ${res.status}`);
            showNotification({
                title: "Cloud Settings",
                body: `Could not synchronize settings to cloud (API returned ${res.status}).`,
                color: "var(--red-360)"
            });
            return;
        }

        const { written } = await res.json();
        PlainSettings.cloud.settingsSyncVersion = written;
        VencordNative.settings.set(PlainSettings);

        cloudSettingsLogger.info("Settings uploaded to cloud successfully");

        if (manual) {
            showNotification({
                title: "Cloud Settings",
                body: "Synchronized settings to the cloud!",
                noPersist: true,
            });
        }
    } catch (e: any) {
        cloudSettingsLogger.error("Failed to sync up", e);
        showNotification({
            title: "Cloud Settings",
            body: `Could not synchronize settings to the cloud (${e.toString()}).`,
            color: "var(--red-360)"
        });
    }
}

export async function getCloudSettings(shouldNotify = true, force = false) {
    if (!await checkCloudUrlCsp()) return;

    try {
        const res = await fetch(new URL("/v1/settings", getCloudUrl()), {
            method: "GET",
            headers: {
                Authorization: await getCloudAuth(),
                Accept: "application/octet-stream",
                "If-None-Match": Settings.cloud.settingsSyncVersion.toString()
            },
        });

        if (res.status === 404) {
            cloudSettingsLogger.info("No settings on the cloud");
            if (shouldNotify)
                showNotification({
                    title: "Cloud Settings",
                    body: "There are no settings in the cloud.",
                    noPersist: true
                });
            return false;
        }

        if (res.status === 304) {
            cloudSettingsLogger.info("Settings up to date");
            if (shouldNotify)
                showNotification({
                    title: "Cloud Settings",
                    body: "Your settings are up to date.",
                    noPersist: true
                });
            return false;
        }

        if (!res.ok) {
            cloudSettingsLogger.error(`Failed to sync down, API returned ${res.status}`);
            showNotification({
                title: "Cloud Settings",
                body: `Could not synchronize settings from the cloud (API returned ${res.status}).`,
                color: "var(--red-360)"
            });
            return false;
        }

        const written = Number(res.headers.get("etag")!);
        const localWritten = Settings.cloud.settingsSyncVersion;

        // don't need to check for written > localWritten because the server will return 304 due to if-none-match
        if (!force && written < localWritten) {
            if (shouldNotify)
                showNotification({
                    title: "Cloud Settings",
                    body: "Your local settings are newer than the cloud ones.",
                    noPersist: true,
                });
            return;
        }

        const data = await res.arrayBuffer();

        const settings = new TextDecoder().decode(inflateSync(new Uint8Array(data)));
        await importSettings(settings);

        // sync with server timestamp instead of local one
        PlainSettings.cloud.settingsSyncVersion = written;
        VencordNative.settings.set(PlainSettings);

        cloudSettingsLogger.info("Settings loaded from cloud successfully");
        if (shouldNotify)
            showNotification({
                title: "Cloud Settings",
                body: "Your settings have been updated! Click here to restart to fully apply changes!",
                color: "var(--green-360)",
                onClick: IS_WEB ? () => location.reload() : relaunch,
                noPersist: true
            });

        return true;
    } catch (e: any) {
        cloudSettingsLogger.error("Failed to sync down", e);
        showNotification({
            title: "Cloud Settings",
            body: `Could not synchronize settings from the cloud (${e.toString()}).`,
            color: "var(--red-360)"
        });

        return false;
    }
}

export async function deleteCloudSettings() {
    if (!await checkCloudUrlCsp()) return;

    try {
        const res = await fetch(new URL("/v1/settings", getCloudUrl()), {
            method: "DELETE",
            headers: { Authorization: await getCloudAuth() },
        });

        if (!res.ok) {
            cloudSettingsLogger.error(`Failed to delete, API returned ${res.status}`);
            showNotification({
                title: "Cloud Settings",
                body: `Could not delete settings (API returned ${res.status}).`,
                color: "var(--red-360)"
            });
            return;
        }

        cloudSettingsLogger.info("Settings deleted from cloud successfully");
        showNotification({
            title: "Cloud Settings",
            body: "Settings deleted from cloud!",
            color: "var(--green-360)"
        });
    } catch (e: any) {
        cloudSettingsLogger.error("Failed to delete", e);
        showNotification({
            title: "Cloud Settings",
            body: `Could not delete settings (${e.toString()}).`,
            color: "var(--red-360)"
        });
    }
}
