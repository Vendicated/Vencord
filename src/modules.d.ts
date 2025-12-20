/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

declare module "~plugins" {
    const plugins: Record<string, import("./utils/types").Plugin>;
    export default plugins;
    export const PluginMeta: Record<string, {
        folderName: string;
        userPlugin: boolean;
    }>;
    export const ExcludedPlugins: Record<string, "web" | "discordDesktop" | "vesktop" | "desktop" | "dev">;
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
