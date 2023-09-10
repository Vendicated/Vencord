/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Forms, TextInput, useState } from "@webpack/common";

interface Props {
    label: string;
    name: string;
    themeSettings: Record<string, string>;
}

export function SettingNumberComponent({ label, name, themeSettings }: Props) {
    const [value, setValue] = useState(themeSettings[name]);

    function handleChange(value: string) {
        setValue(value);

        themeSettings[name] = value;
    }

    return (
        <Forms.FormSection>
            <Forms.FormTitle tag="h5">{label}</Forms.FormTitle>
            <TextInput
                type="number"
                pattern="-?[0-9]+"
                key={name}
                value={value}
                onChange={handleChange}
            />
        </Forms.FormSection>
    );
}
