/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Switch } from "@components/Switch";
import { PluginOptionBoolean } from "@utils/types";
import { React, useState } from "@webpack/common";

import { resolveError, SettingProps, SettingsSection } from "./Common";

export function BooleanSetting({ option, pluginSettings, definedSettings, id, onChange }: SettingProps<PluginOptionBoolean>) {
    const def = pluginSettings[id] ?? option.default;

    const [state, setState] = useState(def ?? false);
    const [error, setError] = useState<string | null>(null);

    function handleChange(newValue: boolean): void {
        const isValid = option.isValid?.call(definedSettings, newValue) ?? true;

        setState(newValue);
        setError(resolveError(isValid));

        if (isValid === true) {
            onChange(newValue);
        }
    }

    return (
        <SettingsSection tag="label" name={id} description={option.description} error={error} inlineSetting>
            <Switch
                checked={state}
                onChange={handleChange}
                disabled={option.disabled?.call(definedSettings) ?? false}
            />
        </SettingsSection>
    );
}

