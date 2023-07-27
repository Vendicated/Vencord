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

import "./iconStyles.css";

import { classes } from "@utils/misc";
import { i18n } from "@webpack/common";
import type { PropsWithChildren, SVGProps } from "react";

interface BaseIconProps extends IconProps {
    viewBox: string;
}

interface IconProps extends SVGProps<SVGSVGElement> {
    className?: string;
    height?: number;
    width?: number;
}

function Icon({ height = 24, width = 24, className, children, viewBox, ...svgProps }: PropsWithChildren<BaseIconProps>) {
    return (
        <svg
            className={classes(className, "vc-icon")}
            role="img"
            width={width}
            height={height}
            viewBox={viewBox}
            {...svgProps}
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
            className={classes(className, "vc-link-icon")}
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
            className={classes(props.className, "vc-copy-icon")}
            viewBox="0 0 24 24"
        >
            <g fill="currentColor">
                <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1z" />
                <path d="M15 5H8c-1.1 0-1.99.9-1.99 2L6 21c0 1.1.89 2 1.99 2H19c1.1 0 2-.9 2-2V11l-6-6zM8 21V7h6v5h5v9H8z" />
            </g>
        </Icon>
    );
}

/**
 * Discord's open external icon, as seen in the user profile connections
 */
export function OpenExternalIcon(props: IconProps) {
    return (
        <Icon
            {...props}
            className={classes(props.className, "vc-open-external-icon")}
            viewBox="0 0 24 24"
        >
            <polygon
                fill="currentColor"
                fill-rule="nonzero"
                points="13 20 11 20 11 8 5.5 13.5 4.08 12.08 12 4.16 19.92 12.08 18.5 13.5 13 8"
            />
        </Icon>
    );
}

export function ImageIcon(props: IconProps) {
    return (
        <Icon
            {...props}
            className={classes(props.className, "vc-image-icon")}
            viewBox="0 0 24 24"
        >
            <path fill="currentColor" d="M21,19V5c0,-1.1 -0.9,-2 -2,-2H5c-1.1,0 -2,0.9 -2,2v14c0,1.1 0.9,2 2,2h14c1.1,0 2,-0.9 2,-2zM8.5,13.5l2.5,3.01L14.5,12l4.5,6H5l3.5,-4.5z" />
        </Icon>
    );
}

export function InfoIcon(props: IconProps) {
    return (
        <Icon
            {...props}
            className={classes(props.className, "vc-info-icon")}
            viewBox="0 0 12 12"
        >
            <path fill="currentColor" d="M6 1C3.243 1 1 3.244 1 6c0 2.758 2.243 5 5 5s5-2.242 5-5c0-2.756-2.243-5-5-5zm0 2.376a.625.625 0 110 1.25.625.625 0 010-1.25zM7.5 8.5h-3v-1h1V6H5V5h1a.5.5 0 01.5.5v2h1v1z" />
        </Icon>
    );
}

export function OwnerCrownIcon(props: IconProps) {
    return (
        <Icon
            aria-label={i18n.Messages.GUILD_OWNER}
            {...props}
            className={classes(props.className, "vc-owner-crown-icon")}
            role="img"
            viewBox="0 0 16 16"
        >
            <path
                fill="currentColor"
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M13.6572 5.42868C13.8879 5.29002 14.1806 5.30402 14.3973 5.46468C14.6133 5.62602 14.7119 5.90068 14.6473 6.16202L13.3139 11.4954C13.2393 11.7927 12.9726 12.0007 12.6666 12.0007H3.33325C3.02725 12.0007 2.76058 11.792 2.68592 11.4954L1.35258 6.16202C1.28792 5.90068 1.38658 5.62602 1.60258 5.46468C1.81992 5.30468 2.11192 5.29068 2.34325 5.42868L5.13192 7.10202L7.44592 3.63068C7.46173 3.60697 7.48377 3.5913 7.50588 3.57559C7.5192 3.56612 7.53255 3.55663 7.54458 3.54535L6.90258 2.90268C6.77325 2.77335 6.77325 2.56068 6.90258 2.43135L7.76458 1.56935C7.89392 1.44002 8.10658 1.44002 8.23592 1.56935L9.09792 2.43135C9.22725 2.56068 9.22725 2.77335 9.09792 2.90268L8.45592 3.54535C8.46794 3.55686 8.48154 3.56651 8.49516 3.57618C8.51703 3.5917 8.53897 3.60727 8.55458 3.63068L10.8686 7.10202L13.6572 5.42868ZM2.66667 12.6673H13.3333V14.0007H2.66667V12.6673Z"
            />
        </Icon>
    );
}

/**
 * Discord's screenshare icon, as seen in the connection panel
 */
export function ScreenshareIcon(props: IconProps) {
    return (
        <Icon
            {...props}
            className={classes(props.className, "vc-screenshare-icon")}
            viewBox="0 0 24 24"
        >
            <path
                fill="currentColor"
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M2 4.5C2 3.397 2.897 2.5 4 2.5H20C21.103 2.5 22 3.397 22 4.5V15.5C22 16.604 21.103 17.5 20 17.5H13V19.5H17V21.5H7V19.5H11V17.5H4C2.897 17.5 2 16.604 2 15.5V4.5ZM13.2 14.3375V11.6C9.864 11.6 7.668 12.6625 6 15C6.672 11.6625 8.532 8.3375 13.2 7.6625V5L18 9.6625L13.2 14.3375Z"
            />
        </Icon>
    );
}

export function ImageVisible(props: IconProps) {
    return (
        <Icon
            {...props}
            className={classes(props.className, "vc-image-visible")}
            viewBox="0 0 24 24"
        >
            <path fill="currentColor" d="M5 21q-.825 0-1.413-.587Q3 19.825 3 19V5q0-.825.587-1.413Q4.175 3 5 3h14q.825 0 1.413.587Q21 4.175 21 5v14q0 .825-.587 1.413Q19.825 21 19 21Zm0-2h14V5H5v14Zm1-2h12l-3.75-5-3 4L9 13Zm-1 2V5v14Z" />
        </Icon>
    );
}

export function ImageInvisible(props: IconProps) {
    return (
        <Icon
            {...props}
            className={classes(props.className, "vc-image-invisible")}
            viewBox="0 0 24 24"
        >
            <path fill="currentColor" d="m21 18.15-2-2V5H7.85l-2-2H19q.825 0 1.413.587Q21 4.175 21 5Zm-1.2 4.45L18.2 21H5q-.825 0-1.413-.587Q3 19.825 3 19V5.8L1.4 4.2l1.4-1.4 18.4 18.4ZM6 17l3-4 2.25 3 .825-1.1L5 7.825V19h11.175l-2-2Zm7.425-6.425ZM10.6 13.4Z" />
        </Icon>
    );
}

export function Microphone(props: IconProps) {
    return (
        <Icon
            {...props}
            className={classes(props.className, "vc-microphone")}
            viewBox="0 0 24 24"
        >
            <path fill-rule="evenodd" clip-rule="evenodd" d="M14.99 11C14.99 12.66 13.66 14 12 14C10.34 14 9 12.66 9 11V5C9 3.34 10.34 2 12 2C13.66 2 15 3.34 15 5L14.99 11ZM12 16.1C14.76 16.1 17.3 14 17.3 11H19C19 14.42 16.28 17.24 13 17.72V21H11V17.72C7.72 17.23 5 14.41 5 11H6.7C6.7 14 9.24 16.1 12 16.1ZM12 4C11.2 4 11 4.66667 11 5V11C11 11.3333 11.2 12 12 12C12.8 12 13 11.3333 13 11V5C13 4.66667 12.8 4 12 4Z" fill="currentColor" />
            <path fill-rule="evenodd" clip-rule="evenodd" d="M14.99 11C14.99 12.66 13.66 14 12 14C10.34 14 9 12.66 9 11V5C9 3.34 10.34 2 12 2C13.66 2 15 3.34 15 5L14.99 11ZM12 16.1C14.76 16.1 17.3 14 17.3 11H19C19 14.42 16.28 17.24 13 17.72V22H11V17.72C7.72 17.23 5 14.41 5 11H6.7C6.7 14 9.24 16.1 12 16.1Z" fill="currentColor" />
        </Icon >
    );
}
