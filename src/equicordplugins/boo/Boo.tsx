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

let _booCount = 0;
const listeners = new Set<(n: number) => void>();

export function getBooCount() {
    return _booCount;
}

export function setBooCount(n: number) {
    _booCount = n;
    for (const l of listeners) l(_booCount);
}

export function onBooCountChange(cb: (n: number) => void) {
    listeners.add(cb);
    return () => {
        listeners.delete(cb);
    };
}

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

    useEffect(() => {
        if (!state.isDataProcessed) return;

        if (!state.isCurrentUser) {
            if (!countedChannels.has(id)) {
                countedChannels.add(id);
                setBooCount(getBooCount() + 1);
            }
        } else {
            if (countedChannels.has(id)) {
                countedChannels.delete(id);
                setBooCount(getBooCount() - 1);
            }
        }
    }, [state.isCurrentUser, state.isDataProcessed]);

    if (!state.isDataProcessed || !currentUserId || !lastMessage || state.isCurrentUser)
        return null;

    return (
        <div className={cl("icon", ChannelWrapperStyles.wrapper)}>
            <IconGhost fill={state.containsQuestionMark ? "#ff8000" : "currentColor"} />
        </div>
    );
}
