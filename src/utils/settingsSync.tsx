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
import { findByProps } from "@webpack";
import { Toasts, UserStore } from "@webpack/common";
import * as fflate from "fflate";

import IpcEvents from "./IpcEvents";
import Logger from "./Logger";
import { openModal } from "./modal";

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

const toastSuccess = () => Toasts.show({
    type: Toasts.Type.SUCCESS,
    message: "Settings successfully imported. Restart to apply changes!",
    id: Toasts.genId()
});

const toastFailure = (err: any) => Toasts.show({
    type: Toasts.Type.FAILURE,
    message: `Failed to import settings: ${String(err)}`,
    id: Toasts.genId()
});

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
const cloudSettingsLogger = new Logger("CloudSettings", "purple");

const toast = (type: number, message: string) =>
    Toasts.show({
        type,
        message,
        id: Toasts.genId(),
        options: {
            position: Toasts.Position.BOTTOM
        }
    });

export async function cloudSyncEnabled() {
    return await DataStore.get("Vencord_settingsSyncSecret") !== null;
}

export function authorizeCloud() {
    const { OAuth2AuthorizeModal } = findByProps("OAuth2AuthorizeModal");

    openModal((props: any) => <OAuth2AuthorizeModal
        {...props}
        scopes={["identify"]}
        responseType="code"
        redirectUri="https://vencord.vendicated.dev/api/v1/callback"
        permissions={0n}
        clientId="1075583776979169361"
        cancelCompletesFlow={false}
        callback={async (u: string) => {
            if (!u) return;

            try {
                const url = new URL(u);
                const res = await fetch(url, {
                    headers: new Headers({ Accept: "application/json" })
                });
                const { secret } = await res.json();
                if (secret) {
                    cloudSettingsLogger.info("Authorized with secret");
                    await DataStore.set("Vencord_settingsSyncSecret", secret);
                    toast(Toasts.Type.SUCCESS, "Cloud settings sync enabled!");
                } else {
                    toast(Toasts.Type.FAILURE, "Setup failed (no secret returned?).");
                }
            } catch (e: any) {
                cloudSettingsLogger.error("Failed to authorize", e);
                toast(Toasts.Type.FAILURE, `Setup failed (${e.toString()}).`);
            }
        }
        }
    />);
}

export async function deauthorizeCloud() {
    await DataStore.del("Vencord_settingsSyncSecret");
    await DataStore.del("Vencord_settingsSyncWritten");
    toast(Toasts.Type.SUCCESS, "Settings sync deauthorized.");
}

async function getCloudAuth() {
    const userId = UserStore.getCurrentUser().id;
    const secret = await DataStore.get("Vencord_settingsSyncSecret");

    return btoa(`${userId}:${secret}`);
}

export async function syncToCloud() {
    const settings = await exportSettings();

    try {
        const res = await fetch("https://vencord.vendicated.dev/api/v1/settings", {
            method: "PUT",
            headers: new Headers({
                Authorization: await getCloudAuth(),
                "Content-Type": "application/octet-stream"
            }),
            body: fflate.deflateSync(fflate.strToU8(settings))
        });

        if (!res.ok) {
            cloudSettingsLogger.error(`Failed to sync up, API returned ${res.status}`);
            toast(Toasts.Type.FAILURE, `Synchronization failed (API returned ${res.status}).`);
            return;
        }

        const { written } = await res.json();
        await DataStore.set("Vencord_settingsSyncWritten", written);

        cloudSettingsLogger.info("Settings uploaded to cloud successfully");
        toast(Toasts.Type.SUCCESS, "Synchronized your settings!");
    } catch (e) {
        cloudSettingsLogger.error("Failed to sync up", e);
        toast(Toasts.Type.FAILURE, "Settings synchronization failed. Check console.");
    }
}

export async function syncFromCloud(shouldToast = true) {
    try {
        const res = await fetch("https://vencord.vendicated.dev/api/v1/settings", {
            method: "GET",
            headers: new Headers({
                Authorization: await getCloudAuth(),
                Accept: "application/octet-stream"
            }),
        });

        if (!res.ok) {
            cloudSettingsLogger.error(`Failed to sync down, API returned ${res.status}`);
            toast(Toasts.Type.FAILURE, `Synchronization failed (API returned ${res.status}).`);
            return;
        }

        const written = parseInt(res.headers.get("etag")!);
        const localWritten = await DataStore.get<number>("Vencord_settingsSyncWritten") ?? 0;

        if (written === localWritten) {
            if (shouldToast) toast(Toasts.Type.SUCCESS, "Your settings are up to date.");
            return;
        } else if (written < localWritten) {
            if (shouldToast) toast(Toasts.Type.FAILURE, "Your settings are newer than the ones on the server.");
            return;
        }

        const data = await res.arrayBuffer();

        const settings = fflate.strFromU8(fflate.inflateSync(new Uint8Array(data)));
        await importSettings(settings);
        await DataStore.set("Vencord_settingsSyncWritten", written);

        cloudSettingsLogger.info("Settings loaded from cloud successfully");
        if (shouldToast) toast(Toasts.Type.SUCCESS, "Synchronized your settings! Restart to apply changes.");
    } catch (e: any) {
        cloudSettingsLogger.error("Failed to sync down", e);
        toast(Toasts.Type.FAILURE, `Settings synchronization failed (${e.toString()}).`);
    }
}

export async function checkSyncRequirement() {
    try {
        const res = await fetch("https://vencord.vendicated.dev/api/v1/settings", {
            method: "HEAD",
            headers: new Headers({
                Authorization: await getCloudAuth(),
                Accept: "application/octet-stream"
            }),
        });

        const version = parseInt(res.headers.get("etag") ?? "-1");

        // if these don't exist, the user has never synchronized before and hasn't changed their settings on this client,
        // so we'll just pretend it's 0
        const localVersion = await DataStore.get<number>("Vencord_settingsSyncWritten") ?? 0;
        const lastWritten = await DataStore.get<number>("Vencord_settingsLastSaved") ?? 0;

        return (version > localVersion) && (lastWritten < version);
    } catch (e: any) {
        cloudSettingsLogger.error("Failed to check version", e);
        return null;
    }
}
