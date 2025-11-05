/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { classNameFactory } from "@api/Styles";
import { EquicordDevs, IS_MAC } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { useState } from "@webpack/common";

import { cleanupCommandPaletteRuntime, registerBuiltInCommands, wrapChatBarChildren } from "./registry";
import { CommandPaletteSettingsPanel } from "./settingsPanel";
import { openCommandPalette } from "./ui";

const DEFAULT_KEYS = IS_MAC ? ["Meta", "Shift", "P"] : ["Control", "Shift", "P"];

const cl = classNameFactory("vc-cp-");
let isRecordingGlobal = false;
let openScheduled = false;

export const settings = definePluginSettings({
    hotkey: {
        description: "Hotkey used to open the command palette",
        type: OptionType.COMPONENT,
        default: DEFAULT_KEYS,
        component: () => {
            const [isRecording, setIsRecording] = useState(false);
            const [currentKeys, setCurrentKeys] = useState<string[]>([]);

            const recordKeybind = (setIsRecording: (value: boolean) => void) => {
                const pressedKeys: Set<string> = new Set();
                const keyLists: string[][] = [];
                let recordingTimeout: number | null = null;

                setIsRecording(true);
                setCurrentKeys([]);
                isRecordingGlobal = true;

                const updateKeys = () => {
                    const currentKeyArray = Array.from(pressedKeys);
                    setCurrentKeys(currentKeyArray);
                    keyLists.push(currentKeyArray);

                    if (recordingTimeout) {
                        clearTimeout(recordingTimeout);
                    }
                    recordingTimeout = window.setTimeout(() => {
                        const longestArray = keyLists.reduce((a, b) => a.length > b.length ? a : b);
                        if (longestArray.length > 0) {
                            settings.store.hotkey = longestArray.map(key => key.toLowerCase());
                        }
                        setIsRecording(false);
                        setCurrentKeys([]);
                        isRecordingGlobal = false;
                        document.removeEventListener("keydown", keydownListener);
                        document.removeEventListener("keyup", keyupListener);
                    }, 500);
                };

                const getKeyName = (key: string) => {
                    const keyMap: Record<string, string> = {
                        "Control": "Control",
                        "Shift": "Shift",
                        "Alt": "Alt",
                        "Meta": "Meta"
                    };
                    return keyMap[key] || key;
                };

                const keydownListener = (e: KeyboardEvent) => {
                    if (e.ctrlKey) pressedKeys.add("Control");
                    else pressedKeys.delete("Control");

                    if (e.shiftKey) pressedKeys.add("Shift");
                    else pressedKeys.delete("Shift");

                    if (e.altKey) pressedKeys.add("Alt");
                    else pressedKeys.delete("Alt");

                    if (e.metaKey) pressedKeys.add("Meta");
                    else pressedKeys.delete("Meta");

                    const keyName = getKeyName(e.key);
                    pressedKeys.add(keyName);

                    updateKeys();
                };

                const keyupListener = (e: KeyboardEvent) => {
                    if (e.ctrlKey) pressedKeys.add("Control");
                    else pressedKeys.delete("Control");

                    if (e.shiftKey) pressedKeys.add("Shift");
                    else pressedKeys.delete("Shift");

                    if (e.altKey) pressedKeys.add("Alt");
                    else pressedKeys.delete("Alt");

                    if (e.metaKey) pressedKeys.add("Meta");
                    else pressedKeys.delete("Meta");

                    const keyName = getKeyName(e.key);
                    pressedKeys.delete(keyName);

                    updateKeys();
                };

                document.addEventListener("keydown", keydownListener);
                document.addEventListener("keyup", keyupListener);
            };

            const getKeySymbol = (key: string) => {
                const normalizedKey = key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
                const keySymbols: Record<string, string> = {
                    "Control": "⌃",
                    "Shift": "⇧",
                    "Alt": "⌥",
                    "Meta": "⌘"
                };
                return keySymbols[normalizedKey] || "";
            };

            const displayKeys = isRecording ? currentKeys : settings.store.hotkey;
            const displayText = displayKeys.length > 0
                ? displayKeys.map(word => {
                    const symbol = getKeySymbol(word);
                    const displayWord = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
                    return symbol ? `${symbol}${displayWord}` : displayWord;
                }).join(" + ")
                : "No keybind set";

            return (
                <>
                    <div className={cl("key-recorder-container")}>
                        <div className={`${cl("key-recorder")} ${isRecording ? cl("recording") : ""}`}>
                            <span className={cl("key-display")}>{displayText}</span>
                            <button className={`${cl("key-recorder-button")} ${isRecording ? cl("recording-button") : ""}`} onClick={() => recordKeybind(setIsRecording)} disabled={isRecording}>
                                {isRecording ? "Recording..." : "Record keybind"}
                            </button>
                        </div>
                    </div>
                </>
            );
        }
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
