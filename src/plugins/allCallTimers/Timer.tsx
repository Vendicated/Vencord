/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useTimer } from "@utils/react";
import { formatDurationMs } from "@utils/text";
import { Tooltip } from "@webpack/common";

import { EyeIcon } from "./EyeIcon";
import { settings } from "./index";

export function Timer({ time }: Readonly<{ time: number; }>) {
    const durationMs = useTimer({ deps: [time] });

    if (settings.store.alwaysShow) {
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
        }> {formatDurationMs(durationMs)}</p>;
    } else {
        // show as a tooltip
        // TODO: should probably get the icon class dynamically
        return (
            <Tooltip text={formatDurationMs(durationMs)}>
                {({ onMouseEnter, onMouseLeave }) => (
                    <div
                        onMouseEnter={onMouseEnter}
                        onMouseLeave={onMouseLeave}
                        role="tooltip"
                    >
                        <EyeIcon className="icon__1d60c" />
                    </div>
                )}
            </Tooltip>
        );
    }
}
