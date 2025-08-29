/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import type { Message } from "@vencord/discord-types";
import { DateUtils, Timestamp } from "@webpack/common";

const enum ReferencedMessageState {
    LOADED = 0,
    NOT_LOADED = 1,
    DELETED = 2,
}

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
    return (
        <Timestamp
            className="vc-reply-timestamp"
            compact={DateUtils.isSameDay(refTimestamp, baseTimestamp)}
            timestamp={refTimestamp}
            isInline={false}
        />
    );
}

export default definePlugin({
    name: "ReplyTimestamp",
    description: "Shows a timestamp on replied-message previews",
    authors: [Devs.Kyuuhachi],

    patches: [
        {
            find: "#{intl::REPLY_QUOTE_MESSAGE_BLOCKED}",
            replacement: {
                match: /\.onClickReply,.+?}\),(?=\i,\i,\i\])/,
                replace: "$&$self.ReplyTimestamp(arguments[0]),"
            }
        }
    ],

    ReplyTimestamp: ErrorBoundary.wrap(ReplyTimestamp, { noop: true }),
});
