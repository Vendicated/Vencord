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

import { classes } from "@utils/misc";
import { findByPropsLazy } from "@webpack";

interface SwitchProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
}

const SWITCH_ON = "var(--green-360)";
const SWITCH_OFF = "var(--primary-400)";
const SwitchClasses: Record<string, string> = findByPropsLazy("slider", "input", "container");

export const Switch = ({ checked, onChange, disabled }: SwitchProps) => (
    <div>
        <div
            className={classes(SwitchClasses.container, "default-colors", checked ? SwitchClasses.checked : undefined)}
            style={{
                backgroundColor: checked ? SWITCH_ON : SWITCH_OFF,
                opacity: disabled ? 0.3 : 1
            }}
        >
            <svg
                className={SwitchClasses.slider + " vc-switch-slider"}
                viewBox="0 0 28 20"
                preserveAspectRatio="xMinYMid meet"
                aria-hidden="true"
                style={{
                    transform: checked ? "translateX(12px)" : "translateX(-3px)",
                }}
            >
                <rect fill="white" x="4" y="0" height="20" width="20" rx="10" />
                <svg viewBox="0 0 20 20" fill="none">
                    {checked ? (
                        <>
                            <path fill={SWITCH_ON} d="m7.89561 14.8538-1.59099-1.5909 8.00528-8.00535 1.591 1.59099-8.00529 8.00526Z" />
                            <path fill={SWITCH_ON} d="m4.08643 11.0903 1.59099-1.59101L9.4485 13.2704l-1.59099 1.591-3.77108-3.7711Z" />
                        </>
                    ) : (
                        <>
                            <path fill={SWITCH_OFF} d="M5.13231 6.72963 6.7233 5.13864l8.1317 8.13176-1.591 1.591-8.13169-8.13177Z" />
                            <path fill={SWITCH_OFF} d="m13.2704 5.13864 1.591 1.59099-8.13177 8.13177-1.59099-1.591 8.13176-8.13176Z" />
                        </>
                    )}
                </svg>
            </svg>
            <input
                disabled={disabled}
                type="checkbox"
                className={SwitchClasses.input}
                tabIndex={0}
                checked={checked}
                onChange={e => { onChange(e.currentTarget.checked); }}
            />
        </div>
    </div>
);
