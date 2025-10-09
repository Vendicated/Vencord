/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { classNameFactory } from "@api/Styles";
import { FormSwitch } from "@components/FormSwitch";

interface Props {
    label: string;
    name: string;
    themeSettings: Record<string, string>;
}

const cl = classNameFactory("vc-settings-boolean-");

export function SettingBooleanComponent({ label, name, themeSettings }: Props) {
    function handleChange(value: boolean) {
        const corrected = value ? "1" : "0";

        themeSettings[name] = corrected;
    }

    return (
        <section>
            <FormSwitch
                title={label}
                key={name}
                className={cl("switch")}
                value={themeSettings[name] === "1"}
                onChange={handleChange}
                hideBorder
            />
        </section>
    );
}
