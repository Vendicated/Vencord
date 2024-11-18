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

import { chooseFile as chooseFileWeb } from "@utils/web";
import { Toasts } from "@webpack/common";

import { Native } from "..";
import { addMessagesBulkIDB, DBMessageRecord, getAllMessagesIDB } from "../db";
import { LoggedMessage, LoggedMessageJSON } from "../types";

async function getLogContents(): Promise<string> {
    if (IS_WEB) {
        const file = await chooseFileWeb(".json");
        return new Promise((resolve, reject) => {
            if (!file) return reject("No file selected");

            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    const settings = await Native.getSettings();
    return Native.chooseFile("Logs", [{ extensions: ["json"], name: "logs" }], settings.logsDir);
}

export async function importLogs() {
    try {
        const content = await getLogContents();
        const data = JSON.parse(content) as { messages: DBMessageRecord[]; };

        let messages: LoggedMessageJSON[] = [];

        if ((data as any).deletedMessages || (data as any).editedMessages) {
            messages = Object.values((data as unknown as LoggedMessage)).filter(m => m.message).map(m => m.message) as LoggedMessageJSON[];
        } else
            messages = data.messages.map(m => m.message);

        if (!Array.isArray(messages)) {
            throw new Error("Invalid log file format");
        }

        if (!messages.length) {
            throw new Error("No messages found in log file");
        }

        if (!messages.every(m => m.id && m.channel_id && m.timestamp)) {
            throw new Error("Invalid message format");
        }

        await addMessagesBulkIDB(messages);

        Toasts.show({
            id: Toasts.genId(),
            message: "Successfully imported logs",
            type: Toasts.Type.SUCCESS
        });
    } catch (e) {
        console.error(e);

        Toasts.show({
            id: Toasts.genId(),
            message: "Error importing logs. Check the console for more information",
            type: Toasts.Type.FAILURE
        });
    }

}

export async function exportLogs() {
    const filename = "message-logger-logs-idb.json";

    const messages = await getAllMessagesIDB();
    const data = JSON.stringify({ messages }, null, 2);

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

