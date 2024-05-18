/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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

import { DataStore } from "@api/index";

import { LOGGED_MESSAGES_KEY, MessageLoggerStore } from "../LoggedMessageManager";

// 99% of this is coppied from src\utils\settingsSync.ts

export async function downloadLoggedMessages() {
    const filename = "message-logger-logs.json";
    const exportData = await exportLogs();
    const data = new TextEncoder().encode(exportData);

    if (IS_WEB || IS_VESKTOP) {
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

export async function exportLogs() {
    const logger_data = await DataStore.get(LOGGED_MESSAGES_KEY, MessageLoggerStore);
    return JSON.stringify(logger_data, null, 4);
}

