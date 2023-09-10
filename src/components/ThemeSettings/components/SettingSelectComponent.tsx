/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { identity } from "@utils/misc";
import { ComponentTypes, Forms, Select } from "@webpack/common";

interface Props {
    label: string;
    name: string;
    options: {
        name: string;
        label: string;
        value: string;
    }[];
    value: string;
    default: string;
    onChange: (value: string) => void;
}

export function SettingSelectComponent({ label, name, options, value, default: def, onChange }: Props) {
    const opts = options.map(option => ({
        disabled: false,

        key: option.name,
        value: option.value,
        default: def === option.name,
        label: option.label
    } as ComponentTypes.SelectOption));

    return (
        <Forms.FormSection>
            <Forms.FormTitle tag="h5">{label}</Forms.FormTitle>
            <Select
                placeholder={label}
                key={name}
                options={opts}
                closeOnSelect={true}

                select={onChange}
                isSelected={v => v === value}
                serialize={identity}
            />
        </Forms.FormSection>
    );
}
