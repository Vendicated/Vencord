/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import { DeleteIcon } from "@components/Icons";
import { classes } from "@utils/misc";
import { findByPropsLazy } from "@webpack";
import { Tooltip } from "@webpack/common";

const iconClasses = findByPropsLazy("button", "wrapper", "disabled", "separator");

export function DeleteButton({ onClick }: { onClick(): void; }) {
    return (
        <Tooltip text="Delete Review">
            {props => (
                <div
                    {...props}
                    className={classes(iconClasses.button, iconClasses.dangerous)}
                    onClick={onClick}
                    role="button"
                >
                    <DeleteIcon width="20" height="20" />
                </div>
            )}
        </Tooltip>
    );
}

export function ReportButton({ onClick }: { onClick(): void; }) {
    return (
        <Tooltip text="Report Review">
            {props => (
                <div
                    {...props}
                    className={iconClasses.button}
                    onClick={onClick}
                    role="button"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24">
                        <path
                            fill="currentColor"
                            d="M20,6.002H14V3.002C14,2.45 13.553,2.002 13,2.002H4C3.447,2.002 3,2.45 3,3.002V22.002H5V14.002H10.586L8.293,16.295C8.007,16.581 7.922,17.011 8.076,17.385C8.23,17.759 8.596,18.002 9,18.002H20C20.553,18.002 21,17.554 21,17.002V7.002C21,6.45 20.553,6.002 20,6.002Z"
                        />
                    </svg>
                </div>
            )}
        </Tooltip>
    );
}

export function BlockButton({ onClick, isBlocked }: { onClick(): void; isBlocked: boolean; }) {
    return (
        <Tooltip text={`${isBlocked ? "Unblock" : "Block"} user`}>
            {props => (
                <div
                    {...props}
                    className={iconClasses.button}
                    onClick={onClick}
                    role="button"
                >
                    <svg height="20" viewBox="0 -960 960 960" width="20" fill="currentColor">
                        {isBlocked
                            ? <path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z" />
                            : <path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q54 0 104-17.5t92-50.5L228-676q-33 42-50.5 92T160-480q0 134 93 227t227 93Zm252-124q33-42 50.5-92T800-480q0-134-93-227t-227-93q-54 0-104 17.5T284-732l448 448Z" />
                        }
                    </svg>
                </div>
            )}
        </Tooltip>
    );
}
