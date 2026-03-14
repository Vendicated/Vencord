/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { CogWheel, CopyIcon, LinkIcon, MainSettingsIcon, NotesIcon, PluginIcon, RestartIcon } from "@components/Icons";
import type { ComponentType } from "react";

type IconComponent = ComponentType<{ className?: string; size?: string; height?: number; width?: number; }>;

export type CustomCommandIconId =
    | "auto"
    | "alias"
    | "quicklink"
    | "sequence"
    | "settings"
    | "notes"
    | "plugin"
    | "gear";

interface CustomCommandIconMeta {
    id: CustomCommandIconId;
    label: string;
    icon: IconComponent;
}

const CUSTOM_COMMAND_ICON_META: CustomCommandIconMeta[] = [
    { id: "auto", label: "Auto", icon: CogWheel },
    { id: "alias", label: "Alias", icon: CopyIcon },
    { id: "quicklink", label: "Quicklink", icon: LinkIcon },
    { id: "sequence", label: "Sequence", icon: RestartIcon },
    { id: "settings", label: "Settings", icon: MainSettingsIcon },
    { id: "notes", label: "Notes", icon: NotesIcon },
    { id: "plugin", label: "Plugin", icon: PluginIcon },
    { id: "gear", label: "Gear", icon: CogWheel }
];

const CUSTOM_COMMAND_ICON_MAP = new Map<CustomCommandIconId, IconComponent>(
    CUSTOM_COMMAND_ICON_META.map(item => [item.id, item.icon])
);

const CUSTOM_COMMAND_ICON_ID_SET = new Set<CustomCommandIconId>(
    CUSTOM_COMMAND_ICON_META.map(item => item.id)
);

export function isCustomCommandIconId(value: unknown): value is CustomCommandIconId {
    return typeof value === "string" && CUSTOM_COMMAND_ICON_ID_SET.has(value as CustomCommandIconId);
}

export function getCustomCommandIconMetaList() {
    return CUSTOM_COMMAND_ICON_META;
}

export function resolveCustomCommandDefaultIconId(actionType: "command" | "settings" | "url" | "macro"): Exclude<CustomCommandIconId, "auto"> {
    switch (actionType) {
        case "command":
            return "alias";
        case "url":
            return "quicklink";
        case "macro":
            return "sequence";
        case "settings":
            return "settings";
        default:
            return "gear";
    }
}

export function getCustomCommandIconById(iconId: CustomCommandIconId): IconComponent {
    return CUSTOM_COMMAND_ICON_MAP.get(iconId) ?? CogWheel;
}
