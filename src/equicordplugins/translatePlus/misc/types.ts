/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";

export const cl = classNameFactory("eq-trans-");

export interface Translation {
    text: string;
    src: string;
}

export type IconProps = {
    width?: number;
    height?: number;
};
