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

interface SwitchProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
}

export function Switch({ checked, onChange, disabled }: SwitchProps) {
    return (
        <div className="control-1fl03-">
            <div className="container-2nx-BQ default-colors" style={{
                backgroundColor: checked ? "var(--status-green-600)" : "var(--primary-dark-400)",
                opacity: disabled ? 0.3 : 1
            }}>
                <svg
                    className="slider-32CRPX"
                    viewBox="0 0 28 20"
                    preserveAspectRatio="xMinYMid meet"
                    aria-hidden="true"
                    style={{
                        left: checked ? "12px" : "-3px",
                    }}
                >
                    <rect fill="white" x="4" y="0" height="20" width="20" rx="10" />
                    <svg viewBox="0 0 20 20" fill="none">
                        {checked ? (
                            <>
                                <path fill="var(--status-green-600)" d="M7.89561 14.8538L6.30462 13.2629L14.3099 5.25755L15.9009 6.84854L7.89561 14.8538Z" />
                                <path fill="var(--status-green-600)" d="M4.08643 11.0903L5.67742 9.49929L9.4485 13.2704L7.85751 14.8614L4.08643 11.0903Z" />
                            </>
                        ) : (
                            <>
                                <path fill="var(--primary-dark-400)" d="M5.13231 6.72963L6.7233 5.13864L14.855 13.2704L13.264 14.8614L5.13231 6.72963Z" />
                                <path fill="var(--primary-dark-400)" d="M13.2704 5.13864L14.8614 6.72963L6.72963 14.8614L5.13864 13.2704L13.2704 5.13864Z" />
                            </>
                        )}

                    </svg>
                </svg>
                <input
                    disabled={disabled}
                    type="checkbox"
                    className="input-2XRLou"
                    tabIndex={0}
                    checked={checked}
                    onChange={e => onChange(e.currentTarget.checked)}
                />
            </div>
        </div>
    );
}
