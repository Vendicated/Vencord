/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { classNameFactory } from "@api/Styles";
import { proxyLazy } from "@utils/lazy";
import { findByPropsLazy } from "@webpack";
import { Forms } from "@webpack/common";
import { ComponentType, HTMLAttributes } from "react";

export enum SpinnerTypes {
    WANDERING_CUBES = "wanderingCubes",
    CHASING_DOTS = "chasingDots",
    PULSING_ELLIPSIS = "pulsingEllipsis",
    SPINNING_CIRCLE = "spinningCircle",
    SPINNING_CIRCLE_SIMPLE = "spinningCircleSimple",
    LOW_MOTION = "lowMotion",
}

type Spinner = ComponentType<Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
    type?: SpinnerTypes;
    animated?: boolean;
    className?: string;
    itemClassName?: string;
    "aria-label"?: string;
}> & {
    Type: typeof SpinnerTypes;
};

// https://github.com/Kyuuhachi/VencordPlugins/blob/main/MessageLinkTooltip/index.tsx#L11-L33
export const { Spinner } = proxyLazy(() => Forms as any as {
    Spinner: Spinner,
    SpinnerTypes: typeof SpinnerTypes;
});

const icons = findByPropsLazy("PencilIcon");
export const QrCodeIcon = proxyLazy(() => icons.QrCodeCameraIcon ?? icons.QrCodeIcon) as ComponentType<{
    size: number;
}>;

export const cl = classNameFactory("qrlogin-");
