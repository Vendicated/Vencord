/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Tooltip } from "@webpack/common";
import type { ReactElement } from "react";

export interface ToneIndicatorProps {
    prefix: string;
    indicator: string;
    desc: string;
}

export default function ToneIndicator({
    prefix,
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
                    {prefix}{indicator}
                </span>
            )}
        </Tooltip>
    );
}
