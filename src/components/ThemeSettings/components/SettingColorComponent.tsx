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

// const EditPencil = findByCodeLazy("M19.2929 9.8299L19.9409 9.18278C21.353 7.77064", '["color","height","width"]');

function EditPencil({ className, color }) {
    return (
        <svg viewBox="0 0 24 24" className={className}>
            <path fillRule="evenodd" clipRule="evenodd" d="M19.2929 9.8299L19.9409 9.18278C21.353 7.77064 21.353 5.47197 19.9409 4.05892C18.5287 2.64678 16.2292 2.64678 14.817 4.05892L14.1699 4.70694L19.2929 9.8299ZM12.8962 5.97688L5.18469 13.6906L10.3085 18.813L18.0201 11.0992L12.8962 5.97688ZM4.11851 20.9704L8.75906 19.8112L4.18692 15.239L3.02678 19.8796C2.95028 20.1856 3.04028 20.5105 3.26349 20.7337C3.48669 20.9569 3.8116 21.046 4.11851 20.9704Z" fill={color}></path>
        </svg>
    );
}

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
            <div className={cl("swatch-row")}>
                <span>{label}</span>
                <ColorPicker
                    key={name}
                    value={normalizedValue}
                    onChange={handleChange}
                />
            </div>
        </Forms.FormSection>
    );
}
