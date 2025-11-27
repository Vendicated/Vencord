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

import keybindsManager from "@api/Keybinds/keybindsManager";
import { KeybindShortcut } from "@api/Keybinds/types";
import { classNameFactory } from "@api/Styles";
import { ScreenshareIcon, WebsiteIcon } from "@components/Icons";
import { Switch } from "@components/settings";
import { classes } from "@utils/index";
import { OptionType, PluginOptionKeybind } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { React, Text, Tooltip, useEffect, useRef, useState } from "@webpack/common";

import { SettingProps, SettingsSection } from "./Common";

const ButtonClasses = findByPropsLazy("button", "sm", "secondary", "hasText", "buttonChildrenWrapper");
const FlexClasses = findByPropsLazy("flex", "horizontalReverse");
const ContainersClasses = findByPropsLazy("buttonContainer", "recorderContainer");
const RecorderClasses = findByPropsLazy("recorderContainer", "keybindInput");

export const cl = classNameFactory("vc-plugins-setting-keybind");

export function KeybindSetting({ option, pluginSettings, definedSettings, id, onChange }: SettingProps<PluginOptionKeybind>) {
    const inputId = "vc-key-recorder-" + id;
    const { global } = option;
    const available = (global ? IS_DISCORD_DESKTOP : window) && keybindsManager.isAvailable(global);

    const [state, setState] = useState<KeybindShortcut>(pluginSettings[id] ?? option.default ?? []);
    const [enabled, setEnabled] = useState<boolean>(state.length > 0);
    const [error, setError] = useState<string | null>(global && !IS_DISCORD_DESKTOP ? "Global keybinds are only available in the desktop app." : null);

    function handleChange(newValue: KeybindShortcut) {
        if (!available) return;
        const isValid = option.isValid?.call(definedSettings, newValue) ?? true;
        if (option.type === OptionType.KEYBIND && newValue && isValid) {
            setError(null);
            keybindsManager.updateKeybind(id, newValue, global);
            setState(newValue);
            onChange(newValue);
        } else {
            setError("Invalid keybind format");
        }
    }

    function toggleEnabled(enabled: boolean) {
        if (!available) return;
        toggleKeybind(enabled);
        setEnabled(enabled);
    }

    function toggleKeybind(enabled: boolean) {
        if (enabled) {
            keybindsManager.enableKeybind(id, global);
        } else {
            keybindsManager.disableKeybind(id, global);
            clearKeybind();
        }
    }

    function clearKeybind() {
        keybindsManager.updateKeybind(id, [], global);
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
                <Tooltip text={keybindsManager.keysToString(state, global) || "No Keybind Set"}>
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
        if (keys.length) {
            onChange(keys);
        }
    }

    function startRecording() {
        setRecording(true);
        if (!stopCapture.current) {
            stopCapture.current = keybindsManager.inputCaptureKeys(id, handleKeybindCapture, global);
        }
    }

    function stopRecording() {
        setRecording(false);
    }

    return (
        <div className={classes(recording ? RecorderClasses.recording : "", RecorderClasses.recorderContainer, disabled ? RecorderClasses.containerDisabled : "")}>
            <div className={classes(RecorderClasses.recorderLayout, FlexClasses.flex, FlexClasses.horizontal)}>
                <FocusedInput id={id} onBlur={stopRecording} recording={recording} disabled={disabled} value={keybindsManager.keysToString(defaultKeys, global)} />
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
