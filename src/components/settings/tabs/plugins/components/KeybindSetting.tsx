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
import { DeleteIcon, ScreenshareIcon, WebsiteIcon } from "@components/Icons";
import { Switch } from "@components/settings";
import { KeybindShortcut, OptionType, PluginOptionKeybind, WindowShortcut } from "@utils/types";
import { GlobalShortcut } from "@vencord/discord-types";
import { findByCodeLazy, findByPropsLazy } from "@webpack";
import { Button, React, Text, Tooltip, useEffect, useLayoutEffect, useRef, useState } from "@webpack/common";

import { SettingProps, SettingsSection } from "./Common";

const ButtonClasses = findByPropsLazy("button", "sm", "secondary", "hasText", "buttonChildrenWrapper");
const FlexClasses = findByPropsLazy("flex", "horizontalReverse");
const ContainersClasses = findByPropsLazy("buttonContainer", "recorderContainer");
const RecorderClasses = findByPropsLazy("recorderContainer", "keybindInput");

// Discord mapping from keycodes array to string (mouse, keyboard, gamepad)
const keycodesToString = findByCodeLazy(".map(", ".KEYBOARD_KEY", ".KEYBOARD_MODIFIER_KEY", ".MOUSE_BUTTON", ".GAMEPAD_BUTTON") as (keys: GlobalShortcut) => string;

function getText(keys: KeybindShortcut, isGlobal: boolean) {
    return isGlobal ? keycodesToString(keys as GlobalShortcut).toLocaleUpperCase() : (keys as WindowShortcut).join("+").toLocaleUpperCase();
}

export function KeybindSetting({ option, pluginSettings, definedSettings, id, onChange }: SettingProps<PluginOptionKeybind>) {
    const global = option.global ?? false;
    const disabled = option.disabled || !Array.isArray(pluginSettings[id]) || pluginSettings[id].length === 0;
    const clearable = option.clearable ?? false;

    const [state, setState] = useState<KeybindShortcut>(pluginSettings[id] ?? []);

    const [enabled, setEnabled] = useState<boolean>(!disabled);
    const [error, setError] = useState<string | null>(null);

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
        updateKeybind(id, [], global);
        handleChange([]);
    }

    function toggleKeybind(enable: boolean) {
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
            <div className="vc-keybind-input">
                <Tooltip text={global ? "Global Keybind" : "Window Keybind"}>
                    {({ onMouseEnter, onMouseLeave }) => (
                        <div className="vc-keybind-input-icon" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
                            {global
                                ? <WebsiteIcon onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} color="var(--header-primary)" className={!enabled ? "disabled" : ""} />
                                : <ScreenshareIcon onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} color="var(--header-primary)" className={!enabled ? "disabled" : ""} />
                            }
                        </div>
                    )}
                </Tooltip>
                <Tooltip text={getText(state, global) || "No Keybind Set"}>
                    {({ onMouseEnter, onMouseLeave }) => (
                        <div className="vc-keybind-input-discord" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} >
                            <KeybindInput
                                keys={state}
                                global={global}
                                onChange={handleChange}
                                disabled={!enabled}
                            />
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
                            <Switch checked={enabled} onChange={handleEnabledChange} />
                        </div>
                    )}
                </Tooltip>
            </div>
        </SettingsSection>
    );
}

export function KeybindInput({ keys, global, onChange, disabled }: {
    keys: KeybindShortcut;
    global: boolean;
    onChange: (value: KeybindShortcut) => void;
    disabled?: boolean;
}) {
    const id = "key-recorder-" + Math.random().toString(36).slice(2, 9);

    const [recording, setRecording] = useState(false);
    const [state, setState] = useState<KeybindShortcut>(keys);

    const globalListenerRef = useRef(getDiscordUtils()?.inputCaptureRegisterElement);
    useEffect(() => {
        inputRef.current?.focus();
        return () => {
            if (globalListenerRef.current) globalListenerRef.current = undefined;
        };
    }, []);

    function updateRecording(e: React.MouseEvent<HTMLButtonElement>) {
        setRecording(!recording);
    }

    const inputRef = useRef<HTMLInputElement>(null);
    useLayoutEffect(() => {
        if (recording) {
            startRecording();
        } else {
            stopRecording();
        }
    }, [recording]);

    function startRecording() {
        // inputRef.current?.focus(); //TODO: make autofocus work correctly
        if (global) {
            if (!globalListenerRef.current) return;
            globalListenerRef.current(id, (keys: GlobalShortcut) => {
                if (keys.length > 0) {
                    setState(keys);
                    onChange(keys);
                }
                stopRecording();
            });
        } else {
            // Start recording window keybinds
        }
    }

    function stopRecording() {
        setRecording(false);
        // inputRef.current?.blur();
    }

    return (
        <div className={`vc-keybind-input-wrapper ${recording ? RecorderClasses.recording : ""} ${RecorderClasses.recorderContainer} ${disabled ? RecorderClasses.containerDisabled : ""}`}>
            <div className={`vc-keybind-input-layout ${RecorderClasses.recorderLayout} ${FlexClasses.flex} ${FlexClasses.horizontal}`}>
                <input autoFocus ref={inputRef} className={`vc-keybind-input-text ${RecorderClasses.keybindInput}`} id={id} type="text" readOnly disabled={disabled} value={getText(state, global)} placeholder="No Keybind Set" />
                <div className={`vc-keybind-input-button-container ${ContainersClasses.buttonContainer}`}>
                    <button className={`vc-keybind-input-button ${ButtonClasses.button} ${ButtonClasses.sm} ${recording ? ButtonClasses["critical-secondary"] : ButtonClasses.secondary} ${ButtonClasses.hasText}`} onClick={updateRecording} >
                        <div className={`vc-keybind-input-button-children-wrapper ${ButtonClasses.buttonChildrenWrapper}`}>
                            <div className={`vc-keybind-input-button-children ${ButtonClasses.buttonChildren}`}>
                                <Text variant="text-sm/medium" color="inherit">
                                    {!recording ? keys.length ? "Record Keybind" : "Edit Keybind" : "Stop Recording"}
                                </Text>
                            </div>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
}

