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

import { classes } from "@utils/misc";
import type { PropsWithChildren } from "react";

interface BaseIconProps extends IconProps {
    viewBox: string;
}

interface IconProps {
    className?: string;
    height?: number;
    width?: number;
}

function Icon({ height = 24, width = 24, className, children, viewBox }: PropsWithChildren<BaseIconProps>) {
    return (
        <svg
            className={classes(className, "vc-icon")}
            aria-hidden="true"
            role="img"
            width={width}
            height={height}
            viewBox={viewBox}
        >
            {children}
        </svg>
    );
}

/**
 * Discord's link icon, as seen in the Message context menu "Copy Message Link" option
 */
export function LinkIcon({ height = 24, width = 24, className }: IconProps) {
    return (
        <Icon
            height={height}
            width={width}
            className={className}
            viewBox="0 0 24 24"
        >
            <g fill="none" fill-rule="evenodd">
                <path fill="currentColor" d="M10.59 13.41c.41.39.41 1.03 0 1.42-.39.39-1.03.39-1.42 0a5.003 5.003 0 0 1 0-7.07l3.54-3.54a5.003 5.003 0 0 1 7.07 0 5.003 5.003 0 0 1 0 7.07l-1.49 1.49c.01-.82-.12-1.64-.4-2.42l.47-.48a2.982 2.982 0 0 0 0-4.24 2.982 2.982 0 0 0-4.24 0l-3.53 3.53a2.982 2.982 0 0 0 0 4.24zm2.82-4.24c.39-.39 1.03-.39 1.42 0a5.003 5.003 0 0 1 0 7.07l-3.54 3.54a5.003 5.003 0 0 1-7.07 0 5.003 5.003 0 0 1 0-7.07l1.49-1.49c-.01.82.12 1.64.4 2.43l-.47.47a2.982 2.982 0 0 0 0 4.24 2.982 2.982 0 0 0 4.24 0l3.53-3.53a2.982 2.982 0 0 0 0-4.24.973.973 0 0 1 0-1.42z" />
                <rect width={width} height={height} />
            </g>
        </Icon>
    );
}

/**
 * Discord's copy icon, as seen in the user popout right of the username when clicking
 * your own username in the bottom left user panel
 */
export function CopyIcon(props: IconProps) {
    return (
        <Icon
            {...props}
            viewBox="0 0 24 24"
        >
            <g fill="currentColor">
                <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1z" />
                <path d="M15 5H8c-1.1 0-1.99.9-1.99 2L6 21c0 1.1.89 2 1.99 2H19c1.1 0 2-.9 2-2V11l-6-6zM8 21V7h6v5h5v9H8z" />
            </g>
        </Icon>
    );
}
