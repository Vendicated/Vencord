import "./style.css";

import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { Timestamp } from "@webpack/common";
import { Message } from "discord-types/general";
import { HTMLAttributes } from "react";

const { getMessageTimestampId } = findByPropsLazy("getMessageTimestampId");
const { calendarFormat, dateFormat, isSameDay } = findByPropsLazy("calendarFormat", "dateFormat", "isSameDay", "accessibilityLabelCalendarFormat");
const MessageClasses = findByPropsLazy("separator", "latin24CompactTimeStamp");

function Sep(props: HTMLAttributes<HTMLElement>) {
    return <i className={MessageClasses.separator} aria-hidden={true} {...props} />;
}

export default definePlugin({
    name: "ReplyTimestamp",
    description: "Shows a timestamp on replied-message previews",
    authors: [{ id: 236588665420251137n, name: "Kyuuhachi" }],

    patches: [
        {
            find: "renderSingleLineMessage:function()",
            replacement: {
                match: /(?<="aria-label":\w+,children:\[)(?=\w+,\w+,\w+\])/,
                replace: "$self.ReplyTimestamp(arguments[0]),"
            }
        }
    ],

    ReplyTimestamp({
        referencedMessage,
        baseMessage,
    }: {
        referencedMessage: { state: number, message?: Message },
        baseMessage: Message;
    }) {
        if(referencedMessage.state === 0) {
            const refTimestamp = referencedMessage.message!.timestamp;
            const baseTimestamp = baseMessage.timestamp;
            return <Timestamp
                id={getMessageTimestampId(referencedMessage.message)}
                className="c98-reply-timestamp"
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
            </Timestamp>;
        }
    },
});
