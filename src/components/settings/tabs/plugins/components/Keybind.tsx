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

import "./Keybind.css";

import { disableKeybind, enableKeybind, updateKeybind } from "@api/Keybinds";
import { DeleteIcon } from "@components/Icons";
import { KeybindShortcut, OptionType, PluginOptionKeybind, WindowShortcut } from "@utils/types";
import { GlobalShortcut } from "@vencord/discord-types";
import { findByCodeLazy, waitFor } from "@webpack";
import { Button, Keybind, React, Switch, Tooltip, useState } from "@webpack/common";

import { SettingProps, SettingsSection } from "./Common";

const os = "win32";
const ctrl = os === "win32" ? 0xa2 : os === "darwin" ? 0xe0 : 0x25;
let keybindModule: Record<string, number> | undefined;
let reversedKeybindModule: Record<number, string> | undefined;
waitFor(m => m?.ctrl && m.ctrl === ctrl, (module, id) => {
    keybindModule = module;
    reversedKeybindModule = keybindModule ? Object.entries(keybindModule).reduce((acc: Record<number, string>, [key, value]) => {
        acc[value] = key;
        return acc;
    }, {} as Record<number, string>) : {};
    console.log("reversedKeybindModule:", reversedKeybindModule);
}) as Record<string, number> | undefined;

// Discord mapping from keycodes array to string (mouse, keyboard, gamepad)
const keycodesToString = findByCodeLazy(".map(", ".KEYBOARD_KEY", ".KEYBOARD_MODIFIER_KEY", ".MOUSE_BUTTON", ".GAMEPAD_BUTTON") as (keys: GlobalShortcut) => string;

function globalToWindow(keys: GlobalShortcut): WindowShortcut {
    if (!reversedKeybindModule) throw new Error("Keybind module not loaded");
    return keys.map(key => {
        switch (key[0]) {
            case 0:
                return globalToKeyboardKey[reversedKeybindModule?.[key[1]] ?? ""] ?? "";
            case 1:
                return globalToMouseKey[key[1]] ?? "";
            case 2:
                return globalToKeyboardKey[reversedKeybindModule?.[key[1]] ?? ""] ?? "";
            case 3:
                return globalToGamepadKey[key[1]] ?? "";
            default:
                return "";
        }
    });
}

function windowToGlobal(keys: WindowShortcut): GlobalShortcut {
    if (!keybindModule) throw new Error("Keybind module not loaded");
    return keys.map(key => {
        if (key.startsWith("Gamepad")) return [3, reversedGlobalToGamepadKey[key] ?? -1];
        if (key.startsWith("Mouse")) return [1, reversedGlobalToMouseKey[key] ?? -1];
        return [0, keybindModule?.[reversedGlobalToKeyboardKey[key]] ?? -1];
    });
}

function getGlobalKeys(keys: KeybindShortcut, global: boolean): GlobalShortcut {
    if (!keys || keys.length === 0) return [];
    if (global && keys[0] && typeof keys[0] === "object") {
        return keys as GlobalShortcut;
    }
    if (!global && keys[0] && typeof keys[0] === "string") {
        return windowToGlobal(keys as WindowShortcut);
    }
    return [];
}

export function KeybindSetting({ option, pluginSettings, definedSettings, id, onChange }: SettingProps<PluginOptionKeybind>) {
    const global = option.global ?? false;
    const disabled = option.disabled || !Array.isArray(pluginSettings[id]) || pluginSettings[id].length === 0;
    const clearable = option.clearable ?? false;

    const [state, setState] = useState<GlobalShortcut>(getGlobalKeys(pluginSettings[id] ?? option.default, global));
    const [enabled, setEnabled] = useState<boolean>(!disabled);
    const [error, setError] = useState<string | null>(null);

    function handleChange(newValue: GlobalShortcut) {
        const isValid = option.isValid?.call(definedSettings, newValue) ?? true;

        if (option.type === OptionType.KEYBIND && newValue && isValid) {
            setState(newValue);
            setError(null);
            const newKeys = global ? newValue : globalToWindow(newValue);
            updateKeybind(id, newKeys, global);
            toggleKeybind(enabled);
            onChange(newKeys);
        } else {
            setError("Invalid keybind format");
        }
    }

    function clearKeybind() {
        updateKeybind(id, [], global);
        setState([]);
        onChange([]);
    }

    function toggleKeybind(enable: boolean) {
        if (enable) {
            enableKeybind(id, global);
        } else {
            disableKeybind(id, global);
            clearKeybind();
        }
    }

    function handleEnabledChange(value: boolean) {
        toggleKeybind(value);
        setEnabled(value);
    }

    return (
        <SettingsSection name={id} description={option.description} error={error} inlineSetting={true}>
            <div className="vc-keybind-input">
                <Tooltip text={keycodesToString(state).toUpperCase() || "No Keybind set..."}>
                    {({ onMouseEnter, onMouseLeave }) => (
                        <div className="vc-keybind-input-discord" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} >
                            <Keybind defaultValue={state} onChange={handleChange} disabled={!enabled} />
                        </div>
                    )}
                </Tooltip>
                {clearable && <Tooltip text="Clear Keybind">
                    {({ onMouseEnter, onMouseLeave }) => (
                        <Button size={Button.Sizes.ICON} look={Button.Looks.FILLED} color={Button.Colors.RED} onClick={clearKeybind} disabled={!enabled} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
                            <DeleteIcon />
                        </Button>
                    )}
                </Tooltip>}
                <Tooltip text={enabled ? "Disable/Clear Keybind" : "Enable Keybind"}>
                    {({ onMouseEnter, onMouseLeave }) => (
                        <div className="vc-keybind-input-switch" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
                            <Switch value={enabled} onChange={handleEnabledChange} />
                        </div>
                    )}
                </Tooltip>
            </div>
        </SettingsSection>
    );
}

const globalToGamepadKey = {
    0: "Gamepad0",
    1: "Gamepad1",
    2: "Gamepad2",
    3: "Gamepad3",
    4: "Gamepad4",
    5: "Gamepad5",
    6: "Gamepad6",
    7: "Gamepad7",
    8: "Gamepad8",
    9: "Gamepad9",
    10: "Gamepad10",
    11: "Gamepad11",
    12: "Gamepad12",
    13: "Gamepad13",
    14: "Gamepad14",
    15: "Gamepad15",
    16: "Gamepad16",
    17: "Gamepad17"
};
const reversedGlobalToGamepadKey = Object.entries(globalToGamepadKey).reduce((acc, [key, value]) => {
    acc[value] = Number(key);
    return acc;
}, {} as Record<string, number>);

const globalToMouseKey = {
    0: "Mouse0", // Cannot be triggered
    1: "Mouse2",
    2: "Mouse1",
    3: "Mouse3", // Cannot be triggered
    4: "Mouse4" // Cannot be triggered
};
const reversedGlobalToMouseKey = Object.entries(globalToMouseKey).reduce((acc, [key, value]) => {
    acc[value] = Number(key);
    return acc;
}, {} as Record<string, number>);

const globalToKeyboardKey = {
    "backspace": "Backspace",
    "tab": "Tab",
    "enter": "Enter",
    "break": "Pause",
    "caps lock": "CapsLock",
    "esc": "Escape",
    "space": " ",
    "page up": "PageUp",
    "page down": "PageDown",
    "end": "End",
    "home": "Home",
    "left": "ArrowLeft",
    "up": "ArrowUp",
    "right": "ArrowRight",
    "down": "ArrowDown",
    "print screen": "PrintScreen",
    "insert": "Insert",
    "del": "Delete",
    "0": "0",
    "1": "1",
    "2": "2",
    "3": "3",
    "4": "4",
    "5": "5",
    "6": "6",
    "7": "7",
    "8": "8",
    "9": "9",
    "a": "a",
    "b": "b",
    "c": "c",
    "d": "d",
    "e": "e",
    "f": "f",
    "g": "g",
    "h": "h",
    "i": "i",
    "j": "j",
    "k": "k",
    "l": "l",
    "m": "m",
    "n": "n",
    "o": "o",
    "p": "p",
    "q": "q",
    "r": "r",
    "s": "s",
    "t": "t",
    "u": "u",
    "v": "v",
    "w": "w",
    "x": "x",
    "y": "y",
    "z": "z",
    "meta": "Meta",
    "right meta": "ContextMenu",
    "shift": "Shift",
    "right shift": "Shift",
    "ctrl": "Control",
    "right ctrl": "Control",
    "alt": "Alt",
    "right alt": "Alt",
    "numpad 0": "0",
    "numpad 1": "1",
    "numpad 2": "2",
    "numpad 3": "3",
    "numpad 4": "4",
    "numpad 5": "5",
    "numpad 6": "6",
    "numpad 7": "7",
    "numpad 8": "8",
    "numpad 9": "9",
    "numpad *": "*",
    "numpad +": "+",
    "numpad -": "-",
    "numpad .": ".",
    "numpad /": "/",
    "numpad =": "=",
    "f1": "F1",
    "f2": "F2",
    "f3": "F3",
    "f4": "F4",
    "f5": "F5",
    "f6": "F6",
    "f7": "F7",
    "f8": "F8",
    "f9": "F9",
    "f10": "F10",
    "f11": "F11",
    "f12": "F12",
    "f13": "F13",
    "f14": "F14",
    "f15": "F15",
    "f16": "F16",
    "f17": "F17",
    "f18": "F18",
    "f19": "F19",
    "f20": "F20",
    "numpad clear": "NumLock",
    "scroll lock": "ScrollLock",
    "fast forward": "MediaTrackNext",
    "rewind": "MediaTrackPrevious",
    "play": "MediaPlayPause",
    ";": ";",
    "=": "=",
    ",": ",",
    "-": "-",
    ".": ".",
    "/": "/",
    "`": "`",
    "[": "[",
    "\\": "\\",
    "]": "]",
    "'": "'",
    "¬": "¬",
    "·": "·"
};
const reversedGlobalToKeyboardKey = Object.entries(globalToKeyboardKey).reduce((acc, [key, value]) => {
    acc[value] = key;
    return acc;
});
