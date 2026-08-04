/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export const MESSAGE_NAVIGATION_TIMEOUT_MS = 5_000;

export interface TimelineNavigationChannel {
    id: string;
    guild_id?: string | null;
    isThread?(): boolean;
    isForumPost?(): boolean;
}

export interface TimelineMessageNavigationRequest {
    guildId: string;
    channelId: string;
    messageId: string;
    deletedAt?: number;
    onClose(): void;
}

export interface TimelineMessageJump {
    channelId: string;
    messageId: string;
    flash: boolean;
    jumpType: "INSTANT";
}

export interface TimelineNavigationDependencies {
    getChannel(channelId: string): TimelineNavigationChannel | undefined;
    canViewChannel(channel: TimelineNavigationChannel): boolean;
    getSelectedChannelId(): string | null;
    subscribe(callback: (event: { channelId?: string | null; }) => void): void;
    unsubscribe(callback: (event: { channelId?: string | null; }) => void): void;
    wait(callback: () => void): void;
    transitionToChannel(channelId: string): void;
    transitionToThread(channel: TimelineNavigationChannel): void;
    jumpToMessage(jump: TimelineMessageJump): void;
    notify(message: string): void;
    setTimeout(callback: () => void, delay: number): unknown;
    clearTimeout(timeout: unknown): void;
}

function isThread(channel: TimelineNavigationChannel) {
    return channel.isThread?.() === true || channel.isForumPost?.() === true;
}

export function createTimelineMessageNavigator(deps: TimelineNavigationDependencies) {
    let cancelPending: (() => void) | undefined;

    const cancel = () => {
        cancelPending?.();
        cancelPending = undefined;
    };

    const navigate = (request: TimelineMessageNavigationRequest) => {
        cancel();

        const channel = deps.getChannel(request.channelId);
        if (request.deletedAt) {
            deps.notify("This message was deleted");
            return false;
        }
        if (!channel || channel.guild_id !== request.guildId) {
            deps.notify("This channel is no longer available");
            return false;
        }
        if (!deps.canViewChannel(channel)) {
            deps.notify("This channel is no longer accessible");
            return false;
        }

        request.onClose();

        let settled = false;
        const cleanup = () => {
            if (settled) return;
            settled = true;
            deps.unsubscribe(onChannelSelect);
            if (timeout !== undefined) deps.clearTimeout(timeout);
            if (cancelPending === cleanup) cancelPending = undefined;
        };

        const jump = () => {
            if (deps.getSelectedChannelId() !== request.channelId || settled) return;

            cleanup();
            try {
                deps.jumpToMessage({
                    channelId: request.channelId,
                    messageId: request.messageId,
                    flash: true,
                    jumpType: "INSTANT"
                });
            } catch {
                deps.notify("Could not open this message");
            }
        };

        const waitForSelectedChannel = () => deps.wait(jump);
        const onChannelSelect = (event: { channelId?: string | null; }) => {
            if (event.channelId !== request.channelId) return;
            waitForSelectedChannel();
        };

        cancelPending = cleanup;
        const timeout = deps.setTimeout(() => {
            cleanup();
            deps.notify("Discord did not open the target channel in time");
        }, MESSAGE_NAVIGATION_TIMEOUT_MS);

        if (deps.getSelectedChannelId() === request.channelId) {
            waitForSelectedChannel();
            return true;
        }

        deps.subscribe(onChannelSelect);
        try {
            if (isThread(channel)) deps.transitionToThread(channel);
            else deps.transitionToChannel(request.channelId);
        } catch {
            cleanup();
            deps.notify("Could not open the target channel");
            return false;
        }

        return true;
    };

    return { navigate, cancel };
}
