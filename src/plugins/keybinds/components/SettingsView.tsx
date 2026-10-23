/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { Text, TextInput, useState } from "@webpack/common";

import { keybinds } from "./keybinds";
import { CheckboxRow, cl } from "./utils";

function keybindStr(key, ctrl, shift, alt) {
    return (ctrl ? "Ctrl+" : "") + (shift ? "Shift+" : "") + (alt ? "Alt+" : "") + key;
}


function KeybindDetector({ keybindSettings: k }) {

    const [listening, setListening] = useState(false);

    if (!listening)
        return (
            <div onClick={() => setListening(true)}>
                <TextInput editable={false} value={keybindStr(k.key, k.ctrl, k.shift, k.alt)} />
            </div >
        );

    return (
        <div>
            <TextInput placeholder="Press a key combination" value="" className={cl("keybind-input")} onKeyDown={e => {
                e.preventDefault();
                e.stopPropagation();
                if (e.key === "Escape") {
                    setListening(false);
                    return;
                }
                if (e.key === "Control" || e.key === "Shift" || e.key === "Alt") {
                    return;
                }
                k.key = e.key.toUpperCase();
                k.ctrl = e.ctrlKey;
                k.shift = e.shiftKey;
                k.alt = e.altKey;
                setListening(false);
            }} />
        </div>
    );

}

function KeybindSettings({ keybind, settings }) {
    const keybindData = keybinds[keybind];
    const keybindSettings = settings.store[keybind];

    return (
        <div className={cl("settings-row")}>
            <CheckboxRow value={keybindSettings.enabled} onChange={_ => keybindSettings.enabled = !keybindSettings.enabled}>
                <div className={cl("settings-row-content")}>
                    <div >
                        <Text variant="eyebrow">{keybindData.name}</Text>
                        <Text variant="text-sm/normal">{keybindData.desc}</Text>
                    </div>
                    <KeybindDetector keybindSettings={keybindSettings} />
                </div>
            </CheckboxRow>
        </div>
    );
}

export function SettingsView({ settings }) {
    return (
        <div>
            {Object.keys(keybinds).map(keybind => {
                return <KeybindSettings keybind={keybind} settings={settings} key={keybind} />;
            })}
        </div>
    );
}
