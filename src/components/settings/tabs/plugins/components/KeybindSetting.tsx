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

import "./KeybindSetting.css";

import { disableKeybind, enableKeybind, updateKeybind } from "@api/Keybinds";
import { getDiscordUtils } from "@api/Keybinds/globalManager";
import { classNameFactory } from "@api/Styles";
import { ScreenshareIcon, WebsiteIcon } from "@components/Icons";
import { Switch } from "@components/settings";
import { classes } from "@utils/index";
import { KeybindShortcut, OptionType, PluginOptionKeybind, WindowShortcut } from "@utils/types";
import { GlobalShortcut } from "@vencord/discord-types";
import { findByCodeLazy, findByPropsLazy } from "@webpack";
import { React, Text, Tooltip, useEffect, useRef, useState } from "@webpack/common";

import { SettingProps, SettingsSection } from "./Common";

const ButtonClasses = findByPropsLazy("button", "sm", "secondary", "hasText", "buttonChildrenWrapper");
const FlexClasses = findByPropsLazy("flex", "horizontalReverse");
const ContainersClasses = findByPropsLazy("buttonContainer", "recorderContainer");
const RecorderClasses = findByPropsLazy("recorderContainer", "keybindInput");

export const cl = classNameFactory("vc-plugins-setting-keybind");

// Discord mapping from keycodes array to string (mouse, keyboard, gamepad)
const keycodesToString = findByCodeLazy(".map(", ".KEYBOARD_KEY", ".KEYBOARD_MODIFIER_KEY", ".MOUSE_BUTTON", ".GAMEPAD_BUTTON") as (keys: GlobalShortcut) => string;

function getText(keys: KeybindShortcut, isGlobal: boolean) {
    return isGlobal ? keycodesToString(keys as GlobalShortcut).toLocaleUpperCase() : (keys as WindowShortcut).join("+").toLocaleUpperCase();
}

export function KeybindSetting({ option, pluginSettings, definedSettings, id, onChange }: SettingProps<PluginOptionKeybind>) {
    const inputId = "vc-key-recorder-" + id;
    const global = option.global ?? false;
    const disabled = option.disabled || !Array.isArray(pluginSettings[id]) || pluginSettings[id].length === 0;
    const clearable = option.clearable ?? true;

    const [state, setState] = useState<KeybindShortcut>(pluginSettings[id] ?? []);

    const [enabled, setEnabled] = useState<boolean>(IS_WEB && global ? false : !disabled);
    const [error, setError] = useState<string | null>(IS_WEB && global ? "Global keybinds are not supported on web" : null);

    function handleChange(newValue: KeybindShortcut) {
        const isValid = option.isValid?.call(definedSettings, newValue) ?? true;
        if (option.type === OptionType.KEYBIND && newValue && isValid) {
            setError(null);
            updateKeybind(id, newValue, global);
            toggleKeybind(enabled);
            setState(newValue);
            onChange(newValue);
        } else {
            setError("Invalid keybind format");
        }
    }

    function clearKeybind() {
        if (!clearable) return;
        updateKeybind(id, [], global);
        handleChange([]);
    }

    function toggleKeybind(enable: boolean) {
        if (IS_WEB && global) return;

        if (enable) {
            enableKeybind(id, global);
        } else {
            disableKeybind(id, global);
            clearKeybind();
        }
    }

    function handleEnabledChange(enabled: boolean) {
        toggleKeybind(enabled);
        setEnabled(enabled);
    }

    return (
        <SettingsSection name={id} description={option.description} error={error} inlineSetting={true}>
            <div className={cl("-layout")}>
                <Tooltip text={global ? "Global Keybind" : "Window Keybind"}>
                    {({ onMouseEnter, onMouseLeave }) => (
                        <div className={cl("-icon")} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
                            {global
                                ? <WebsiteIcon onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} color="var(--header-primary)" className={!enabled ? "disabled" : ""} />
                                : <ScreenshareIcon onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} color="var(--header-primary)" className={!enabled ? "disabled" : ""} />
                            }
                        </div>
                    )}
                </Tooltip>
                <Tooltip text={getText(state, global) || "No Keybind Set"}>
                    {({ onMouseEnter, onMouseLeave }) => (
                        <div className={cl("-discord")} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} >
                            <KeybindInput
                                id={inputId}
                                defaultKeys={state}
                                global={global}
                                onChange={handleChange}
                                disabled={!enabled}
                            />
                        </div>
                    )}
                </Tooltip>
                <Tooltip text={enabled ? "Disable/Clear Keybind" : "Enable Keybind"}>
                    {({ onMouseEnter, onMouseLeave }) => (
                        <div className={cl("-switch")} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
                            <Switch checked={enabled} onChange={handleEnabledChange} />
                        </div>
                    )}
                </Tooltip>
            </div>
        </SettingsSection>
    );
}

function KeybindInput({ id, defaultKeys, global, onChange, disabled }: {
    id: string;
    defaultKeys: KeybindShortcut;
    global: boolean;
    onChange: (value: KeybindShortcut) => void;
    disabled: boolean;
}) {
    const [recording, setRecording] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const stopCapture = useRef<() => void | undefined>(undefined);

    useEffect(() => {
        if (recording) {
            inputRef.current?.focus();
            startRecording();
        } else {
            stopRecording();
            inputRef.current?.blur();
        }
    }, [recording]);

    function handleOnblur() {
        stopRecording();
    }

    function updateRecording(e: React.MouseEvent<HTMLButtonElement>) {
        e.preventDefault();
        e.stopPropagation();
        setRecording(!recording);
    }
    useEffect(() => {
        return () => {
            if (stopCapture.current) {
                stopCapture.current();
                stopCapture.current = undefined;
            }
        };
    }, []);

    function handleKeybindCapture(keys: KeybindShortcut) {
        if (disabled) onChange([]);
        stopRecording();
        if (keys.length > 0) {
            onChange(keys);
        }
    }

    function startRecording() {
        setRecording(true);
        if (!stopCapture.current) {
            stopCapture.current = global ? getDiscordUtils()?.inputCaptureRegisterElement(id, handleKeybindCapture) : inputCaptureKeysWindow(id, handleKeybindCapture);
        }
    }

    function stopRecording() {
        setRecording(false);
    }

    return (
        <div className={classes(recording ? RecorderClasses.recording : "", RecorderClasses.recorderContainer, disabled ? RecorderClasses.containerDisabled : "")}>
            <div className={classes(RecorderClasses.recorderLayout, FlexClasses.flex, FlexClasses.horizontal)}>
                <input id={id} ref={inputRef} onBlur={handleOnblur} type="text" readOnly disabled={!recording} value={getText(defaultKeys, global)} placeholder="No Keybind Set" className={classes(RecorderClasses.keybindInput)} />
                <div className={classes(ContainersClasses.buttonContainer)}>
                    <button onClick={updateRecording} className={classes(ButtonClasses.button, ButtonClasses.sm, recording ? ButtonClasses["critical-secondary"] : ButtonClasses.secondary, ButtonClasses.hasText)} >
                        <div className={classes(ButtonClasses.buttonChildrenWrapper)}>
                            <div className={classes(ButtonClasses.buttonChildren)}>
                                <Text variant="text-sm/medium" color="inherit">
                                    {!recording ? defaultKeys.length ? "Record Keybind" : "Edit Keybind" : "Stop Recording"}
                                </Text>
                            </div>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
}

function inputCaptureKeysWindow(
    id: string,
    callback: (keys: WindowShortcut) => void
) {
    const keys: string[] = [];

    const inputElement = document.getElementById(id) as HTMLInputElement;

    const stopRecording = () => {
        recording = false;
        clearTimeout(timeoutId);
        inputElement.removeEventListener("keydown", keydownHandler, { capture: true });
        inputElement.removeEventListener("keyup", keyupHandler, { capture: true });
        inputElement.removeEventListener("mousedown", keydownHandler, { capture: true });
        inputElement.removeEventListener("mouseup", keydownHandler, { capture: true });
    };

    const invokeCallback = (keys: WindowShortcut) => {
        try {
            callback(keys);
        } catch (error) {
            console.error("Error in callback:", error);
        }
    };

    const keydownHandler = (event: KeyboardEvent | MouseEvent) => { // TODO: add gamepad detection
        if (!recording) return;
        event.stopImmediatePropagation();
        event.stopPropagation();
        event.preventDefault();

        if (event.type === "keydown") {
            const e = event as KeyboardEvent;
            if (e.repeat || keys.includes(e.key)) return;
            keys.push(e.key);
        }
        if (event.type === "mousedown") {
            const e = event as MouseEvent;
            keys.push("Mouse" + e.button);
        }

        if (keys.length === 4) { // Max 4 keys
            invokeCallback([...keys]);
            stopRecording();
            keys.length = 0;
        }
    };

    const keyupHandler = (event: KeyboardEvent | MouseEvent) => { // TODO: add gamepad detection
        if (!recording) return;
        event.stopImmediatePropagation();
        event.stopPropagation();
        event.preventDefault();
        if (event.type === "keyup" && (event as KeyboardEvent).key === keys[keys.length - 1]) {
            invokeCallback([...keys]);
            stopRecording();
        }
        if (event.type === "mouseup" && "Mouse" + (event as MouseEvent).button === keys[keys.length - 1]) {
            invokeCallback([...keys]);
            stopRecording();
        }
    };

    let recording = true;
    inputElement.addEventListener("keydown", keydownHandler, { capture: true });
    inputElement.addEventListener("keyup", keyupHandler, { capture: true });
    inputElement.addEventListener("mousedown", keydownHandler, { capture: true });
    inputElement.addEventListener("mouseup", keyupHandler, { capture: true });

    const timeoutId = setTimeout(() => {
        if (recording) {
            invokeCallback([...keys]);
            stopRecording();
        }
    }, 5 * 1000); // 5 seconds timeout

    return stopRecording;
}
