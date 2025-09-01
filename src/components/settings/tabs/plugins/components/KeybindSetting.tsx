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
import { WindowShortcut } from "@api/Keybinds/windowManager";
import { classNameFactory } from "@api/Styles";
import { ScreenshareIcon, WebsiteIcon } from "@components/Icons";
import { Switch } from "@components/settings";
import { classes } from "@utils/index";
import { KeybindShortcut, OptionType, PluginOptionKeybind } from "@utils/types";
import { GlobalShortcut } from "@vencord/discord-types";
import { findByCodeLazy, findByPropsLazy } from "@webpack";
import { React, Text, Tooltip, useEffect, useRef, useState } from "@webpack/common";

import { logger } from "..";
import { SettingProps, SettingsSection } from "./Common";

const ButtonClasses = findByPropsLazy("button", "sm", "secondary", "hasText", "buttonChildrenWrapper");
const FlexClasses = findByPropsLazy("flex", "horizontalReverse");
const ContainersClasses = findByPropsLazy("buttonContainer", "recorderContainer");
const RecorderClasses = findByPropsLazy("recorderContainer", "keybindInput");

export const cl = classNameFactory("vc-plugins-setting-keybind");

// Discord mapping from keycodes array to string (mouse, keyboard, gamepad)
const keycodesToString = findByCodeLazy(".map(", ".KEYBOARD_KEY", ".KEYBOARD_MODIFIER_KEY", ".MOUSE_BUTTON", ".GAMEPAD_BUTTON") as (keys: GlobalShortcut) => string;

function getText(keys: KeybindShortcut, isGlobal: boolean) {
    return isGlobal ? keycodesToString(keys as GlobalShortcut).toLocaleUpperCase() : (keys as WindowShortcut).map(key => key === " " ? "SPACE" : key.toLocaleUpperCase()).join("+");
}

export function KeybindSetting({ option, pluginSettings, definedSettings, id, onChange }: SettingProps<PluginOptionKeybind>) {
    const inputId = "vc-key-recorder-" + id;
    const global = IS_DISCORD_DESKTOP && option.global; // TODO: maybe check for IS_VESKTOP
    const disabled = option.disabled || !Array.isArray(pluginSettings[id]) || pluginSettings[id].length === 0;
    const value = disabled ? [] : pluginSettings[id] ?? option.default ?? [];

    const [state, setState] = useState<KeybindShortcut>(value);

    const [enabled, setEnabled] = useState<boolean>(!disabled);
    const [error, setError] = useState<string | null>(!IS_DISCORD_DESKTOP && global ? "Global keybinds are not supported on web, using window keybinds instead." : null);

    function handleChange(newValue: KeybindShortcut) {
        const isValid = option.isValid?.call(definedSettings, newValue) ?? true;
        if (option.type === OptionType.KEYBIND && newValue && isValid) {
            setError(null);
            updateKeybind(id, newValue, global);
            setState(newValue);
            onChange(newValue);
        } else {
            setError("Invalid keybind format");
        }
    }

    function toggleEnabled(enabled: boolean) {
        toggleKeybind(enabled);
        setEnabled(enabled);
    }

    function toggleKeybind(enabled: boolean) {
        if (enabled) {
            enableKeybind(id, global);
        } else {
            disableKeybind(id, global);
            clearKeybind();
        }
    }

    function clearKeybind() {
        updateKeybind(id, [], global);
        handleChange([]);
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
                            <Switch checked={enabled} onChange={toggleEnabled} />
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
    const stopCapture = useRef<() => void | undefined>(undefined);

    useEffect(() => {
        return () => {
            if (stopCapture.current) {
                stopCapture.current();
                stopCapture.current = undefined;
            }
        };
    }, []);

    function updateRecording(e: React.MouseEvent<HTMLButtonElement>) {
        e.preventDefault();
        e.stopPropagation();
        if (!recording) {
            startRecording();
        } else {
            stopRecording();
        }
    }

    function handleKeybindCapture(keys: KeybindShortcut) {
        stopRecording();
        onChange(keys);
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
                <FocusedInput id={id} onBlur={stopRecording} recording={recording} disabled={disabled} value={getText(defaultKeys, global)} />
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

function FocusedInput({ id, onBlur, recording, disabled, value }) {
    const inputRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (recording) {
            inputRef.current?.focus();
        } else {
            inputRef.current?.blur();
        }
    }, [recording]);

    return (
        <input id={id} onBlur={onBlur} type="text" readOnly disabled={disabled} value={value} placeholder="No Keybind Set" className={classes(RecorderClasses.keybindInput)} ref={inputRef} />
    );
}

function inputCaptureKeysWindow(
    id: string,
    callback: (keys: WindowShortcut) => void
) {
    const keys: string[] = [];
    const inputElement = document.getElementById(id) as HTMLInputElement;
    let timeout: NodeJS.Timeout | undefined = undefined;

    const startRecording = () => {
        inputElement.addEventListener("keydown", keydownHandler, { capture: true });
        inputElement.addEventListener("keyup", keyupHandler, { capture: true });
        inputElement.addEventListener("mousedown", keydownHandler, { capture: true });
        inputElement.addEventListener("mouseup", keyupHandler, { capture: true });
    };
    const stopRecording = () => {
        stopTimeout();
        inputElement.removeEventListener("keydown", keydownHandler, { capture: true });
        inputElement.removeEventListener("keyup", keyupHandler, { capture: true });
        inputElement.removeEventListener("mousedown", keydownHandler, { capture: true });
        inputElement.removeEventListener("mouseup", keyupHandler, { capture: true });
    };

    const startTimeout = () => {
        timeout = setTimeout(() => {
            invokeCallback([...keys]);
            keys.length = 0;
        }, 5 * 1000);
    };
    const stopTimeout = () => {
        clearTimeout(timeout);
        keys.length = 0;
    };

    const keydownHandler = (event: KeyboardEvent | MouseEvent) => { // TODO: add gamepad detection
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
        event.stopImmediatePropagation();
        event.stopPropagation();
        event.preventDefault();
        if (event.type === "keyup" && (event as KeyboardEvent).key === keys[keys.length - 1]) {
            invokeCallback([...keys]);
        }
        if (event.type === "mouseup" && "Mouse" + (event as MouseEvent).button === keys[keys.length - 1]) {
            invokeCallback([...keys]);
        }
    };
    const invokeCallback = (keys: WindowShortcut) => {
        try {
            callback(keys);
        } catch (error) {
            logger.error("Error in callback:", error);
        }
    };

    inputElement.addEventListener("focus", () => startTimeout());
    inputElement.addEventListener("blur", () => stopTimeout());
    startRecording();

    return stopRecording;
}
