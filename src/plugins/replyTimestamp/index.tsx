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
import { filters, findByPropsLazy, mapMangledModuleLazy } from "@webpack";
import { Timestamp } from "@webpack/common";
import type { PropsWithChildren } from "react";

const { calendarFormat, dateFormat, isSameDay } = mapMangledModuleLazy("millisecondsInUnit:", {
    calendarFormat: filters.byCode("sameElse"),
    dateFormat: filters.byCode('":'),
    isSameDay: filters.byCode("Math.abs(+"),
});

const MessageClasses: Record<string, string> = findByPropsLazy("separator", "latin24CompactTimeStamp");

const Sep = ({ children }: PropsWithChildren) => (
    <i
        className={MessageClasses.separator}
        aria-hidden={true}
    >
        {children}
    </i>
);

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
            className="vc-reply-timestamp"
            compact={isSameDay(refTimestamp, baseTimestamp)}
            timestamp={refTimestamp}
            isInline={false}
        >
            <Sep>[</Sep>
            {isSameDay(refTimestamp, baseTimestamp)
                ? dateFormat(refTimestamp, "LT")
                : calendarFormat(refTimestamp)
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
            find: ".REPLY_QUOTE_MESSAGE_BLOCKED",
            replacement: {
                match: /(?<="aria-label":\i,children:\[)(?=\i,\i,\i\])/,
                replace: "$self.ReplyTimestamp(arguments[0]),"
            }
        }
    ],

    ReplyTimestamp: ErrorBoundary.wrap(ReplyTimestamp, { noop: true }),
});
