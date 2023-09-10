/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Forms, TextInput } from "@webpack/common";

interface Props {
    label: string;
    name: string;
    value: string;
    onChange: (value: string) => void;
}

export function SettingNumberComponent({ label, name, value, onChange }: Props) {
    return (
        <Forms.FormSection>
            <Forms.FormTitle tag="h5">{label}</Forms.FormTitle>
            <TextInput
                type="number"
                pattern="-?[0-9]+"
                key={name}
                value={value}
                onChange={onChange}
            />
        </Forms.FormSection>
    );
}
