/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import type { MessageRecord } from "@vencord/discord-types";
import { findByPropsLazy } from "@webpack";
import { Timestamp } from "@webpack/common";
import type { HTMLAttributes } from "react";

const { getMessageTimestampId }: {
    getMessageTimestampId: (partialMessage: { id: string; }) => string;
} = findByPropsLazy("getMessageTimestampId");
const DateUtils = findByPropsLazy("calendarFormat", "dateFormat", "isSameDay", "accessibilityLabelCalendarFormat");
const MessageClasses = findByPropsLazy("separator", "latin24CompactTimeStamp");

function Sep(props: HTMLAttributes<HTMLElement>) {
    return <i className={MessageClasses.separator} aria-hidden={true} {...props} />;
}

const enum ReferencedMessageState {
    LOADED = 0,
    NOT_LOADED = 1,
    DELETED = 2,
}

type ReferencedMessage = { state: ReferencedMessageState.LOADED; message: MessageRecord; }
    | { state: ReferencedMessageState.NOT_LOADED | ReferencedMessageState.DELETED; };

function ReplyTimestamp({
    referencedMessage,
    baseMessage,
}: {
    referencedMessage: ReferencedMessage,
    baseMessage: MessageRecord;
}) {
    if (referencedMessage.state !== ReferencedMessageState.LOADED) return null;
    const refTimestamp = referencedMessage.message.timestamp;
    const baseTimestamp = baseMessage.timestamp;
    return (
        <Timestamp
            id={getMessageTimestampId(referencedMessage.message)}
            className="vc-reply-timestamp"
            compact={DateUtils.isSameDay(refTimestamp, baseTimestamp)}
            timestamp={refTimestamp}
            isInline={false}
        >
            <Sep>[</Sep>
            {DateUtils.isSameDay(refTimestamp, baseTimestamp)
                ? DateUtils.dateFormat(refTimestamp, "LT")
                : DateUtils.calendarFormat(refTimestamp)
            }
            <Sep>]</Sep>
        </Timestamp>
    );
}

export default definePlugin({
    name: "ReplyTimestamp",
    description: "Shows a timestamp on replied-message previews",
    authors: [Devs.Kyuuhachi],

    patches: [
        {
            find: "renderSingleLineMessage:function()",
            replacement: {
                match: /(?<="aria-label":\i,children:\[)(?=\i,\i,\i\])/,
                replace: "$self.ReplyTimestamp(arguments[0]),"
            }
        }
    ],

    ReplyTimestamp: ErrorBoundary.wrap(ReplyTimestamp, { noop: true }),
});
