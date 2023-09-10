/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./colorStyles.css";

import { classNameFactory } from "@api/Styles";
import { LazyComponent } from "@utils/react";
import { find, findByCodeLazy } from "@webpack";
import { Forms, Popout, useMemo, useState } from "@webpack/common";

interface ColorPickerProps {
    value: number | null;
    showEyeDropper?: boolean;
    onChange(value: number | null): void;
    onClose?(): void;
}
const ColorPickerModal = LazyComponent<ColorPickerProps>(() => find(m => m?.type?.toString?.().includes(".showEyeDropper")));

// TinyColor is completely unmangled and it's duplicated in two modules! Fun!
const TinyColor: tinycolor.Constructor = findByCodeLazy("this._gradientType=");

const cl = classNameFactory("vc-usercss-settings-color-");

const EditPencil = findByCodeLazy("M19.2929 9.8299L19.9409 9.18278C21.353 7.77064", '["color","height","width"]');

function ColorPicker(props: ColorPickerProps) {
    const [color, setColor] = useState(props.value);

    const correctedColor = color ? `#${color.toString(16).padStart(6, "0")}` : "#000000";

    return (
        <Popout
            renderPopout={() => (
                <ColorPickerModal value={props.value} onChange={value => { setColor(value); props.onChange(value); }} showEyeDropper={props.showEyeDropper} />
            )}
        >
            {popoutProps => (
                <div {...popoutProps} className={cl("swatch")} style={{
                    backgroundColor: correctedColor,
                    borderColor: correctedColor
                }}>
                    <EditPencil
                        className={cl("swatch-pencil")}
                        color={TinyColor(correctedColor).isLight() ? "var(--primary-530)" : "var(--white-500)"}
                    />
                </div>
            )}
        </Popout>
    );
}

interface Props {
    label: string;
    name: string;
    themeSettings: Record<string, string>;
}

export function SettingColorComponent({ label, name, themeSettings }: Props) {
    const [value, setValue] = useState(themeSettings[name]);

    function handleChange(value: number) {
        const corrected = "#" + (value?.toString(16).padStart(6, "0") ?? "000000");

        setValue(corrected);

        themeSettings[name] = corrected;
    }

    const normalizedValue = useMemo(() => parseInt(TinyColor(value).toHex(), 16), [value]);

    return (
        <Forms.FormSection>
            <Forms.FormTitle tag="h5">{label}</Forms.FormTitle>
            <ColorPicker
                key={name}
                value={normalizedValue}
                onChange={handleChange}
            />
        </Forms.FormSection>
    );
}
