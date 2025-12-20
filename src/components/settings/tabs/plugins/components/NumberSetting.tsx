/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
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
