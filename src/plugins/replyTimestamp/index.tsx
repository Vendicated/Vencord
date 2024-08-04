/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import definePlugin, { OptionType } from "@utils/types";
import { definePluginSettings } from "@api/Settings";
import { Forms } from "@webpack/common";
import { Link } from "@components/Link";
import { filters, findByPropsLazy, mapMangledModuleLazy } from "@webpack";
import { Timestamp } from "@webpack/common";
import type { Message } from "discord-types/general";
import type { HTMLAttributes } from "react";

const { calendarFormat, dateFormat, isSameDay } = mapMangledModuleLazy("millisecondsInUnit:", {
    calendarFormat: filters.byCode("sameElse"),
    dateFormat: filters.byCode('":'),
    isSameDay: filters.byCode("Math.abs(+"),
});
const MessageClasses = findByPropsLazy("separator", "latin24CompactTimeStamp");

function Sep(props: HTMLAttributes<HTMLElement>) {
    return <i className={MessageClasses.separator} aria-hidden={true} {...props} />;
}

const enum ReferencedMessageState {
    LOADED = 0,
    NOT_LOADED = 1,
    DELETED = 2,
}

const settings = definePluginSettings({
    replySameFormat: {
        type: OptionType.STRING,
        default: "LT",
        description: "time format for replies made on the same day",
    },
    replyElseSameFormat: {
        type: OptionType.STRING,
        default: "L LT",
        description: "time format for replies made on a different day",
    },
});


type ReferencedMessage = { state: ReferencedMessageState.LOADED; message: Message; } | { state: ReferencedMessageState.NOT_LOADED | ReferencedMessageState.DELETED; };

function ReplyTimestamp({
    referencedMessage,
    baseMessage,
}: {
    referencedMessage: ReferencedMessage,
    baseMessage: Message;
}) {
    if (referencedMessage.state !== ReferencedMessageState.LOADED) return null;
    const refTimestamp = referencedMessage.message.timestamp as any;
    const baseTimestamp = baseMessage.timestamp as any;
    const replySameFormat = settings.store.replySameFormat || 'LT';
    const replySameElseFormat = settings.store.replySameElseFormat || 'L LT';
    return (
        <Timestamp
            className="vc-reply-timestamp"
            compact={isSameDay(refTimestamp, baseTimestamp)}
            timestamp={refTimestamp}
            isInline={false}
        >
            <Sep>[</Sep>
            {isSameDay(refTimestamp, baseTimestamp)
                ? dateFormat(refTimestamp, replySameFormat)
                : dateFormat(refTimestamp, replySameElseFormat)
            }
            <Sep>]</Sep>
        </Timestamp>
    );
}

export default definePlugin({
    name: "ReplyTimestamp",
    description: "Shows a timestamp on replied-message previews",
    authors: [Devs.Kyuuhachi],
    settings,
    settingsAboutComponent: () => (
        <>
            <Forms.FormTitle tag="h3">How to use:</Forms.FormTitle>
            <Forms.FormText>
                <Link href="https://momentjs.com/docs/#/displaying/format/">Moment.js formatting documentation</Link>
            </Forms.FormText>
        </>
    ),
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
