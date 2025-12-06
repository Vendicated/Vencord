/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Divider } from "@components/Divider";
import ErrorBoundary from "@components/ErrorBoundary";
import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { settings } from "@equicordplugins/channelTabs/util";
import { IS_MAC } from "@utils/constants";
import { Button, React, Text, useEffect, useRef, useState } from "@webpack/common";
import { JSX } from "react";

interface KeybindInputProps {
    label: string;
    description: string;
    settingKey: "closeTabKeybind" | "newTabKeybind" | "cycleTabForwardKeybind" | "cycleTabBackwardKeybind";
    enabledKey?: "enableCloseTabShortcut" | "enableNewTabShortcut" | "enableTabCycleShortcut";
}

function KeybindInput({ label, description, settingKey, enabledKey }: KeybindInputProps) {
    const settingsValues = settings.use([settingKey]);
    const currentKeybind = settingsValues[settingKey];
    const [isListening, setIsListening] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!isListening) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            event.preventDefault();
            event.stopPropagation();

            // Ignore if only modifier keys are pressed
            if (["Control", "Shift", "Alt", "Meta"].includes(event.key)) {
                return;
            }

            // Build keybind string
            const keys: string[] = [];
            if (IS_MAC && event.ctrlKey) {
                if (event.ctrlKey) keys.push("CONTROL");
                if (event.metaKey) keys.push("CTRL");
            } else if (event.ctrlKey) {
                keys.push("CTRL");
            }
            if (event.shiftKey) keys.push("SHIFT");
            if (event.altKey) keys.push("ALT");

            // Normalize the key name
            let mainKey = event.key.toUpperCase();
            if (mainKey === " ") mainKey = "SPACE";
            if (mainKey === "ESCAPE") mainKey = "ESC";

            keys.push(mainKey);

            const keybindString = keys.join("+");

            // Check for conflicts with other keybinds
            const allKeybinds = {
                closeTabKeybind: settings.store.closeTabKeybind,
                newTabKeybind: settings.store.newTabKeybind,
                cycleTabForwardKeybind: settings.store.cycleTabForwardKeybind,
                cycleTabBackwardKeybind: settings.store.cycleTabBackwardKeybind
            };

            // Check if this keybind is already used by another setting
            const conflictKey = Object.entries(allKeybinds).find(
                ([key, value]) => key !== settingKey && value === keybindString
            );

            if (conflictKey) {
                setError(`This keybind is already used by: ${conflictKey[0]}`);
                setTimeout(() => setError(null), 3000);
                setIsListening(false);
                return;
            }

            settings.store[settingKey] = keybindString;
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
    }, [isListening, settingKey]);

    const handleReset = () => {
        const defaults = {
            closeTabKeybind: "CTRL+W",
            newTabKeybind: "CTRL+T",
            cycleTabForwardKeybind: "CTRL+TAB",
            cycleTabBackwardKeybind: "CTRL+SHIFT+TAB"
        };
        settings.store[settingKey] = defaults[settingKey];
        setError(null);
    };

    const isEnabled = enabledKey ? settings.use([enabledKey])[enabledKey] : true;

    return (
        <div className="channelTabs-keybind-input">
            <div className="channelTabs-keybind-info">
                <Text variant="text-md/semibold">{label}</Text>
                <Text variant="text-sm/normal" style={{ color: "var(--text-muted)" }}>
                    {description}
                </Text>
                {!isEnabled && (
                    <Text variant="text-xs/normal" style={{ color: "var(--text-feedback-critical)" }}>
                        This shortcut is currently disabled
                    </Text>
                )}
                {error && (
                    <Text variant="text-xs/normal" className="channelTabs-keybind-conflict">
                        {error}
                    </Text>
                )}
            </div>
            <div className="channelTabs-keybind-controls">
                <button
                    ref={buttonRef}
                    className={`channelTabs-keybind-button ${isListening ? "listening" : ""}`}
                    onClick={() => setIsListening(true)}
                    disabled={!isEnabled}
                >
                    {isListening ? "Press any key..." : formatKeybind(currentKeybind)}
                </button>
                <Button
                    size={Button.Sizes.SMALL}
                    color={Button.Colors.PRIMARY}
                    onClick={handleReset}
                    disabled={!isEnabled}
                >
                    Reset
                </Button>
            </div>
        </div>
    );
}

function formatKeybind(keybind: string): string {
    const isMac = navigator.platform.toUpperCase().includes("MAC");

    if (!isMac) {
        return keybind;
    }

    // special case: CTRL+TAB must stay as CTRL on Mac (⌘+TAB is system app switcher)
    if (keybind.includes("CTRL+TAB") || keybind.includes("CTRL+SHIFT+TAB")) {
        return keybind.replace("CTRL", "^"); // Show control symbol on Mac
    }

    // for other shortcuts, replace CTRL with CMD symbol on Mac
    return keybind.replace("CTRL", "⌘");
    // this is such a bad way to do this but i dont know man
}

export function KeybindSettings(): JSX.Element {
    const handleResetAll = () => {
        settings.store.closeTabKeybind = "CTRL+W";
        settings.store.newTabKeybind = "CTRL+T";
        settings.store.cycleTabForwardKeybind = "CTRL+TAB";
        settings.store.cycleTabBackwardKeybind = "CTRL+SHIFT+TAB";
    };

    return (
        <ErrorBoundary>
            <Divider />
            <div className="channelTabs-keybind-settings">
                <Heading>Keyboard Shortcuts</Heading>
                <Paragraph>
                    Click a button and press your desired key combination. Modifiers like CTRL, SHIFT, and ALT are supported.
                </Paragraph>

                <KeybindInput
                    label="Close Tab"
                    description="Close the currently active tab"
                    settingKey="closeTabKeybind"
                    enabledKey="enableCloseTabShortcut"
                />

                <KeybindInput
                    label="New Tab"
                    description="Open a new tab with the current channel"
                    settingKey="newTabKeybind"
                    enabledKey="enableNewTabShortcut"
                />

                <KeybindInput
                    label="Cycle Tabs Forward"
                    description="Switch to the next tab (wraps around to first)"
                    settingKey="cycleTabForwardKeybind"
                    enabledKey="enableTabCycleShortcut"
                />

                <KeybindInput
                    label="Cycle Tabs Backward"
                    description="Switch to the previous tab (wraps around to last)"
                    settingKey="cycleTabBackwardKeybind"
                    enabledKey="enableTabCycleShortcut"
                />

                <div style={{ marginTop: "16px" }}>
                    <Button
                        color={Button.Colors.RED}
                        onClick={handleResetAll}
                    >
                        Reset All to Defaults
                    </Button>
                </div>
            </div>
        </ErrorBoundary>
    );
}
