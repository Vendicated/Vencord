/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./colorStyles.css";

import { classNameFactory } from "@utils/css";
import { findByCodeLazy } from "@webpack";
import { ColorPicker, useMemo } from "@webpack/common";

// TinyColor is completely unmangled and it's duplicated in two modules! Fun!
const TinyColor: tinycolor.Constructor = findByCodeLazy("this._gradientType=");

const cl = classNameFactory("vc-usercss-settings-color-");

interface Props {
    label: string;
    name: string;
    themeSettings: Record<string, string>;
}

export function SettingColorComponent({ label, name, themeSettings }: Props) {
    function handleChange(value: number) {
        const corrected = "#" + (value?.toString(16).padStart(6, "0") ?? "000000");

        themeSettings[name] = corrected;
    }

    const normalizedValue = useMemo(() => parseInt(TinyColor(themeSettings[name]).toHex(), 16), [themeSettings[name]]);

    return (
        <section>
            <div className={cl("swatch-row")}>
                <span>{label}</span>
                <ColorPicker
                    key={name}
                    color={normalizedValue}
                    onChange={handleChange}
                />
            </div>
        </section>
    );
}
