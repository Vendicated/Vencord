/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { PluginDef } from "@utils/types";

export interface HookSpec {
    key: keyof PluginDef;
    api?: string;
    bind?: boolean;
    nonEmpty?: boolean;
}

export const pluginHooks: HookSpec[] = [
    { key: "commands", api: "CommandsAPI", nonEmpty: true },
    { key: "contextMenus" },
    { key: "managedStyle" },
    { key: "userProfileBadge", api: "BadgeAPI" },
    { key: "messagePopoverButton", api: "MessagePopoverAPI" },
    { key: "chatBarButton", api: "ChatInputButtonAPI" },
    { key: "onMessageClick", api: "MessageEventsAPI", bind: true },
    { key: "onBeforeMessageSend", api: "MessageEventsAPI", bind: true },
    { key: "onBeforeMessageEdit", api: "MessageEventsAPI", bind: true },
    { key: "renderMessageAccessory", api: "MessageAccessoriesAPI", bind: true },
    { key: "renderMessageDecoration", api: "MessageDecorationsAPI", bind: true },
    { key: "renderMemberListDecorator", api: "MemberListDecoratorsAPI", bind: true },
    { key: "toolboxActions", bind: true }
];

export function getBoundHookKeys() {
    return pluginHooks.filter(s => s.bind).map(s => s.key);
}

export function getRequiredApis(plugin: any) {
    return pluginHooks
        .filter(s => s.api && plugin[s.key] != null && (!s.nonEmpty || plugin[s.key].length > 0))
        .map(s => s.api!);
}

export function bindHooks(plugin: any, keys: readonly (keyof PluginDef)[]) {
    for (const key of keys) {
        const hook = plugin[key];
        if (typeof hook === "function") {
            plugin[key] = hook.bind(plugin);
        } else if (hook && typeof hook === "object") {
            for (const [name, fn] of Object.entries(hook)) {
                if (typeof fn === "function") plugin[key][name] = fn.bind(plugin);
            }
        }
    }
}
