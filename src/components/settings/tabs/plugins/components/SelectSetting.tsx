/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { PluginOptionSelect } from "@utils/types";
import { React, Select, useState } from "@webpack/common";

import { resolveError, SettingProps, SettingsSection } from "./Common";

export function SelectSetting({ option, pluginSettings, definedSettings, onChange, id }: SettingProps<PluginOptionSelect>) {
    const def = pluginSettings[id] ?? option.options?.find(o => o.default)?.value;

    const [state, setState] = useState<any>(def ?? null);
    const [error, setError] = useState<string | null>(null);

    function handleChange(newValue: any) {
        const isValid = option.isValid?.call(definedSettings, newValue) ?? true;

        setState(newValue);
        setError(resolveError(isValid));

        if (isValid === true) {
            onChange(newValue);
        }
    }

    return (
        <SettingsSection name={id} description={option.description} error={error}>
            <Select
                placeholder={option.placeholder ?? "Select an option"}
                options={option.options}
                maxVisibleItems={5}
                closeOnSelect={true}
                select={handleChange}
                isSelected={v => v === state}
                serialize={v => String(v)}
                isDisabled={option.disabled?.call(definedSettings) ?? false}
                {...option.componentProps}
            />
        </SettingsSection>
    );
}
