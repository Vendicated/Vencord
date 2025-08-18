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

import { DeleteIcon } from "@components/Icons";
import { OptionType, PluginOptionKeybind } from "@utils/types";
import { GlobalShortcut } from "@vencord/discord-types";
import { Button, Keybind, React, Tooltip, useState } from "@webpack/common";

import { SettingProps, SettingsSection } from "./Common";

export function KeybindSetting({ option, pluginSettings, definedSettings, id, onChange }: SettingProps<PluginOptionKeybind>) {
    const clearable = option.clearable ?? true;

    const [state, setState] = useState<GlobalShortcut>(pluginSettings[id] ?? option.default ?? []);
    const [error, setError] = useState<string | null>(null);

    function clearKeybind() {
        setState([]);
        onChange([]);
    }

    function handleChange(newValue: GlobalShortcut) {
        const isValid = option.isValid?.call(definedSettings, newValue) ?? true;

        if (option.type === OptionType.KEYBIND && newValue && isValid) {
            setState(newValue);
            onChange(newValue);
        } else {
            setError("Invalid keybind format");
        }
    }

    return (
        <SettingsSection name={id} description={option.description} error={error} inlineSetting={true}>
            <div className="vc-keybind-input">
                <Keybind defaultValue={state} onChange={handleChange} />
                {clearable && <Tooltip text="Clear keybind">
                    {({ onMouseEnter, onMouseLeave }) => (
                        <Button size={Button.Sizes.ICON} look={Button.Looks.FILLED} color={Button.Colors.RED} onClick={clearKeybind} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
                            <DeleteIcon />
                        </Button>
                    )}
                </Tooltip>}
            </div>
        </SettingsSection>
    );
}
