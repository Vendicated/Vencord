/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { CSSProperties } from "react";

/**
 * Discord's search icon, as seen in the GIF search bar
 */
export function SearchIcon({
    height = 24,
    width = 24,
    viewboxX = width,
    viewboxY = height,
    className,
    style,
}: {
    height?: number;
    width?: number;
    viewboxX?: number;
    viewboxY?: number;
    className?: string;
    style?: CSSProperties;
}) {
    return (
        <svg
            className={className}
            aria-label="Search"
            aria-hidden="false"
            role="img"
            width={width}
            height={height}
            viewBox={`0 0 ${viewboxX} ${viewboxY}`}
            style={style}
        >
            <path
                fill="currentColor"
                d="M21.707 20.293L16.314 14.9C17.403 13.504 18 11.799 18 10C18 7.863 17.167 5.854 15.656 4.344C14.146 2.832 12.137 2 10 2C7.863 2 5.854 2.832 4.344 4.344C2.833 5.854 2 7.863 2 10C2 12.137 2.833 14.146 4.344 15.656C5.854 17.168 7.863 18 10 18C11.799 18 13.504 17.404 14.9 16.314L20.293 21.706L21.707 20.293ZM10 16C8.397 16 6.891 15.376 5.758 14.243C4.624 13.11 4 11.603 4 10C4 8.398 4.624 6.891 5.758 5.758C6.891 4.624 8.397 4 10 4C11.603 4 13.109 4.624 14.242 5.758C15.376 6.891 16 8.398 16 10C16 11.603 15.376 13.11 14.242 14.243C13.109 15.376 11.603 16 10 16Z"
            />
        </svg>
    );
}

export function CloseIcon({
    height = 24,
    width = 24,
    viewboxX = width,
    viewboxY = height,
    className,
    style,
}: {
    height?: number;
    width?: number;
    viewboxX?: number;
    viewboxY?: number;
    className?: string;
    style?: CSSProperties;
}) {
    return (
        <svg
            aria-label="Clear"
            aria-hidden="false"
            role="img"
            className={className}
            width={width}
            height={height}
            viewBox={`0 0 ${viewboxX} ${viewboxY}`}
            style={style}
        >
            <path
                fill="currentColor"
                d="M18.4 4L12 10.4L5.6 4L4 5.6L10.4 12L4 18.4L5.6 20L12 13.6L18.4 20L20 18.4L13.6 12L20 5.6L18.4 4Z"
            />
        </svg>
    );
}

export function SwatchIcon({
    height = 24,
    width = 24,
    viewboxX = width,
    viewboxY = height,
    className,
    style,
}: {
    height?: number;
    width?: number;
    viewboxX?: number;
    viewboxY?: number;
    className?: string;
    style?: CSSProperties;
}) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={width}
            height={height}
            className={className}
            fill="currentColor"
            viewBox={`0 0 ${viewboxX} ${viewboxY}`}
            style={style}
        >
            <path d="M0 .5A.5.5 0 0 1 .5 0h5a.5.5 0 0 1 .5.5v5.277l4.147-4.131a.5.5 0 0 1 .707 0l3.535 3.536a.5.5 0 0 1 0 .708L10.261 10H15.5a.5.5 0 0 1 .5.5v5a.5.5 0 0 1-.5.5H3a2.99 2.99 0 0 1-2.121-.879A2.99 2.99 0 0 1 0 13.044m6-.21 7.328-7.3-2.829-2.828L6 7.188v5.647zM4.5 13a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0zM15 15v-4H9.258l-4.015 4H15zM0 .5v12.495V.5z" />
            <path d="M0 12.995V13a3.07 3.07 0 0 0 0-.005z" />
        </svg>
    );
}
