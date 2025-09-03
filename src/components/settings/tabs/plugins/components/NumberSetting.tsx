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

import { OptionType, PluginOptionNumber } from "@utils/types";
import { React, TextInput, useState } from "@webpack/common";

import { resolveError, SettingProps, SettingsSection } from "./Common";

const MAX_SAFE_NUMBER = BigInt(Number.MAX_SAFE_INTEGER);

export function NumberSetting({ option, pluginSettings, definedSettings, id, onChange }: SettingProps<PluginOptionNumber>) {
    function serialize(value: any) {
        if (option.type === OptionType.BIGINT) return BigInt(value);
        return Number(value);
    }

    const [state, setState] = useState<any>(`${pluginSettings[id] ?? option.default ?? 0}`);
    const [error, setError] = useState<string | null>(null);

    function handleChange(newValue: any) {
        const isValid = option.isValid?.call(definedSettings, newValue) ?? true;

        setError(resolveError(isValid));

        if (isValid === true) {
            onChange(serialize(newValue));
        }

        if (option.type === OptionType.NUMBER && BigInt(newValue) >= MAX_SAFE_NUMBER) {
            setState(`${Number.MAX_SAFE_INTEGER}`);
        } else {
            setState(newValue);
        }
    }

    return (
        <SettingsSection name={id} description={option.description} error={error}>
            <TextInput
                type="number"
                pattern="-?[0-9]+"
                placeholder={option.placeholder ?? "Enter a number"}
                value={state}
                onChange={handleChange}
                disabled={option.disabled?.call(definedSettings) ?? false}
                {...option.componentProps}
            />
        </SettingsSection>
    );
}
