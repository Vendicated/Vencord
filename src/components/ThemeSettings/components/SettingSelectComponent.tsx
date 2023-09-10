/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { identity } from "@utils/misc";
import { ComponentTypes, Forms, Select, useMemo, useState } from "@webpack/common";

interface Props {
    label: string;
    name: string;
    options: {
        name: string;
        label: string;
        value: string;
    }[];
    default: string;
    themeSettings: Record<string, string>;
}

export function SettingSelectComponent({ label, name, options, default: def, themeSettings }: Props) {
    const [value, setValue] = useState(themeSettings[name]);

    function handleChange(value: string) {
        setValue(value);

        themeSettings[name] = value;
    }

    const opts = useMemo(() => options.map(option => ({
        disabled: false,

        key: option.name,
        value: option.value,
        default: def === option.name,
        label: option.label
    } satisfies ComponentTypes.SelectOption)), [options, def]);

    return (
        <Forms.FormSection>
            <Forms.FormTitle tag="h5">{label}</Forms.FormTitle>
            <Select
                placeholder={label}
                key={name}
                options={opts}
                closeOnSelect={true}

                select={handleChange}
                isSelected={v => v === value}
                serialize={identity}
            />
        </Forms.FormSection>
    );
}
