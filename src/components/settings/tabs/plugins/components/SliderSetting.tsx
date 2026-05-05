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
import { PluginSettingSliderDef } from "@utils/types";
import { React, Slider, useState } from "@webpack/common";

import { resolveError, SettingProps, SettingsSection } from "./Common";

export function SliderSetting({ setting, pluginSettings, definedSettings, id, onChange }: SettingProps<PluginSettingSliderDef>) {
    const def = pluginSettings[id] ?? setting.default;

    const [error, setError] = useState<string | null>(null);

    function handleChange(newValue: number): void {
        const isValid = setting.isValid?.call(definedSettings, newValue) ?? true;

        setError(resolveError(isValid));

        if (isValid === true) {
            onChange(newValue);
        }
    }

    return (
        <SettingsSection name={id} description={setting.description} error={error}>
            <Slider
                markers={setting.markers}
                minValue={setting.markers[0]}
                maxValue={setting.markers[setting.markers.length - 1]}
                initialValue={def}
                onValueChange={handleChange}
                onValueRender={(v: number) => String(v.toFixed(2))}
                stickToMarkers={setting.stickToMarkers ?? true}
                disabled={isSettingDisabled(definedSettings, setting)}
                {...setting.componentProps}
            />
        </SettingsSection>
    );
}
