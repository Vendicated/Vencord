/*
  * Vencord, a Discord client mod
  * Copyright (c) 2025 Vendicated and contributors
  * SPDX-License-Identifier: GPL-3.0-or-later
  */

import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import { Devs } from "@utils/constants";
import { sleep } from "@utils/misc";
import definePlugin from "@utils/types";
import { findByPropsLazy, findStoreLazy } from "@webpack";
import { DateUtils, FluxDispatcher, MessageStore, SelectedChannelStore, Tooltip, React, useState, useStateFromStores } from "@webpack/common";
import { Message } from "discord-types/general";

const MessageActions = findByPropsLazy("fetchMessages", "sendMessage");

function getTotalReactions(message: Message): number {
    if (!message?.reactions) {
        return 0;
    }
    return message.reactions.reduce((sum, reaction) => sum + (reaction.count ?? 0), 0);
}

function getOldestMessage(channelId: string): Message | undefined {
     const messagesObj = MessageStore.getMessages(channelId);
     const currentMessages = messagesObj?._array ?? [];
     return currentMessages.reduce((oldest, msg) => {
         if (!oldest || BigInt(msg.id) < BigInt(oldest.id)) {
             return msg;
         }
         return oldest;
     }, undefined as Message | undefined);
}


const LoadAndSortButton: ChatBarButtonFactory = ({ isMainChat }) => {
    if (!isMainChat) return null;

    const [isLoading, setIsLoading] = useState(false);
    const currentChannelId = SelectedChannelStore.getChannelId();

    const oldestMessageTimestampText = useStateFromStores(
        [MessageStore, SelectedChannelStore],
        () => {
            const chanId = SelectedChannelStore.getChannelId();
            if (!chanId) return "";
            const oldestMsg = getOldestMessage(chanId);
            if (!oldestMsg) return "";
            return DateUtils.calendarFormat(oldestMsg.timestamp);
        }
    );


    const handleLoadAndSortClick = async () => {
        const channelId = SelectedChannelStore.getChannelId();
        if (!channelId || isLoading) {
            return;
        }

        if (!MessageActions?.fetchMessages) {
             return;
        }

        setIsLoading(true);

        const FETCH_LIMIT = 100;
        let fetchError = null;

        try {
            const oldestMsg = getOldestMessage(channelId);

            await MessageActions.fetchMessages({
                channelId: channelId,
                limit: FETCH_LIMIT,
                before: oldestMsg?.id,
            });

            await sleep(100);

            const messagesObj = MessageStore.getMessages(channelId);
            const messagesArray = messagesObj?._array;

            if (messagesArray && messagesArray.length > 0) {
                messagesArray.sort((a, b) => getTotalReactions(a) - getTotalReactions(b));

                 if (messagesArray.length > 0) {
                     FluxDispatcher.dispatch({
                         type: "MESSAGE_UPDATE",
                         message: messagesArray[messagesArray.length - 1],
                         logMuted: true,
                     });
                 }
            }

        } catch (error) {
            fetchError = error;
            console.error(`Failed to fetch/sort messages for channel ${channelId}:`, error);
        } finally {
            setIsLoading(false);
        }
    };

    const containerStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    };

    const timestampStyle: React.CSSProperties = {
        fontSize: '12px',
        color: 'var(--text-muted)',
        whiteSpace: 'nowrap',
        userSelect: 'none',
    };


    return (
        <div style={containerStyle}>
            <ChatBarButton
                tooltip={isLoading ? "Loading..." : "Load More Messages & Sort by Reactions"}
                onClick={handleLoadAndSortClick}
                disabled={isLoading}
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ transform: "scale(1.1)" }}>
                    {isLoading ? (
                        <>
                            <path d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,19a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z" opacity=".25"/>
                            <path d={`M10.72,19.9a8,8,0,0,1-6.5-9.79A7.77,7.77,0,0,1,10.4,4.16a8,8,0,0,1,9.49,6.52A1.54,1.54,0,0,0,21.38,12h.13a1.37,1.37,0,0,0,1.38-1.54,11,11,0,1,0-12.7,12.1A1.52,1.52,0,0,0,12,21.34h0A1.47,1.47,0,0,0,10.72,19.9Z`}>
                                <animateTransform attributeName="transform" type="rotate" dur="0.75s" values="0 12 12;360 12 12" repeatCount="indefinite"/>
                            </path>
                        </>
                    ) : (
                       <>
                           <path d="M4.75 8.75a.75.75 0 0 1 .75-.75h13a.75.75 0 0 1 0 1.5h-13a.75.75 0 0 1-.75-.75Zm0 4a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1-.75-.75Zm4 4a.75.75 0 0 1 .75-.75h3.5a.75.75 0 0 1 0 1.5h-3.5a.75.75 0 0 1-.75-.75Z"/>
                           <path d="M17 12.75a.75.75 0 0 1 .75.75v6a.75.75 0 0 1-1.5 0v-6a.75.75 0 0 1 .75-.75Zm1.78 7.28a.75.75 0 0 1 0 1.06l-2.25 2.25a.75.75 0 0 1-1.06 0l-2.25-2.25a.75.75 0 1 1 1.06-1.06l1.72 1.72 1.72-1.72a.75.75 0 0 1 1.06 0Z"/>
                       </>
                    )}
                </svg>
            </ChatBarButton>
             {oldestMessageTimestampText && (
                 <span style={timestampStyle}>
                     Oldest: {oldestMessageTimestampText}
                 </span>
             )}
        </div>
    );
};

export default definePlugin({
    name: "SortByReactions",
    description: "Adds a button to the message bar. If you click it, it will load 100 more messages (Discord API limit) and sort them by reaction count. Pressing the button multiple times, will load more messages. It further displays how far back messages are loaded.",
    authors: [Devs.bvoq],
    renderChatBarButton: LoadAndSortButton,
});
