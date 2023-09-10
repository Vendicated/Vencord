/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Forms, Switch } from "@webpack/common";

interface Props {
    label: string;
    name: string;
    value: string;
    onChange: (value: string) => void;
}

export function SettingBooleanComponent({ label, name, value, onChange }: Props) {
    return (
        <Forms.FormSection>
            <Switch
                key={name}
                value={value === "1"}
                onChange={v => onChange(v ? "1" : "0")}
                hideBorder
                style={{ marginBottom: "0.5em" }}
            >
                {label}
            </Switch>
        </Forms.FormSection>
    );
}
