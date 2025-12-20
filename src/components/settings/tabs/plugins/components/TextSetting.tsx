/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { PluginOptionString } from "@utils/types";
import { React, TextInput, useState } from "@webpack/common";

import { resolveError, SettingProps, SettingsSection } from "./Common";

export function TextSetting({ option, pluginSettings, definedSettings, id, onChange }: SettingProps<PluginOptionString>) {
    const [state, setState] = useState(pluginSettings[id] ?? option.default ?? null);
    const [error, setError] = useState<string | null>(null);

    function handleChange(newValue: string) {
        const isValid = option.isValid?.call(definedSettings, newValue) ?? true;

        setState(newValue);
        setError(resolveError(isValid));

        if (isValid === true) {
            onChange(newValue);
        }
    }

    return (
        <SettingsSection name={id} description={option.description} error={error}>
            <TextInput
                type="text"
                placeholder={option.placeholder ?? "Enter a value"}
                value={state}
                onChange={handleChange}
                maxLength={null}
                disabled={option.disabled?.call(definedSettings) ?? false}
                {...option.componentProps}
            />
        </SettingsSection>
    );
}
