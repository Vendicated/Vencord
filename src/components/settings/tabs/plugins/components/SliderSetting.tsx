/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { PluginOptionSlider } from "@utils/types";
import { React, Slider, useState } from "@webpack/common";

import { resolveError, SettingProps, SettingsSection } from "./Common";

export function SliderSetting({ option, pluginSettings, definedSettings, id, onChange }: SettingProps<PluginOptionSlider>) {
    const def = pluginSettings[id] ?? option.default;

    const [error, setError] = useState<string | null>(null);

    function handleChange(newValue: number): void {
        const isValid = option.isValid?.call(definedSettings, newValue) ?? true;

        setError(resolveError(isValid));

        if (isValid === true) {
            onChange(newValue);
        }
    }

    return (
        <SettingsSection name={id} description={option.description} error={error}>
            <Slider
                markers={option.markers}
                minValue={option.markers[0]}
                maxValue={option.markers[option.markers.length - 1]}
                initialValue={def}
                onValueChange={handleChange}
                onValueRender={(v: number) => String(v.toFixed(2))}
                stickToMarkers={option.stickToMarkers ?? true}
                disabled={option.disabled?.call(definedSettings) ?? false}
                {...option.componentProps}
            />
        </SettingsSection>
    );
}

