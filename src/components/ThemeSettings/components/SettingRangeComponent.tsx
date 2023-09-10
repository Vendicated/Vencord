/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Forms, Slider } from "@webpack/common";

interface Props {
    label: string;
    name: string;
    value: string;
    default: number;
    min?: number;
    max?: number;
    step?: number;
    onChange: (value: string) => void;
}

export function SettingRangeComponent({ label, name, value, default: def, min, max, step, onChange }: Props) {
    const markers: number[] = [];

    // defaults taken from https://github.com/openstyles/stylus/wiki/Writing-UserCSS#default-value
    for (let i = (min ?? 0); i <= (max ?? 10); i += (step ?? 1)) {
        markers.push(i);
    }

    return (
        <Forms.FormSection>
            <Forms.FormTitle tag="h5">{label}</Forms.FormTitle>
            <Slider
                initialValue={parseInt(value, 10)}
                defaultValue={def}
                onValueChange={v => onChange(v.toString())}
                minValue={min}
                maxValue={max}

                markers={markers}
                stickToMarkers={true}
            />
        </Forms.FormSection>
    );
}
