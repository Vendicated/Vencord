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
import type { MessageRecord } from "@vencord/discord-types";
import { findExportedComponentLazy } from "@webpack";
import { SnowflakeUtils, Tooltip } from "@webpack/common";

type FillValue = ("status-danger" | "status-warning" | "status-positive" | "text-muted");
type Fill = [FillValue, FillValue, FillValue];
type DiffKey = keyof Diff;

interface Diff {
    days: number,
    hours: number,
    minutes: number,
    seconds: number;
    milliseconds: number;
}

const DISCORD_KT_DELAY = 1471228928;
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
        },
        detectDiscordKotlin: {
            type: OptionType.BOOLEAN,
            description: "Detect old Discord Android clients",
            default: true
        },
        showMillis: {
            type: OptionType.BOOLEAN,
            description: "Show milliseconds",
            default: false
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

    stringDelta(delta: number, showMillis: boolean) {
        const diff: Diff = {
            days: Math.round(delta / (60 * 60 * 24 * 1000)),
            hours: Math.round((delta / (60 * 60 * 1000)) % 24),
            minutes: Math.round((delta / (60 * 1000)) % 60),
            seconds: Math.round(delta / 1000 % 60),
            milliseconds: Math.round(delta % 1000)
        };

        const str = (k: DiffKey) => diff[k] > 0 ? `${diff[k]} ${diff[k] > 1 ? k : k.substring(0, k.length - 1)}` : null;
        const keys = Object.keys(diff) as DiffKey[];

        const ts = keys.reduce((prev, k) => {
            const s = str(k);

            return prev + (
                isNonNullish(s)
                    ? (prev !== ""
                        ? (showMillis ? k === "milliseconds" : k === "seconds")
                            ? " and "
                            : " "
                        : "") + s
                    : ""
            );
        }, "");

        return ts || "0 seconds";
    },

    latencyTooltipData(message: MessageRecord) {
        const { latency, detectDiscordKotlin, showMillis } = this.settings.store;
        const { id, nonce } = message;

        // Message wasn't received through gateway
        if (!isNonNullish(nonce)) return null;

        // Bots basically never send a nonce, and if someone does do it then it's usually not a snowflake
        if (message.bot) return null;

        let isDiscordKotlin = false;
        let delta = SnowflakeUtils.extractTimestamp(id) - SnowflakeUtils.extractTimestamp(`${nonce}`); // milliseconds
        if (!showMillis) {
            delta = Math.round(delta / 1000) * 1000;
        }

        // Old Discord Android clients have a delay of around 17 days
        // This is a workaround for that
        if (-delta >= DISCORD_KT_DELAY - 24 * 60 * 60 * 1000) { // One day of padding for good measure
            isDiscordKotlin = detectDiscordKotlin;
            delta += DISCORD_KT_DELAY;
        }

        // Thanks dziurwa (I hate you)
        // This is when the user's clock is ahead
        // Can't do anything if the clock is behind
        const abs = Math.abs(delta);
        const ahead = abs !== delta;
        const latencyMillis = latency * 1000;

        const stringDelta = abs >= latencyMillis ? this.stringDelta(abs, showMillis) : null;

        // Also thanks dziurwa
        // 2 minutes
        const TROLL_LIMIT = 2 * 60 * 1000;

        const fill: Fill = isDiscordKotlin
            ? ["status-positive", "status-positive", "text-muted"]
            : delta >= TROLL_LIMIT || ahead
                ? ["text-muted", "text-muted", "text-muted"]
                : delta >= (latencyMillis * 2)
                    ? ["status-danger", "text-muted", "text-muted"]
                    : ["status-warning", "status-warning", "text-muted"];

        return (abs >= latencyMillis || isDiscordKotlin)
            ? { delta: stringDelta, ahead, fill, isDiscordKotlin }
            : null;
    },

    Tooltip() {
        return ErrorBoundary.wrap(({ message }: { message: MessageRecord; }) => {
            const d = this.latencyTooltipData(message);

            if (!isNonNullish(d)) return null;

            let text: string;
            if (!d.delta) {
                text = "User is suspected to be on an old Discord Android client";
            } else {
                text = (d.ahead ? `This user's clock is ${d.delta} ahead.` : `This message was sent with a delay of ${d.delta}.`)
                    + (d.isDiscordKotlin ? " User is suspected to be on an old Discord Android client." : "");
            }

            return (
                <Tooltip
                    text={text}
                    position="top"
                >
                    {props => (
                        <>
                            {<this.Icon delta={d.delta} fill={d.fill} props={props} />}
                            {/* Time Out indicator uses this, I think this is for a11y */}
                            <HiddenVisually>Delayed Message</HiddenVisually>
                        </>
                    )}
                </Tooltip>
            );
        });
    },

    Icon({ delta, fill, props }: {
        delta: string | null;
        fill: Fill,
        props: {
            onClick: () => void;
            onMouseEnter: () => void;
            onMouseLeave: () => void;
            onContextMenu: () => void;
            onFocus: () => void;
            onBlur: () => void;
            "aria-label"?: string;
        };
    }) {
        return (
            <svg
                width="12"
                height="12"
                viewBox="0 0 16 16"
                role="img"
                fill="none"
                style={{ marginRight: "8px", verticalAlign: -1 }}
                aria-label={delta ?? "Old Discord Android client"}
                aria-hidden="false"
                {...props}
            >
                <path
                    fill={`var(--${fill[0]})`}
                    d="M4.8001 12c0-.4424-.28666-.8-.63987-.8H2.23997c-.35321 0-.63987.3576-.63987.8v1.6c0 .4424.28666.8.63987.8h1.91962c.35321 0 .63987-.3576.63987-.8L4.8001 12Z"
                />
                <path
                    fill={`var(--${fill[1]})`}
                    d="M9.6001 7.12724c0-.4022-.28673-.72726-.64-.72726h-1.92c-.35326 0-.63999.32506-.63999.72726v6.54546c0 .4022.28673.7273.63999.7273h1.92c.35327 0 .64-.3251.64-.7273V7.12724Z"
                />
                <path
                    fill={`var(--${fill[2]})`}
                    d="M14.4001 2.31109c0-.39325-.2867-.71111-.64-.71111h-1.92c-.3533 0-.64.31786-.64.71111V13.6888c0 .3933.2867.7112.64.7112h1.92c.3533 0 .64-.3179.64-.7112V2.31109Z"
                />
            </svg>
        );
    }
});
