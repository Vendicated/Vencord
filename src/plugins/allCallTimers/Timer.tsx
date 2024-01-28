/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useFixedTimer } from "@utils/react";
import { formatDurationMs } from "@utils/text";
import { Tooltip } from "@webpack/common";

import { settings } from "./index";
import { TimerIcon } from "./TimerIcon";

export function Timer({ time }: Readonly<{ time: number; }>) {
    const durationMs = useFixedTimer({ initialTime: time });
    const formatted = formatDurationMs(durationMs, settings.store.format === "human");

    if (settings.store.showWithoutHover) {
        return <p style={{
            margin: 0,
            fontWeight: "bold",
            letterSpacing: -2,
            fontFamily: "monospace",
            fontSize: 12,
            color: "red",
            position: "absolute",
            bottom: 0,
            right: 0,
            padding: 2,
            background: "rgba(0,0,0,.5)",
            borderRadius: 3
        }
        }>{formatted}</p>;
    } else {
        // show as a tooltip
        return (
            <Tooltip text={formatted}>
                {({ onMouseEnter, onMouseLeave }) => (
                    <div
                        onMouseEnter={onMouseEnter}
                        onMouseLeave={onMouseLeave}
                        role="tooltip"
                    >
                        <TimerIcon />
                    </div>
                )}
            </Tooltip>
        );
    }
}
