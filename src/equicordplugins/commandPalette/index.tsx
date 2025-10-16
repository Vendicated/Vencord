/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { EquicordDevs, IS_MAC } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

import { cleanupCommandPaletteRuntime, registerBuiltInCommands, wrapChatBarChildren } from "./registry";
import { CommandPaletteSettingsPanel } from "./settingsPanel";
import { openCommandPalette } from "./ui";

const DEFAULT_KEYS = IS_MAC ? ["Meta", "Shift", "P"] : ["Control", "Shift", "P"];
const DEFAULT_HOTKEY = DEFAULT_KEYS.join("+");

let openScheduled = false;

export const settings = definePluginSettings({
    hotkey: {
        description: "Hotkey used to open the command palette (format: Ctrl+Shift+P)",
        type: OptionType.STRING,
        default: DEFAULT_HOTKEY
    },
    visualStyle: {
        description: "Palette appearance",
        type: OptionType.SELECT,
        options: [
            { label: "Classic", value: "classic", default: true },
            { label: "Polished", value: "polished" }
        ]
    },
    showTags: {
        description: "Display tag chips for commands",
        type: OptionType.BOOLEAN,
        default: true
    },
    enableTagFilter: {
        description: "Show the tag filter bar",
        type: OptionType.BOOLEAN,
        default: true
    },
    customCommands: {
        description: "Manage custom command palette entries",
        type: OptionType.COMPONENT,
        component: CommandPaletteSettingsPanel
    }
});

function getConfiguredHotkey() {
    const raw = settings.store.hotkey;
    const hotkeyString = typeof raw === "string" ? raw.trim() : "";

    if (!hotkeyString) return DEFAULT_KEYS;

    const parts = hotkeyString
        .split("+")
        .map(part => part.trim())
        .filter(Boolean);

    return parts.length > 0 ? parts : DEFAULT_KEYS;
}

function matchesHotkey(e: KeyboardEvent) {
    const current = getConfiguredHotkey().map(key => key.toLowerCase());
    const pressed = e.key.toLowerCase();
    let nonModifierMatched = false;

    for (const key of current) {
        switch (key) {
            case "control":
            case "ctrl":
                if (!(e.ctrlKey || (IS_MAC && e.metaKey))) return false;
                continue;
            case "meta":
            case "cmd":
            case "command":
                if (!e.metaKey) return false;
                continue;
            case "shift":
                if (!e.shiftKey) return false;
                continue;
            case "alt":
            case "option":
                if (!e.altKey) return false;
                continue;
            default:
                if (pressed !== key) return false;
                nonModifierMatched = true;
        }
    }

    return nonModifierMatched || current.every(key => ["control", "ctrl", "meta", "cmd", "command", "shift", "alt", "option"].includes(key));
}

function shouldIgnoreTarget(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) return false;
    if (target.isContentEditable) return true;
    const tag = target.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

function hotkeyUsesModifiers() {
    const keys = getConfiguredHotkey();
    return keys.some(key => {
        const lower = key.toLowerCase();
        return lower === "control"
            || lower === "ctrl"
            || lower === "meta"
            || lower === "cmd"
            || lower === "command"
            || lower === "alt"
            || lower === "option";
    });
}

export default definePlugin({
    name: "CommandPalette",
    description: "Quickly run actions through a searchable command palette",
    authors: [EquicordDevs.justjxke],
    settings,
    patches: [
        {
            find: '"sticker")',
            replacement: {
                match: /(\.buttons,children:)(.+?)\}/,
                replace: "$1$self.wrapChatBarChildren($2)}"
            }
        }
    ],

    start() {
        registerBuiltInCommands();
        window.addEventListener("keydown", this.handleKeydown);
    },

    stop() {
        window.removeEventListener("keydown", this.handleKeydown);
        openScheduled = false;
        cleanupCommandPaletteRuntime();
    },

    handleKeydown(e: KeyboardEvent) {
        if (!matchesHotkey(e)) return;
        if (shouldIgnoreTarget(e.target) && !hotkeyUsesModifiers()) return;
        e.preventDefault();
        if (openScheduled) return;
        openScheduled = true;
        requestAnimationFrame(() => {
            openScheduled = false;
            openCommandPalette();
        });
    },

    wrapChatBarChildren,
});
