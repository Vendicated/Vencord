/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BaseText } from "@components/BaseText";
import { cl } from "@plugins/songSpotlight.desktop/lib/utils";
import { classes } from "@utils/misc";
import { Tooltip } from "@webpack/common";
import { HTMLAttributes } from "react";

interface ExplicitTagProps extends HTMLAttributes<HTMLDivElement> {
    size: "xs" | "sm" | "md";
}

// rated E for Everybody ^_^
export function ExplicitTag({ className, size, ...props }: ExplicitTagProps) {
    return (
        <Tooltip text="Explicit">
            {tooltipProps => (
                <BaseText
                    {...tooltipProps}
                    {...props}
                    size={size}
                    weight="semibold"
                    className={classes(cl("explicit-tag"), className)}
                >
                    E
                </BaseText>
            )}
        </Tooltip>
    );
}
