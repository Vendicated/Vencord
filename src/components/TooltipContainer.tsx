/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { TooltipProps } from "@vencord/discord-types";
import { Tooltip } from "@webpack/common";

export function TooltipContainer({ children, ...props }: Omit<TooltipProps, "children"> & { children: React.ReactNode; }) {
    return (
        <Tooltip {...props}>
            {tooltipProps =>
                <div {...tooltipProps}>
                    {children}
                </div>
            }
        </Tooltip>
    );
}
