/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Heading } from "@components/Heading";
import { TextInput } from "@webpack/common";

interface Props {
    label: string;
    name: string;
    themeSettings: Record<string, string>;
}

export function SettingTextComponent({ label, name, themeSettings }: Props) {
    function handleChange(value: string) {
        themeSettings[name] = value;
    }

    return (
        <section>
            <Heading>{label}</Heading>
            <TextInput
                key={name}
                value={themeSettings[name]}
                onChange={handleChange}
            />
        </section>
    );
}
