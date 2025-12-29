/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import ErrorBoundary from "@components/ErrorBoundary";
import { Paragraph } from "@components/Paragraph";
import { findByCodeLazy, findComponentByCodeLazy } from "@webpack";
import { moment, useRef, UserStore, useState } from "@webpack/common";

import customTimestamps from ".";

type TimeFormat = {
    name: string;
    description: string;
    default: string;
    offset: number;
};
const MessagePreview = findComponentByCodeLazy<{
    author: any,
    message: any,
    compact: boolean,
    isGroupStart: boolean,
    className: string,
    hideSimpleEmbedContent: boolean;
}>(/previewGuildId:\i,preview:\i,/);
const createBotMessage = findByCodeLazy('username:"Clyde"');
const populateMessagePrototype = findByCodeLazy("isProbablyAValidSnowflake", "messageReference:");

export const timeFormats: Record<string, TimeFormat> = {
    cozyFormat: {
        name: "Cozy mode",
        description: "Time format to use in messages on cozy mode",
        default: "[calendar]",
        offset: 0,
    },
    compactFormat: {
        name: "Compact mode",
        description: "Time format on compact mode and hovering messages",
        default: "LT",
        offset: 0,
    },
    tooltipFormat: {
        name: "Tooltip",
        description: "Time format to use on tooltips",
        default: "LLLL • [relative]",
        offset: 0,
    },
    ariaLabelFormat: {
        name: "Aria label",
        description: "Time format to use on aria labels",
        default: "[calendar]",
        offset: 0,
    },
    sameDayFormat: {
        name: "Same day",
        description: "[calendar] format for today",
        default: "[Today at] HH:mm:ss",
        offset: 0,
    },
    lastDayFormat: {
        name: "Last day",
        description: "[calendar] format for yesterday",
        default: "[Yesterday at] HH:mm:ss",
        offset: -1000 * 60 * 60 * 24,
    },
    lastWeekFormat: {
        name: "Last week",
        description: "[calendar] format for within the last week",
        default: "ddd DD.MM.YYYY HH:mm:ss",
        offset: -1000 * 60 * 60 * 24 * 6, // setting an offset of a week exactly pushes it into "older date" territory as soon as a second passes
    },
    sameElseFormat: {
        name: "Older date",
        description: "[calendar] format for older dates",
        default: "ddd DD.MM.YYYY HH:mm:ss",
        offset: -1000 * 60 * 60 * 24 * 31,
    }
};

const DemoMessage = (props: { msgId, compact, message, date: Date | undefined, isGroupStart?: boolean; }) => {
    const message = createBotMessage({ content: props.message, channelId: "1337", embeds: [] });
    message.author = UserStore.getCurrentUser();
    message.id = props.msgId;
    message.timestamp = moment(props.date ?? new Date());
    const user = UserStore.getCurrentUser();
    const populatedMessage = message && populateMessagePrototype(message);
    return populatedMessage ? (
        <div className="vc-cmt-demo-message">
            <MessagePreview
                author={{ ...user, nick: user.globalName || user.username }}
                message={populatedMessage}
                compact={props.compact}
                isGroupStart={props.isGroupStart || false}
                className="vc-cmt-demo-message-preview"
                hideSimpleEmbedContent={true}
            />
        </div>
    ) : <div className="vc-cmt-demo-message">
        <Paragraph>
            {/* @ts-ignore */}
            <b>Preview:</b> {customTimestamps.renderTimestamp(date, "cozy")}
        </Paragraph>
    </div>;
};

export const DemoMessageContainer = ErrorBoundary.wrap(() => {
    const [isCompact, setIsCompact] = useState(false);
    const today = useRef<Date>(new Date());
    const yesterday = useRef<Date>(new Date(Date.now() + timeFormats.lastDayFormat.offset));
    const lastWeek = useRef<Date>(new Date(Date.now() + timeFormats.lastWeekFormat.offset));
    const aMonthAgo = useRef<Date>(new Date(Date.now() + timeFormats.sameElseFormat.offset));

    return (
        <div className={"vc-cmt-demo-message-container"} onClick={() => setIsCompact(!isCompact)}>
            <DemoMessage compact={isCompact} msgId={"1337"}
                message={`Click me to switch to ${isCompact ? "cozy" : "compact"} mode`} isGroupStart={true}
                date={aMonthAgo.current} />
            <DemoMessage compact={isCompact} msgId={"1338"} message={"This message was sent in the last week"}
                isGroupStart={true} date={lastWeek.current} />
            <DemoMessage compact={isCompact} msgId={"1339"} message={"Hover over timestamps to see tooltip formats"}
                isGroupStart={true} date={yesterday.current} />
            <DemoMessage compact={isCompact} msgId={"1340"} message={"Edit the formats below to see them live update here"} isGroupStart={true}
                date={today.current} />
        </div>
    );
}, { noop: true });
