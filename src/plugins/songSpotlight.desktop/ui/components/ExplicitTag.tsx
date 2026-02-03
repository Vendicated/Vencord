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

// rated E for Everybody ^_^
export function ExplicitTag({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <Tooltip text="Explicit">
            {tooltipProps => (
                <BaseText
                    {...tooltipProps}
                    {...props}
                    size="xs"
                    weight="medium"
                    className={classes(cl("explicit-tag"), className)}
                >
                    E
                </BaseText>
            )}
        </Tooltip>
    );
}
