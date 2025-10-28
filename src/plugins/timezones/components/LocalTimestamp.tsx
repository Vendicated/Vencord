/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "../styles.css";

import { ErrorBoundary } from "@components/index";
import { findByPropsLazy } from "@webpack";
import { React, Tooltip, useEffect, useState } from "@webpack/common";

import { Snowflake } from "../api";
import { getUserTimezone } from "../cache";
import { formatTimestamp } from "../utils";
import { openTimezoneOverrideModal } from "./SetTimezoneOverrideModal";

// Based on Syncxv's vc-timezones user plugin //

const messageClasses = findByPropsLazy("timestamp", "compact", "contentOnly");

interface LocalTimestampProps {
    userId: Snowflake;
    timestamp?: Date;
    type: "message" | "profile";
}

export function LocalTimestamp(props: LocalTimestampProps): JSX.Element {
    return <ErrorBoundary noop={true} wrappedProps={props}>
        <LocalTimestampInner {...props} />
    </ErrorBoundary>;
}

function LocalTimestampInner(props: LocalTimestampProps): JSX.Element | null {
    const [timezone, setTimezone] = useState<string | null>();
    const [timestamp, setTimestamp] = useState(props.timestamp ?? Date.now());

    useEffect(() => {
        if (!timezone) {
            getUserTimezone(props.userId, props.type === "profile").then(setTimezone);
            return;
        }

        let timer: NodeJS.Timeout;

        if (props.type === "profile") {
            setTimestamp(Date.now());

            const now = new Date();
            const delay = (60 - now.getSeconds()) * 1000 + 1000 - now.getMilliseconds();

            timer = setTimeout(() => setTimestamp(Date.now()), delay);
        }

        return () => timer && clearTimeout(timer);
    }, [timezone, timestamp]);

    if (!timezone) return null;

    const longTime = formatTimestamp(timezone, timestamp, true);
    const shortTime = formatTimestamp(timezone, timestamp, false);

    if (props.type === "message" && !shortTime)
        return null;

    const shortTimeFormatted = props.type === "message"
        ? `• ${shortTime}`
        : shortTime ?? "Error";
    const classes = props.type === "message"
        ? `vc-timezones-message-display ${messageClasses.timestamp}`
        : "vc-timezones-profile-display";

    return <Tooltip
        position="top"
        // @ts-ignore
        delay={750}
        allowOverflow={false}
        spacing={8}
        hideOnClick={true}
        tooltipClassName="vc-timezones-tooltip"
        hide={!longTime}
        text={longTime}
    >
        {toolTipProps => <>
            <span {...toolTipProps}
                className={classes}
                onClick={() => {
                    toolTipProps.onClick();
                    openTimezoneOverrideModal(props.userId);
                }}>
                {shortTimeFormatted}
            </span>
        </>}
    </Tooltip>;
}
