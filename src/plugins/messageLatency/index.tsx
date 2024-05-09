/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { isNonNullish } from "@utils/guards";
import definePlugin, { OptionType } from "@utils/types";
import { findExportedComponentLazy } from "@webpack";
import { SnowflakeUtils, Tooltip } from "@webpack/common";
import { Message } from "discord-types/general";

type FillValue = ("status-danger" | "status-warning" | "text-muted");
type Fill = [FillValue, FillValue, FillValue];
type DiffKey = keyof Diff;

interface Diff {
    days: number,
    hours: number,
    minutes: number,
    seconds: number;
}

const HiddenVisually = findExportedComponentLazy("HiddenVisually");

export default definePlugin({
    name: "MessageLatency",
    description: "Displays an indicator for messages that took ≥n seconds to send",
    authors: [Devs.arHSM],
    settings: definePluginSettings({
        latency: {
            type: OptionType.NUMBER,
            description: "Threshold in seconds for latency indicator",
            default: 2
        }
    }),
    patches: [
        {
            find: "showCommunicationDisabledStyles",
            replacement: {
                match: /(message:(\i),avatar:\i,username:\(0,\i.jsxs\)\(\i.Fragment,\{children:\[)(\i&&)/,
                replace: "$1$self.Tooltip()({ message: $2 }),$3"
            }
        }
    ],
    stringDelta(delta: number) {
        const diff: Diff = {
            days: Math.round(delta / (60 * 60 * 24)),
            hours: Math.round((delta / (60 * 60)) % 24),
            minutes: Math.round((delta / (60)) % 60),
            seconds: Math.round(delta % 60),
        };

        const str = (k: DiffKey) => diff[k] > 0 ? `${diff[k]} ${k}` : null;
        const keys = Object.keys(diff) as DiffKey[];

        return keys.map(str).filter(isNonNullish).join(" ") || "0 seconds";
    },
    latencyTooltipData(message: Message) {
        const { id, nonce } = message;

        // Message wasn't received through gateway
        if (!isNonNullish(nonce)) return null;

        const delta = Math.round((SnowflakeUtils.extractTimestamp(id) - SnowflakeUtils.extractTimestamp(nonce)) / 1000);

        // Thanks dziurwa (I hate you)
        // This is when the user's clock is ahead
        // Can't do anything if the clock is behind
        const abs = Math.abs(delta);
        const ahead = abs !== delta;

        const stringDelta = this.stringDelta(abs);

        // Also thanks dziurwa
        // 2 minutes
        const TROLL_LIMIT = 2 * 60;
        const { latency } = this.settings.store;

        const fill: Fill = delta >= TROLL_LIMIT || ahead ? ["text-muted", "text-muted", "text-muted"] : delta >= (latency * 2) ? ["status-danger", "text-muted", "text-muted"] : ["status-warning", "status-warning", "text-muted"];

        return abs >= latency ? { delta: stringDelta, ahead: abs !== delta, fill } : null;
    },
    Tooltip() {
        return ErrorBoundary.wrap(({ message }: { message: Message; }) => {

            const d = this.latencyTooltipData(message);

            if (!isNonNullish(d)) return null;

            return <Tooltip
                text={d.ahead ? `This user's clock is ${d.delta} ahead` : `This message was sent with a delay of ${d.delta}.`}
                position="top"
            >
                {
                    props => <>
                        {<this.Icon delta={d.delta} fill={d.fill} props={props} />}
                        {/* Time Out indicator uses this, I think this is for a11y */}
                        <HiddenVisually>Delayed Message</HiddenVisually>
                    </>
                }
            </Tooltip>;
        });
    },
    Icon({ delta, fill, props }: {
        delta: string;
        fill: Fill,
        props: {
            onClick(): void;
            onMouseEnter(): void;
            onMouseLeave(): void;
            onContextMenu(): void;
            onFocus(): void;
            onBlur(): void;
            "aria-label"?: string;
        };
    }) {
        return <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            width="12"
            height="12"
            role="img"
            fill="none"
            style={{ marginRight: "8px", verticalAlign: -1 }}
            aria-label={delta}
            aria-hidden="false"
            {...props}
        >
            <path
                fill={`var(--${fill[0]})`}
                d="M4.8001 12C4.8001 11.5576 4.51344 11.2 4.16023 11.2H2.23997C1.88676 11.2 1.6001 11.5576 1.6001 12V13.6C1.6001 14.0424 1.88676 14.4 2.23997 14.4H4.15959C4.5128 14.4 4.79946 14.0424 4.79946 13.6L4.8001 12Z"
            />
            <path
                fill={`var(--${fill[1]})`}
                d="M9.6001 7.12724C9.6001 6.72504 9.31337 6.39998 8.9601 6.39998H7.0401C6.68684 6.39998 6.40011 6.72504 6.40011 7.12724V13.6727C6.40011 14.0749 6.68684 14.4 7.0401 14.4H8.9601C9.31337 14.4 9.6001 14.0749 9.6001 13.6727V7.12724Z"
            />
            <path
                fill={`var(--${fill[2]})`}
                d="M14.4001 2.31109C14.4001 1.91784 14.1134 1.59998 13.7601 1.59998H11.8401C11.4868 1.59998 11.2001 1.91784 11.2001 2.31109V13.6888C11.2001 14.0821 11.4868 14.4 11.8401 14.4H13.7601C14.1134 14.4 14.4001 14.0821 14.4001 13.6888V2.31109Z"
            />
        </svg>;
    }
});
