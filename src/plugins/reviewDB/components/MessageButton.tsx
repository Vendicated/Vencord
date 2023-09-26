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

import { DeleteIcon, ReportIcon } from "@components/Icons";
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
                >
                    <DeleteIcon width={20} height={20} />
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
                >
                    <ReportIcon width={20} height={20} />
                </div>
            )}
        </Tooltip>
    );
}
