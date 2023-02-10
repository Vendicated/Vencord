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

import { Toasts } from "@webpack/common";

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
