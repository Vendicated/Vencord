/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import "./Switch.css";

import { classNameFactory } from "@utils/css";
import { useState } from "@webpack/common";
import type { FocusEvent, Ref } from "react";

const switchCls = classNameFactory("vc-switch-");

export interface SwitchProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
    id?: string;
    // checkmark/x icon in thumb
    hasIcon?: boolean;
    innerRef?: Ref<HTMLInputElement>;
    "aria-describedby"?: string;
    "aria-labelledby"?: string;
}

export function Switch({ checked, onChange, disabled, id, hasIcon = false, innerRef, ...ariaProps }: SwitchProps) {
    const [focusVisible, setFocusVisible] = useState(false);

    // Due to how we wrap the invisible input, there is no good way to do this with css.
    // We need it on the parent, not the input itself. For this, you can use either:
    // - :focus-within ~ this shows also when clicking, not just on keyboard focus => SUCKS
    // - :has(:focus-visible) ~ works but :has performs terribly inside Discord
    // - JS event handlers ~ what we are using now
    const handleFocusChange = (event: FocusEvent<HTMLInputElement>) => {
        const target = event.currentTarget;
        setFocusVisible(target.matches(":focus-visible"));
    };

    return (
        <label className={switchCls("container", { checked, disabled, focusVisible })}>
            <div
                className={switchCls("indicator")}
                data-mana-component="switch"
            >
                <svg
                    className={switchCls("thumb")}
                    viewBox="0 0 24 24"
                    preserveAspectRatio="xMidYMin meet"
                    aria-hidden="true"
                >
                    <rect
                        fill="var(--switch-thumb-background-default)"
                        x={4}
                        y={4}
                        width={16}
                        height={16}
                        rx={8}
                    />
                    {hasIcon && (
                        <svg viewBox="0 0 24 24" fill="none">
                            <g transform="translate(4 4)">
                                {checked ? (
                                    <>
                                        <path fill="var(--switch-thumb-icon-active)" d="M6.31649 11.88304L5.0437 10.61032L11.44792 4.20604L12.72072 5.47883L6.31649 11.88304Z" />
                                        <path fill="var(--switch-thumb-icon-active)" d="M3.26914 8.87224L4.54194 7.59943L7.5588 10.61632L6.28601 11.88912L3.26914 8.87224Z" />
                                    </>
                                ) : (
                                    <>
                                        <path fill="var(--switch-thumb-icon-default)" d="M4.10585 5.3837L5.37864 4.11091L11.884 10.61632L10.6112 11.88912L4.10585 5.3837Z" />
                                        <path fill="var(--switch-thumb-icon-default)" d="M10.61632 4.11091L11.88912 5.3837L5.3837 11.88912L4.11091 10.61632L10.61632 4.11091Z" />
                                    </>
                                )}
                            </g>
                        </svg>
                    )}
                </svg>
            </div>
            <input
                ref={innerRef}
                id={id}
                type="checkbox"
                role="switch"
                className={switchCls("input")}
                tabIndex={0}
                checked={checked}
                disabled={disabled}
                onChange={e => onChange(e.currentTarget.checked)}
                onFocus={handleFocusChange}
                onBlur={handleFocusChange}
                {...ariaProps}
            />
        </label>
    );
}
