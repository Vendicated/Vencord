/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { cl } from "@plugins/songSpotlight.desktop/lib/utils";
import { PauseIcon, PlayIcon, Spinner } from "@plugins/songSpotlight.desktop/ui/common";
import { classes } from "@utils/misc";
import { HTMLAttributes } from "react";

interface PlayButtonProps extends HTMLAttributes<HTMLButtonElement> {
    state: boolean;
    disabled?: boolean;
    onClick(): void;
}

export function PlayButton({ state, disabled, ...props }: PlayButtonProps) {
    const Icon = state ? PauseIcon : PlayIcon;

    return (
        <button
            {...props}
            disabled={disabled}
            data-toggled={state}
            className={classes(cl("icon-button"), props.className)}
        >
            {disabled
                ? <Spinner type={Spinner.Type.PULSING_ELLIPSIS} className={cl("icon-spinner")} />
                : <Icon width={16} height={16} className={cl("icon")} />}
        </button>
    );
}
