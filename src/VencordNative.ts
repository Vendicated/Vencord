/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022
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

import IPC_EVENTS from "@utils/IpcEvents";
import { IpcRenderer, ipcRenderer } from "electron";

function assertEventAllowed(event: string) {
    if (!(event in IPC_EVENTS)) throw new Error(`Event ${event} not allowed.`);
}
export default {
    getVersions: () => process.versions,
    ipc: {
        send(event: string, ...args: any[]) {
            assertEventAllowed(event);
            ipcRenderer.send(event, ...args);
        },
        sendSync<T = any>(event: string, ...args: any[]): T {
            assertEventAllowed(event);
            return ipcRenderer.sendSync(event, ...args);
        },
        on(event: string, listener: Parameters<IpcRenderer["on"]>[1]) {
            assertEventAllowed(event);
            ipcRenderer.on(event, listener);
        },
        off(event: string, listener: Parameters<IpcRenderer["off"]>[1]) {
            assertEventAllowed(event);
            ipcRenderer.off(event, listener);
        },
        invoke<T = any>(event: string, ...args: any[]): Promise<T> {
            assertEventAllowed(event);
            return ipcRenderer.invoke(event, ...args);
        }
    }
};
