/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { classNameFactory } from "@api/Styles";
import { EquicordDevs, IS_MAC } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Button, Text, useEffect, useRef, useState } from "@webpack/common";

import { cleanupCommandPaletteRuntime, registerBuiltInCommands, wrapChatBarChildren } from "./registry";
import { CommandPaletteSettingsPanel } from "./settingsPanel";
import { openCommandPalette } from "./ui";

const DEFAULT_KEYS = IS_MAC ? ["Meta", "Shift", "P"] : ["Control", "Shift", "P"];

const cl = classNameFactory("vc-cp-");
const isRecordingGlobal = false;
let openScheduled = false;

function formatKeybind(keybind: string | string[]): string {
    const isMac = navigator.platform.toUpperCase().includes("MAC");
    const keybindStr = Array.isArray(keybind) ? keybind.join("+").toUpperCase() : keybind;

    if (!isMac) {
        return keybindStr;
    }

    return keybindStr
        .replace(/CONTROL/g, "^") // Actual Control key → ^
        .replace(/CTRL/g, "⌘") // Command/Ctrl key → ⌘
        .replace(/META/g, "⌘"); // Meta/Command key → ⌘
}

function KeybindRecorder() {
    const [isListening, setIsListening] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const currentKeybind = settings.use(["hotkey"]).hotkey;

    useEffect(() => {
        if (!isListening) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            event.preventDefault();
            event.stopPropagation();

            if (["Control", "Shift", "Alt", "Meta"].includes(event.key)) {
                return;
            }

            const keys: string[] = [];
            if (IS_MAC && event.ctrlKey) {
                if (event.ctrlKey) keys.push("CONTROL");
                if (event.metaKey) keys.push("CTRL");
            } else if (event.ctrlKey) {
                keys.push("CTRL");
            }
            if (event.shiftKey) keys.push("SHIFT");
            if (event.altKey) keys.push("ALT");

            let mainKey = event.key.toUpperCase();
            if (mainKey === " ") mainKey = "SPACE";
            if (mainKey === "ESCAPE") mainKey = "ESC";

            keys.push(mainKey);

            settings.store.hotkey = keys.map(k => k.toLowerCase());
            setError(null);
            setIsListening(false);
        };

        const handleBlur = () => {
            setIsListening(false);
        };

        document.addEventListener("keydown", handleKeyDown, true);
        window.addEventListener("blur", handleBlur);

        buttonRef.current?.focus();

        return () => {
            document.removeEventListener("keydown", handleKeyDown, true);
            window.removeEventListener("blur", handleBlur);
        };
    }, [isListening]);

    const handleReset = () => {
        settings.store.hotkey = DEFAULT_KEYS;
        setError(null);
    };

    return (
        <div className="vc-cp-keybind-input">
            <div className="vc-cp-keybind-info">
                <Text variant="text-md/semibold">Command Palette Hotkey</Text>
                <Text variant="text-sm/normal" style={{ color: "var(--text-muted)" }}>
                    Hotkey used to open the command palette
                </Text>
                {error && (
                    <Text variant="text-xs/normal" className="vc-cp-keybind-conflict">
                        {error}
                    </Text>
                )}
            </div>
            <div className="vc-cp-keybind-controls">
                <button
                    ref={buttonRef}
                    className={`vc-cp-keybind-button ${isListening ? "listening" : ""}`}
                    onClick={() => setIsListening(true)}
                >
                    {isListening ? "Press any key..." : formatKeybind(currentKeybind)}
                </button>
                <Button
                    size={Button.Sizes.SMALL}
                    color={Button.Colors.PRIMARY}
                    onClick={handleReset}
                >
                    Reset
                </Button>
            </div>
        </div>
    );
}

export const settings = definePluginSettings({
    hotkey: {
        description: "Hotkey used to open the command palette",
        type: OptionType.COMPONENT,
        default: DEFAULT_KEYS,
        component: KeybindRecorder
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
    if (Array.isArray(raw) && raw.length > 0) {
        return raw;
    }
    if (typeof raw === "string" && (raw as string).trim()) {
        return (raw as string).split("+").map(part => part.trim()).filter(Boolean);
    }
    return DEFAULT_KEYS;
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
                match: /(\.buttons,.{0,50}children:)(.+?)\}/,
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
        if (isRecordingGlobal) return;
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
