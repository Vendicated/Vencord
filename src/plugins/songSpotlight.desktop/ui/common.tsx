/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Icon } from "@vencord/discord-types";
import { findByCodeLazy, findCssClassesLazy, findExportedComponentLazy } from "@webpack";
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

export const ImageBrokenIcon = findExportedComponentLazy("ImageBrokenIcon") as Icon;
export const MoreHorizontalIcon = findExportedComponentLazy("MoreHorizontalIcon") as Icon;
export const PauseIcon = findExportedComponentLazy("PauseIcon") as Icon;
export const PlayIcon = findExportedComponentLazy("PlayIcon") as Icon;
export const PuzzlePieceIcon = findExportedComponentLazy("PuzzlePieceIcon") as Icon;
export const TrashIcon = findExportedComponentLazy("TrashIcon") as Icon;

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
                fillRule="evenodd"
                d="M12 1C5.94 1 1 5.94 1 12C1 18.06 5.94 23 12 23C18.06 23 23 18.06 23 12C23 5.94 18.06 1 12 1ZM16.8 16.79C16.7538 16.8686 16.6922 16.9371 16.619 16.9915C16.5458 17.0458 16.4624 17.0849 16.3738 17.1064C16.2851 17.1278 16.1931 17.1312 16.1031 17.1164C16.0131 17.1016 15.927 17.0688 15.85 17.02C13.28 15.44 10.05 15.09 6.23 15.96C6.05363 15.9998 5.86868 15.9679 5.71584 15.8713C5.563 15.7747 5.45478 15.6214 5.415 15.445C5.37522 15.2686 5.40713 15.0837 5.50371 14.9308C5.60029 14.778 5.75363 14.6698 5.93 14.63C10.1 13.68 13.68 14.09 16.57 15.85C16.89 16.05 16.99 16.47 16.79 16.79H16.8ZM18.13 13.81C18.0716 13.9053 17.995 13.9881 17.9046 14.0538C17.8142 14.1194 17.7117 14.1666 17.6031 14.1926C17.4944 14.2186 17.3817 14.2229 17.2713 14.2053C17.161 14.1877 17.0552 14.1485 16.96 14.09C14.02 12.28 9.53 11.75 6.05 12.81C5.84441 12.8443 5.63336 12.8028 5.45609 12.6931C5.27883 12.5835 5.14742 12.4132 5.08629 12.2139C5.02517 12.0147 5.03849 11.8 5.12378 11.6098C5.20908 11.4196 5.36054 11.2669 5.55 11.18C9.53 9.98 14.47 10.56 17.85 12.63C18.25 12.88 18.38 13.41 18.13 13.81ZM19.65 10.34C19.36 10.83 18.73 10.99 18.25 10.7C14.72 8.6 8.9 8.41 5.53 9.44C5.27009 9.51956 4.98921 9.49262 4.74917 9.3651C4.50912 9.23757 4.32956 9.01991 4.25 8.76C4.17044 8.50009 4.19738 8.21921 4.3249 7.97917C4.45243 7.73912 4.67009 7.55956 4.93 7.48C8.8 6.3 15.23 6.53 19.3 8.94C19.8 9.23 19.95 9.86 19.66 10.34H19.65Z"
                clipRule="evenodd"
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
                fillRule="evenodd"
                d="M19.7004 1C21.523 1.00002 23 2.47703 23 4.29959V19.7004C23 21.523 21.523 23 19.7004 23H4.29959C2.47703 23 1.00002 21.523 1 19.7004V4.29959C1.00003 2.47704 2.47704 1.00003 4.29959 1H19.7004ZM17.2852 4.78127C17.2852 4.78127 17.2851 3.9218 16.5547 4.13664L9.25002 5.64062C9.25002 5.64062 8.69141 5.72661 8.69141 6.41411V15.1367C8.69141 15.5664 8.04689 15.8528 6.75785 15.9961C4.30862 16.3828 4.69538 20.5078 8.04694 19.3906C9.33593 18.9179 9.55074 17.6719 9.55075 16.4258V9.55075C9.55076 9.29296 9.69406 9.13544 9.98051 9.07815L15.9102 7.87508C16.2253 7.81781 16.3972 7.96094 16.4258 8.30466V13.5469C16.4258 13.9766 15.7813 14.263 14.4923 14.4062C12.0431 14.793 12.4297 18.9179 15.7812 17.8008C17.0702 17.3281 17.2852 16.0821 17.2852 14.836V4.78127Z"
                clipRule="evenodd"
            />
        </svg>
    );
}
export function SoundCloudIcon(props: JSX.IntrinsicElements["svg"]) {
    return (
        <svg
            width={24}
            height={24}
            viewBox="0 0 24 24"
            {...props}
        >
            <path
                fill={props.fill || "currentColor"}
                fillRule="evenodd"
                d="M1 15.846q0 .402.297.609t.635.146q.317-.06.445-.222.128-.16.128-.533v-2.92a.71.71 0 0 0-.22-.528.74.74 0 0 0-.538-.217.73.73 0 0 0-.527.217.71.71 0 0 0-.22.528zm2.355 1.248q0 .292.21.438a.92.92 0 0 0 .537.146q.338 0 .548-.146.21-.145.21-.438v-6.805a.7.7 0 0 0-.22-.519.74.74 0 0 0-.538-.216.73.73 0 0 0-.527.216.7.7 0 0 0-.22.519zm2.344.322q0 .292.215.438a.97.97 0 0 0 .553.146.92.92 0 0 0 .537-.146q.21-.145.21-.438v-6.211a.73.73 0 0 0-.22-.534.72.72 0 0 0-.527-.221.75.75 0 0 0-.543.221.72.72 0 0 0-.225.534zm2.355.03q0 .555.757.554.758 0 .758-.554V7.38q0-.846-.522-.956-.339-.08-.666.191-.328.272-.328.765zm2.395.292V6.785q0-.524.317-.624a6.077 6.077 0 0 1 4.28.564q1.351.724 2.185 1.978t.968 2.763q.624-.261 1.33-.261a3.38 3.38 0 0 1 2.452.996q1.02.997 1.019 2.396 0 1.41-1.019 2.406A3.37 3.37 0 0 1 19.54 18l-8.907-.01a.24.24 0 0 1-.138-.11.3.3 0 0 1-.046-.142"
                clipRule="evenodd"
            />
        </svg>
    );
}
