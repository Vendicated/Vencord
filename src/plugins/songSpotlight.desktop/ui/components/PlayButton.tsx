/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { cl } from "@plugins/songSpotlight.desktop/lib/utils";
import { PauseIcon, PlayIcon } from "@plugins/songSpotlight.desktop/ui/common";
import { classes } from "@utils/misc";
import { HTMLAttributes } from "react";

const Sizes = {
    xs: 16,
    sm: 20,
} as const;

interface PlayButtonProps extends HTMLAttributes<HTMLButtonElement> {
    size?: keyof typeof Sizes;
    state: boolean;
    disabled?: boolean;
    onClick(): void;
}

export function PlayButton({ size, state, ...props }: PlayButtonProps) {
    const Icon = state ? PauseIcon : PlayIcon;

    return (
        <button {...props} data-toggled={state} className={classes(cl("icon-button"), props.className)}>
            <Icon width={size && Sizes[size]} height={size && Sizes[size]} className={cl("icon")} />
        </button>
    );
}
