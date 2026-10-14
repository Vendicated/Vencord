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

import { isSettingDisabled } from "@api/PluginManager";
import { OptionType, PluginSettingBigIntDef, PluginSettingNumberDef } from "@utils/types";
import { React, TextInput, useEffect, useState } from "@webpack/common";

import { resolveError, SettingProps, SettingsSection } from "./Common";

export function NumberSetting({ setting, pluginSettings, definedSettings, id, onChange }: SettingProps<PluginSettingNumberDef | PluginSettingBigIntDef>) {
    function serialize(value: any) {
        if (setting.type === OptionType.BIGINT) return BigInt(value);
        return Number(value);
    }

    function canSerialize(value: any) {
        const str = String(value ?? "").trim();
        if (!str) return false;
        if (setting.type === OptionType.BIGINT) {
            return /^-?\d+$/.test(str);
        }
        return Number.isFinite(Number(str));
    }

    const def = `${pluginSettings[id] ?? setting.default ?? 0}`;

    const [state, setState] = useState<any>(def);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setState((prev: any) => {
            if (canSerialize(prev) && `${serialize(prev)}` === def) {
                return prev;
            }
            return def;
        });
        setError(null);
    }, [def]);

    function handleChange(newValue: any) {
        const isClamped = setting.type === OptionType.NUMBER && Number(newValue) >= Number.MAX_SAFE_INTEGER;
        const effectiveValue = isClamped ? `${Number.MAX_SAFE_INTEGER}` : newValue;
        const isValid = setting.isValid?.call(definedSettings, effectiveValue) ?? true;

        setError(resolveError(isValid));

        if (isValid === true && canSerialize(effectiveValue)) {
            onChange(serialize(effectiveValue));
        }

        setState(effectiveValue);
    }

    return (
        <SettingsSection name={setting.displayName} id={id} description={setting.description} error={error}>
            <TextInput
                type="number"
                pattern="-?[0-9]+"
                placeholder={setting.placeholder ?? "Enter a number"}
                value={state}
                onChange={handleChange}
                disabled={isSettingDisabled(definedSettings, setting)}
                {...setting.componentProps}
            />
        </SettingsSection>
    );
}
