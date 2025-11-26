/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Channel, Message } from "@vencord/discord-types";
import { findByPropsLazy } from "@webpack";
import { MessageStore, useEffect, UserStore, useState, useStateFromStores } from "@webpack/common";

import { cl, settings } from ".";
import { IconGhost } from "./IconGhost";

function isChannelExempted(channelId: string): boolean {
    const exemptList = settings.store.exemptedChannels
        .split(",")
        .map(id => id.trim())
        .filter(id => id.length > 0);

    return exemptList.includes(channelId);
}

const countedChannels = new Set<string>();
// track channels that were manually cleared and the message ID at time of clear
const clearedChannels = new Map<string, string>();
// listeners for when a channel is cleared or un-cleared (thororen is this allowed lolz)
const clearedChannelListeners = new Set<(channelId: string) => void>();

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

export function onClearedChannelChange(cb: (channelId: string) => void) {
    clearedChannelListeners.add(cb);
    return () => {
        clearedChannelListeners.delete(cb);
    };
}

export function getGhostedChannels(): string[] {
    return Array.from(countedChannels);
}

export function clearChannelFromGhost(channelId: string): void {
    if (countedChannels.has(channelId)) {
        countedChannels.delete(channelId);
        setBooCount(getBooCount() - 1);

        // so we can detect new messages from the other person
        const lastMessage = MessageStore.getMessages(channelId)?.last();
        if (lastMessage) {
            clearedChannels.set(channelId, lastMessage.id);
        }

        // notify all listeners that this channel was cleared
        for (const listener of clearedChannelListeners) {
            listener(channelId);
        }
    }
}

export function isChannelCleared(channelId: string): boolean {
    return clearedChannels.has(channelId);
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
    const [isCleared, setIsCleared] = useState(false);

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

    // track if this channel was manually cleared
    useEffect(() => {
        setIsCleared(clearedChannels.has(id));

        // subscribe to cleared channel changes for instant visual updates
        const unsubscribe = onClearedChannelChange(clearedChannelId => {
            if (clearedChannelId === id) {
                // check current state: if it's still in clearedChannels, it was cleared; otherwise un-cleared
                setIsCleared(clearedChannels.has(id));
            }
        });

        return unsubscribe;
    }, [id, lastMessage?.id]);

    useEffect(() => {
        if (!state.isDataProcessed) return;

        const isExempted = isChannelExempted(id);
        let wasManuallyCleared = clearedChannels.has(id);

        // if manually cleared, check if there's a NEW message from the other person
        if (wasManuallyCleared && !state.isCurrentUser) {
            const clearedAtMessageId = clearedChannels.get(id);
            const currentLastMessageId = lastMessage?.id;

            // if it's the same message, stay cleared (don't re-ghost)
            if (clearedAtMessageId === currentLastMessageId) {
                return;
            }

            // if there's a NEW message from the OTHER person, remove from cleared state
            // so it can be re-ghosted
            if (currentLastMessageId !== clearedAtMessageId) {
                clearedChannels.delete(id);
                wasManuallyCleared = false; // update the flag since we deleted it
                // notify listeners that this channel is no longer cleared (new message)
                for (const listener of clearedChannelListeners) {
                    listener(id);
                }
            }
        }

        // if the current user responded, clear all tracking
        if (state.isCurrentUser) {
            if (countedChannels.has(id)) {
                countedChannels.delete(id);
                setBooCount(getBooCount() - 1);
            }
            if (clearedChannels.has(id)) {
                clearedChannels.delete(id);
            }
            return;
        }

        // if exempted or bot (if setting enabled), remove from ghost tracking
        if (isExempted || (settings.store.ignoreBots && lastMessage.author.bot)) {
            if (countedChannels.has(id)) {
                countedChannels.delete(id);
                setBooCount(getBooCount() - 1);
            }
            return;
        }

        // if manually cleared, don't add back to ghost count
        if (wasManuallyCleared) {
            return;
        }

        // normal ghosting logic: last message is from other person
        if (!state.isCurrentUser) {
            if (!countedChannels.has(id)) {
                countedChannels.add(id);
                setBooCount(getBooCount() + 1);
            }
        }
    }, [state.isCurrentUser, state.isDataProcessed, id, lastMessage?.id]);

    if (!state.isDataProcessed || !currentUserId || !lastMessage || state.isCurrentUser || isChannelExempted(id) || isCleared || (settings.store.ignoreBots && lastMessage.author.bot))
        return null;

    if (!settings.store.showDmIcons) return null;

    return (
        <div className={cl("icon", ChannelWrapperStyles.wrapper)}>
            <IconGhost fill={state.containsQuestionMark ? "#ff8000" : "currentColor"} />
        </div>
    );
}
