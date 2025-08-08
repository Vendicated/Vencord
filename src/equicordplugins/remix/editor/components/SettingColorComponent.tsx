/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// brutally ripped out of usercss
// (remove when usercss is merged)

import "./colorStyles.css";

import { classNameFactory } from "@api/Styles";
import { ColorPicker, Forms } from "@webpack/common";

const cl = classNameFactory("vc-remix-settings-color-");

interface Props {
    name: string;
    color: number;
    onChange(value: string): void;
}

function hexToColorString(color: number): string {
    return `#${color.toString(16).padStart(6, "0")}`;
}

export function SettingColorComponent({ name, onChange, color }: Props) {
    function handleChange(newColor: number) {
        onChange(hexToColorString(newColor));
    }

    return (
        <Forms.FormSection>
            <div className={cl("swatch-row")}>
                <ColorPicker
                    key={name}
                    color={color}
                    onChange={handleChange}
                />
            </div>
        </Forms.FormSection>
    );
}
