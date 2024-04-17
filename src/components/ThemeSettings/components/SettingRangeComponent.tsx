/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Forms, Slider, useMemo, useState } from "@webpack/common";

interface Props {
    label: string;
    name: string;
    default: number;
    min?: number;
    max?: number;
    step?: number;
    themeSettings: Record<string, string>;
}

export function SettingRangeComponent({ label, name, default: def, min, max, step, themeSettings }: Props) {
    const [value, setValue] = useState(themeSettings[name]);

    function handleChange(value: number) {
        const corrected = value.toString();

        setValue(corrected);

        themeSettings[name] = corrected;
    }

    const markers = useMemo(() => {
        const markers: number[] = [];

        // defaults taken from https://github.com/openstyles/stylus/wiki/Writing-UserCSS#default-value
        for (let i = (min ?? 0); i <= (max ?? 10); i += (step ?? 1)) {
            markers.push(i);
        }

        return markers;
    }, [min, max, step]);

    return (
        <Forms.FormSection>
            <Forms.FormTitle tag="h5">{label}</Forms.FormTitle>
            <Slider
                initialValue={parseInt(value, 10)}
                defaultValue={def}
                onValueChange={handleChange}
                minValue={min}
                maxValue={max}

                markers={markers}
                stickToMarkers={true}
            />
        </Forms.FormSection>
    );
}
