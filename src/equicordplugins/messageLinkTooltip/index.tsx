/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { proxyLazy } from "@utils/lazy";
import definePlugin from "@utils/types";
import { findComponentByCodeLazy } from "@webpack";
import { ChannelStore, Forms, MessageStore, RestAPI, Tooltip, useEffect, useState, useStateFromStores } from "@webpack/common";
import type { ComponentType, HTMLAttributes } from "react";

declare enum SpinnerTypes {
    WANDERING_CUBES = "wanderingCubes",
    CHASING_DOTS = "chasingDots",
    PULSING_ELLIPSIS = "pulsingEllipsis",
    SPINNING_CIRCLE = "spinningCircle",
    SPINNING_CIRCLE_SIMPLE = "spinningCircleSimple",
    LOW_MOTION = "lowMotion",
}

type Spinner = ComponentType<Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
    type?: SpinnerTypes;
    animated?: boolean;
    className?: string;
    itemClassName?: string;
    "aria-label"?: string;
}> & {
    Type: typeof SpinnerTypes;
};

const { Spinner } = proxyLazy(() => Forms as any as {
    Spinner: Spinner,
    SpinnerTypes: typeof SpinnerTypes;
});

const ChannelMessage = findComponentByCodeLazy("renderSimpleAccessories)") as ComponentType<any>;

export default definePlugin({
    name: "MessageLinkTooltip",
    description: "Like MessageLinkEmbed but without taking space",
    authors: [Devs.Kyuuhachi],

    patches: [
        {
            find: ',className:"channelMention",children:[',
            replacement: {
                match: /(?<=\.jsxs\)\()(\i\.default)/,
                replace: "$self.wrapComponent(arguments[0], $1)"
            }
        }
    ],

    wrapComponent({ messageId, channelId }, Component: ComponentType) {
        return props => {
            if (messageId === undefined) return <Component {...props} />;
            return <Tooltip
                tooltipClassName="c98-message-link-tooltip"
                text={
                    <ErrorBoundary>
                        <MessagePreview
                            channelId={channelId}
                            messageId={messageId}
                        />
                    </ErrorBoundary>
                }
            >
                {({ onMouseEnter, onMouseLeave }) =>
                    <Component
                        {...props}
                        onMouseEnter={onMouseEnter}
                        onMouseLeave={onMouseLeave}
                    />
                }
            </Tooltip>;
        };
    }
});

function MessagePreview({ channelId, messageId }) {
    const channel = ChannelStore.getChannel(channelId);
    const message = useMessage(channelId, messageId);
    // TODO handle load failure
    if (!message) {
        return <Spinner type={Spinner.Type.PULSING_ELLIPSIS} />;
    }

    return <ChannelMessage
        id={`message-link-tooltip-${messageId}`}
        message={message}
        channel={channel}
        subscribeToComponentDispatch={false}
    />;
}

function useMessage(channelId, messageId) {
    const cachedMessage = useStateFromStores(
        // @ts-ignore
        [MessageStore],
        () => MessageStore.getMessage(channelId, messageId)
    );
    const [message, setMessage] = useState(cachedMessage);
    useEffect(() => {
        if (message == null)
            (async () => {
                const res = await RestAPI.get({
                    url: `/channels/${channelId}/messages`,
                    query: {
                        limit: 1,
                        around: messageId,
                    },
                    retries: 2,
                });
                const rawMessage = res.body[0];
                const message = MessageStore.getMessages(channelId)
                    .receiveMessage(rawMessage)
                    .get(messageId);
                setMessage(message);
            })();
    });
    return message;
}
