/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Margins } from "@utils/margins";
import { wordsFromCamel, wordsToTitle } from "@utils/text";
import { DefinedSettings, PluginOptionSlider } from "@utils/types";
import { Forms, Slider, useEffect, useState } from "@webpack/common";

interface Props<T> {
    option: T;
    onChange(newValue: any): void;
    pluginSettings: {
        [setting: string]: any;
        enabled: boolean;
    };
    id: string;
    onError(hasError: boolean): void;
    definedSettings?: DefinedSettings;
}

export function SettingSliderComponent({ option, pluginSettings, definedSettings, id, onChange, onError }: Props<PluginOptionSlider>) {
    const def = pluginSettings[id] ?? option.default;

    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        onError(error !== null);
    }, [error]);

    function handleChange(newValue: number): void {
        const isValid = option.isValid?.call(definedSettings, newValue) ?? true;
        if (typeof isValid === "string") setError(isValid);
        else if (!isValid) setError("Invalid input provided.");
        else {
            setError(null);
            onChange(newValue);
        }
    }

    return (
        <Forms.FormSection>
            <Forms.FormTitle>{wordsToTitle(wordsFromCamel(id))}</Forms.FormTitle>
            <Forms.FormText className={Margins.bottom20} type="description">{option.description}</Forms.FormText>
            <Slider
                disabled={option.disabled?.call(definedSettings) ?? false}
                markers={option.markers}
                minValue={option.markers[0]}
                maxValue={option.markers[option.markers.length - 1]}
                initialValue={def}
                onValueChange={handleChange}
                onValueRender={(v: number) => String(v.toFixed(2))}
                stickToMarkers={option.stickToMarkers ?? true}
                {...option.componentProps}
            />
        </Forms.FormSection>
    );
}
