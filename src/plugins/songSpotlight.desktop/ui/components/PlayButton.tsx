/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { cl } from "@plugins/songSpotlight.desktop/lib/utils";
import { PauseIcon, PlayIcon } from "@plugins/songSpotlight.desktop/ui/common";
import { classes } from "@utils/misc";
import { HTMLAttributes } from "react";

interface PlayButtonProps extends HTMLAttributes<HTMLButtonElement> {
    size?: "xs" | "sm";
    state: boolean;
    disabled?: boolean;
    onClick(): void;
}

export function PlayButton({ state, ...props }: PlayButtonProps) {
    const Icon = state ? PauseIcon : PlayIcon;

    return (
        <button {...props} data-toggled={state} className={classes(cl("icon-button"), props.className)}>
            <Icon size="xs" className={cl("icon")} />
        </button>
    );
}
