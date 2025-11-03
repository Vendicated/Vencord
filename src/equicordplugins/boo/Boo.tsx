/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Channel, Message } from "@vencord/discord-types";
import { findByPropsLazy } from "@webpack";
import { MessageStore, useEffect, UserStore, useState, useStateFromStores } from "@webpack/common";

import { cl } from ".";
import { IconGhost } from "./IconGhost";

const countedChannels = new Set<string>();
export let booCount = 0;

const ChannelWrapperStyles = findByPropsLazy("muted", "wrapper");

export function Boo({ channel }: { channel: Channel; }) {
    const { id } = channel;

    const currentUserId = useStateFromStores([UserStore], () => UserStore.getCurrentUser()?.id);
    const lastMessage: Message = useStateFromStores([MessageStore], () =>
        MessageStore.getMessages(id)?.last()
    );

    const [state, setState] = useState({
        isCurrentUser: null as boolean | null,
        containsQuestionMark: false,
        isDataProcessed: false,
    });

    useEffect(() => {
        if (!lastMessage || !currentUserId) return;

        const lastIsCurrentUser = lastMessage.author.id === currentUserId;
        const containsQuestionMark = !lastIsCurrentUser && lastMessage.content.includes("?");

        setState({
            isCurrentUser: lastIsCurrentUser,
            containsQuestionMark,
            isDataProcessed: true,
        });
    }, [lastMessage, currentUserId]);

    if (countedChannels.has(id) && state.isCurrentUser) {
        countedChannels.delete(id);
        booCount--;
    }

    if (!state.isDataProcessed || !currentUserId || !lastMessage || state.isCurrentUser) return null;

    if (!countedChannels.has(id)) {
        countedChannels.add(id);
        booCount++;
    }

    return (
        <div className={cl("icon", ChannelWrapperStyles.wrapper)}>
            {state.containsQuestionMark
                ? <IconGhost fill="#ff8000" />
                : <IconGhost fill="currentColor" />}
        </div>
    );
}
