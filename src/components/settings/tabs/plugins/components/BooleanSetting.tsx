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

import { Switch } from "@components/settings/Switch";
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
        <SettingsSection name={id} description={option.description} error={error} inlineSetting>
            <Switch checked={state} onChange={handleChange} />
        </SettingsSection>
    );
}

