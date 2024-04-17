/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Forms, Switch, useState } from "@webpack/common";

interface Props {
    label: string;
    name: string;
    themeSettings: Record<string, string>;
}

export function SettingBooleanComponent({ label, name, themeSettings }: Props) {
    const [value, setValue] = useState(themeSettings[name]);

    function handleChange(value: boolean) {
        const corrected = value ? "1" : "0";

        setValue(corrected);

        themeSettings[name] = corrected;
    }

    return (
        <Forms.FormSection>
            <Switch
                key={name}
                value={value === "1"}
                onChange={handleChange}
                hideBorder
                style={{ marginBottom: "0.5em" }}
            >
                {label}
            </Switch>
        </Forms.FormSection>
    );
}
