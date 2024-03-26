/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { Timestamp } from "@webpack/common";
import type { Message } from "discord-types/general";
import type { HTMLAttributes } from "react";

const { getMessageTimestampId } = findByPropsLazy("getMessageTimestampId");
const { calendarFormat, dateFormat, isSameDay } = findByPropsLazy("calendarFormat", "dateFormat", "isSameDay", "accessibilityLabelCalendarFormat");
const MessageClasses = findByPropsLazy("separator", "latin24CompactTimeStamp");

function Sep(props: HTMLAttributes<HTMLElement>) {
    return <i className={MessageClasses.separator} aria-hidden={true} {...props} />;
}

function ReplyTimestamp({
    referencedMessage,
    baseMessage,
}: {
    referencedMessage: { state: number, message?: Message },
    baseMessage: Message;
}) {
    if(referencedMessage.state === 0) {
        const refTimestamp = referencedMessage.message!.timestamp as any;
        const baseTimestamp = baseMessage.timestamp as any;
        return (
            <Timestamp
                id={getMessageTimestampId(referencedMessage.message)}
                className="vc-reply-timestamp"
                compact={isSameDay(refTimestamp, baseTimestamp)}
                timestamp={refTimestamp}
                isInline={false}
            >
                <Sep>[</Sep>
                { isSameDay(refTimestamp, baseTimestamp)
                    ? dateFormat(refTimestamp, "LT")
                    : calendarFormat(refTimestamp)
                }
                <Sep>]</Sep>
            </Timestamp>
        );
    }
    return null;
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
