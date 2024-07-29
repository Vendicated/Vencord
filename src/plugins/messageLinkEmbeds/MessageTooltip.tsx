/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { getUserSettingLazy } from "@api/UserSettings";
import ErrorBoundary from "@components/ErrorBoundary";
import { findComponentByCodeLazy } from "@webpack";
import {
    ChannelStore,
    Constants,
    MessageStore,
    PermissionsBits,
    PermissionStore,
    RestAPI,
    Spinner,
    Tooltip,
    useEffect,
    useState,
    useStateFromStores,
} from "@webpack/common";
import type { Message } from "discord-types/general";

const ChannelMessage = findComponentByCodeLazy("childrenExecutedCommand:", ".hideAccessories");
const MessageDisplayCompact = getUserSettingLazy("textAndImages", "messageDisplayCompact")!;

export default function MessageTooltip({ messageId, channelId, children }) {
    if(!messageId) return children;
    return <Tooltip
        tooltipClassName="vc-message-link-tooltip"
        text={
            <ErrorBoundary>
                <MessagePreview
                    channelId={channelId}
                    messageId={messageId}
                />
            </ErrorBoundary>
        }
        children={({ onMouseEnter, onMouseLeave }) => children({ onMouseEnter, onMouseLeave })}
    />;
}

function MessagePreview({ channelId, messageId }) {
    const channel = ChannelStore.getChannel(channelId);
    const compact = MessageDisplayCompact.useSetting();
    const { status, message } = useMessage(channelId, messageId);

    switch (status) {
        case MessageStatus.LOADING:
            return <Spinner type={Spinner.Type.PULSING_ELLIPSIS} />;
        case MessageStatus.LOADED:
            return <ChannelMessage
                id={`message-link-tooltip-${messageId}`}
                message={message}
                channel={channel}
                subscribeToComponentDispatch={false}
                compact={compact}
            />;
        case MessageStatus.ERROR:
            return <span className="vc-mle-tooltip-error">Failed to load message.</span>;
        case MessageStatus.PRIVATE:
            return <span className="vc-mle-tooltip-error">Channel is private.</span>;
    }
}

const enum MessageStatus {
    LOADING,
    LOADED,
    ERROR,
    PRIVATE,
}

function useMessage(channelId, messageId): { status: MessageStatus, message?: Message } {
    const cachedMessage = useStateFromStores(
        [MessageStore],
        () => MessageStore.getMessage(channelId, messageId)
    );
    const [message, setMessage] = useState(cachedMessage ? { status: MessageStatus.LOADED, message: cachedMessage } : { status: MessageStatus.LOADING });
    useEffect(() => {
        if(message.status === MessageStatus.LOADING)
            fetchMessage(channelId, messageId).then(setMessage);
    });
    return message;
}

async function fetchMessage(channelId, messageId): Promise<{ status: MessageStatus, message?: Message }> {
    const channel = ChannelStore.getChannel(channelId);
    if (!channel || (!channel.isPrivate() && !PermissionStore.can(PermissionsBits.VIEW_CHANNEL, channel))) {
        return { status: MessageStatus.PRIVATE };
    }
    try {
        const res = await RestAPI.get({
            url: Constants.Endpoints.MESSAGES(channelId),
            query: {
                limit: 1,
                around: messageId,
            },
            retries: 2,
        });
        const message = MessageStore.getMessages(channelId)
            .receiveMessage(res.body[0])
            .get(messageId);
        return message ? { status: MessageStatus.LOADED, message } : { status: MessageStatus.ERROR };
    } catch (e) {
        console.error("error fetching message", e);
        return { status: MessageStatus.ERROR };
    }
}
