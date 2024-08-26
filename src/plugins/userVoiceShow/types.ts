/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { User } from "discord-types/general";
import { SVGProps } from "react";

export interface UserProps {
    user: User;
}

export interface VoiceActivityIconProps extends UserProps {
    needContainer: boolean;
    inProfile: boolean;
}

export interface SvgIconProps extends SVGProps<SVGSVGElement> {
    viewBox?: string;
    className?: string;
    height?: string | number;
    width?: string | number;
}

export interface RenderMoreUsersProps {
    users: User[];
    count: number;
}
