/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findByCodeLazy, findCssClassesLazy } from "@webpack";
import { ComponentType, HTMLAttributes, JSX } from "react";

export const OverlayClasses = findCssClassesLazy("overlay", "inner", "outer");
export const CardClasses = findCssClassesLazy("card", "headerText", "headerContextMenu");
export const WidgetClasses = findCssClassesLazy("tabPanelScroller", "tabListScroller");

export enum SpinnerTypes {
    CHASING_DOTS = "chasingDots",
    LOW_MOTION = "lowMotion",
    PULSING_ELLIPSIS = "pulsingEllipsis",
    SPINNING_CIRCLE = "spinningCircle",
    SPINNING_CIRCLE_SIMPLE = "spinningCircleSimple",
    WANDERING_CUBES = "wanderingCubes",
}

type Spinner =
    & ComponentType<
        Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
            type?: SpinnerTypes;
        }
    >
    & {
        Type: typeof SpinnerTypes;
    };

export const Spinner = findByCodeLazy("pulsingEllipsis") as unknown as Spinner;

export function ImageBrokenIcon(props: JSX.IntrinsicElements["svg"]) {
    return (
        <svg
            width={24}
            height={24}
            viewBox="0 0 24 24"
            {...props}
        >
            <path
                fill={props.fill || "currentColor"}
                d="M5 2a3 3 0 0 0-3 3v4.7l3.33 3.33 3.39-3.38a1.5 1.5 0 0 1 2.12 0l3.38 3.38 3.39-3.38a1.5 1.5 0 0 1 2.12 0L22 11.92V5a3 3 0 0 0-3-3H5Z"
            />
            <path
                fill={props.fill || "currentColor"}
                d="m22 14.75-3.33-3.34-3.39 3.39a1.5 1.5 0 0 1-2.12 0L9.78 11.4 6.39 14.8a1.5 1.5 0 0 1-2.12 0L2 12.53V19a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3v-4.25Z"
            />
        </svg>
    );
}
export function MoreHorizontalIcon(props: JSX.IntrinsicElements["svg"]) {
    return (
        <svg
            width={24}
            height={24}
            viewBox="0 0 24 24"
            {...props}
        >
            <path
                fill={props.fill || "currentColor"}
                d="M4 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm10-2a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm8 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z"
            />
        </svg>
    );
}
export function PauseIcon(props: JSX.IntrinsicElements["svg"]) {
    return (
        <svg
            width={24}
            height={24}
            viewBox="0 0 24 24"
            {...props}
        >
            <path
                fill={props.fill || "currentColor"}
                d="M6 4a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1H6ZM15 4a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-3Z"
            />
        </svg>
    );
}
export function PlayIcon(props: JSX.IntrinsicElements["svg"]) {
    return (
        <svg
            width={24}
            height={24}
            viewBox="0 0 24 24"
            {...props}
        >
            <path
                fill={props.fill || "currentColor"}
                d="M9.25 3.35C7.87 2.45 6 3.38 6 4.96v14.08c0 1.58 1.87 2.5 3.25 1.61l10.85-7.04a1.9 1.9 0 0 0 0-3.22L9.25 3.35Z"
            />
        </svg>
    );
}
export function PuzzlePieceIcon(props: JSX.IntrinsicElements["svg"]) {
    return (
        <svg
            width={24}
            height={24}
            viewBox="0 0 24 24"
            {...props}
        >
            <path
                fill={props.fill || "currentColor"}
                d="M16 4a3 3 0 1 1-5.98-.31c.03-.35-.21-.69-.56-.69H7a3 3 0 0 0-3 3v2.5c0 .28-.23.5-.5.54a3 3 0 0 0 0 5.92c.27.04.5.26.5.54V18a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V6a3 3 0 0 0-3-3h-2.46c-.35 0-.6.34-.56.69L16 4Z"
            />
        </svg>
    );
}
export function TrashIcon(props: JSX.IntrinsicElements["svg"]) {
    return (
        <svg
            width={24}
            height={24}
            viewBox="0 0 24 24"
            {...props}
        >
            <path
                fill={props.fill || "currentColor"}
                d="M14.25 1c.41 0 .75.34.75.75V3h5.25c.41 0 .75.34.75.75v.5c0 .41-.34.75-.75.75H3.75A.75.75 0 0 1 3 4.25v-.5c0-.41.34-.75.75-.75H9V1.75c0-.41.34-.75.75-.75h4.5Z"
            />
            <path
                fill={props.fill || "currentColor"}
                d="M5.06 7a1 1 0 0 0-1 1.06l.76 12.13a3 3 0 0 0 3 2.81h8.36a3 3 0 0 0 3-2.81l.75-12.13a1 1 0 0 0-1-1.06H5.07ZM11 12a1 1 0 1 0-2 0v6a1 1 0 1 0 2 0v-6Zm3-1a1 1 0 0 1 1 1v6a1 1 0 1 1-2 0v-6a1 1 0 0 1 1-1Z"
                clipRule="evenodd"
                fillRule="evenodd"
            />
        </svg>
    );
}

export function AppleMusicIcon(props: JSX.IntrinsicElements["svg"]) {
    return (
        <svg
            width={24}
            height={24}
            viewBox="0 0 24 24"
            {...props}
        >
            <path
                fill={props.fill || "currentColor"}
                d="M19.7 1C21.5 1 23 2.5 23 4.3v15.4c0 1.8-1.5 3.3-3.3 3.3H4.3A3.3 3.3 0 0 1 1 19.7V4.3C1 2.5 2.5 1 4.3 1h15.4Zm-2.4 3.8s0-.9-.7-.7L9.3 5.6s-.6.1-.6.8v8.7c0 .5-.7.8-2 .9-2.4.4-2 4.5 1.3 3.4 1.3-.5 1.6-1.7 1.6-3V9.6c0-.3 0-.5.4-.5l6-1.2c.2 0 .4 0 .4.4v5.2c0 .5-.6.8-2 1-2.4.3-2 4.4 1.4 3.3 1.3-.5 1.5-1.7 1.5-3v-10Z"
            />
        </svg>
    );
}
export function SoundcloudIcon(props: JSX.IntrinsicElements["svg"]) {
    return (
        <svg
            width={24}
            height={24}
            viewBox="0 0 24 24"
            {...props}
        >
            <path
                fill={props.fill || "currentColor"}
                d="M1 15.8q0 .4.3.7t.6.1q.3 0 .5-.2l.1-.6V13a.7.7 0 0 0-.2-.5.7.7 0 0 0-.6-.2.7.7 0 0 0-.5.2.7.7 0 0 0-.2.5zm2.4 1.3q0 .3.2.4a1 1 0 0 0 .5.2l.6-.2q.2-.1.2-.4v-6.8a.7.7 0 0 0-.3-.5.7.7 0 0 0-.5-.2.7.7 0 0 0-.5.2.7.7 0 0 0-.2.5zm2.3.3q0 .3.2.5a1 1 0 0 0 .6.1 1 1 0 0 0 .5-.1q.2-.2.2-.5v-6.2a.7.7 0 0 0-.2-.5.7.7 0 0 0-.5-.2.8.8 0 0 0-.6.2.7.7 0 0 0-.2.5zm2.4 0q0 .6.7.6.8 0 .8-.6v-10q0-.9-.6-1l-.6.2Q8 7 8 7.4zm2.3.3v-11q0-.4.4-.5a6 6 0 0 1 4.2.5q1.4.7 2.2 2t1 2.8q.6-.3 1.3-.3a3.4 3.4 0 0 1 2.5 1q1 1 1 2.4T22 17a3.4 3.4 0 0 1-2.5 1h-8.9a.2.2 0 0 1-.1-.1.3.3 0 0 1 0-.2"
            />
        </svg>
    );
}

export function SpotifyIcon(props: JSX.IntrinsicElements["svg"]) {
    return (
        <svg
            width={24}
            height={24}
            viewBox="0 0 24 24"
            {...props}
        >
            <path
                fill={props.fill || "currentColor"}
                d="M12 1a11 11 0 1 0 0 22 11 11 0 0 0 0-22Zm4.8 15.8a.7.7 0 0 1-1 .2c-2.5-1.6-5.8-2-9.6-1a.7.7 0 1 1-.3-1.4A14 14 0 0 1 16.6 16c.3.2.4.6.2.9Zm1.3-3a.9.9 0 0 1-1.1.3c-3-1.8-7.5-2.3-11-1.3a.9.9 0 0 1-.5-1.6c4-1.2 9-.6 12.4 1.4.4.3.5.8.2 1.2Zm1.5-3.5a1 1 0 0 1-1.4.4A18.1 18.1 0 0 0 5.6 9.4a1 1 0 0 1-.6-2C8.8 6.4 15.2 6.6 19.3 9c.5.3.6 1 .4 1.4Z"
            />
        </svg>
    );
}
