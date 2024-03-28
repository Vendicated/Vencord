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

import { IpcEvents } from "@shared/IpcEvents";
import { ipcMain } from "electron";

import PluginNatives from "~pluginNatives";

const PluginIpcMappings = {} as Record<string, Record<string, string>>;
export type PluginIpcMappings = typeof PluginIpcMappings;

for (const [plugin, methods] of Object.entries(PluginNatives)) {
    const entries = Object.entries(methods);
    if (!entries.length) continue;

    const mappings = PluginIpcMappings[plugin] = {};

    for (const [methodName, method] of entries) {
        const key = `VencordPluginNative_${plugin}_${methodName}`;
        ipcMain.handle(key, method);
        mappings[methodName] = key;
    }
}

ipcMain.on(IpcEvents.GET_PLUGIN_IPC_METHOD_MAP, e => {
    e.returnValue = PluginIpcMappings;
});
