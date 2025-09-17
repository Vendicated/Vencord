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

/// <reference types="standalone-electron-types"/>

declare module "~plugins" {
    const plugins: Record<string, import("./utils/types").Plugin>;
    export default plugins;
    export const PluginMeta: Record<string, {
        folderName: string;
        userPlugin: boolean;
    }>;
    export const ExcludedPlugins: Record<string, "web" | "discordDesktop" | "vesktop" | "desktop" | "dev">;
}

declare module "~pluginNatives" {
    const pluginNatives: Record<string, Record<string, (event: Electron.IpcMainInvokeEvent, ...args: unknown[]) => unknown>>;
    export default pluginNatives;
}

declare module "~git-hash" {
    const hash: string;
    export default hash;
}
declare module "~git-remote" {
    const remote: string;
    export default remote;
}

declare module "file://*" {
    const content: string;
    export default content;
}

declare module "*.css";

declare module "*.css?managed" {
    const name: string;
    export default name;
}
