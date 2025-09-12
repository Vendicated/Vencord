/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Tooltip } from "@webpack/common";
import type { ReactElement } from "react";

export interface ToneIndicatorProps {
    indicator: string;
    desc: string;
}

export default function ToneIndicator({
    indicator,
    desc,
}: ToneIndicatorProps): ReactElement {
    return (
        <Tooltip text={desc}>
            {tooltipProps => (
                <span
                    {...tooltipProps}
                    style={{
                        color: "var(--text-normal)",
                        userSelect: "text",
                    }}
                >
                    /{indicator}
                </span>
            )}
        </Tooltip>
    );
}
