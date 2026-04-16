/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import { definePluginSettings } from "@api/Settings";
import { EquicordDevs } from "@utils/constants";
import { getCurrentChannel } from "@utils/discord";
import definePlugin, { OptionType } from "@utils/types";
import { FluxDispatcher, React } from "@webpack/common";

interface FetchTiming {
    channelId: string;
    startTime: number;
    endTime?: number;
    duration?: number;
    timestamp?: Date;
}

let currentFetch: FetchTiming | null = null;
let currentChannelId: string | null = null;
const channelTimings: Map<string, { time: number; timestamp: Date; }> = new Map();

const settings = definePluginSettings({
    showIcon: {
        type: OptionType.BOOLEAN,
        description: "Show fetch time icon in message bar",
        default: true,
    },
    showMs: {
        type: OptionType.BOOLEAN,
        description: "Show milliseconds in timing",
        default: true,
    },
    iconColor: {
        type: OptionType.STRING,
        description: "Icon color (CSS color value)",
        default: "#00d166",
    }
});

const FetchTimeButton: ChatBarButtonFactory = ({ isMainChat }) => {
    const { showMs, iconColor } = settings.use(["showMs", "iconColor"]);

    if (!isMainChat || !settings.store.showIcon || !currentChannelId) {
        return null;
    }

    const channelData = channelTimings.get(currentChannelId);
    if (!channelData) {
        return null;
    }

    const { time, timestamp } = channelData;
    const displayTime = showMs ? `${Math.round(time)}ms` : `${Math.round(time / 1000)}s`;

    if (!showMs && Math.round(time / 1000) === 0) {
        return null;
    }

    const timeAgo = formatTimeAgo(timestamp);

    return (
        <ChatBarButton
            tooltip={`Messages loaded in ${Math.round(time)}ms (${timeAgo})`}
            onClick={() => { }}
        >
            <div style={{
                display: "flex",
                alignItems: "center",
                gap: "4px"
            }}>
                {FetchTimeIcon()}
                <span style={{
                    fontSize: "12px",
                    color: iconColor,
                    fontWeight: "500"
                }}>
                    {displayTime}
                </span>
            </div>
        </ChatBarButton>
    );
};

function FetchTimeIcon() {
    return (
        <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="currentColor"
        >
            <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z" />
        </svg>
    );
}

function formatTimeAgo(timestamp: Date): string {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
        return `${days} day${days > 1 ? "s" : ""} ago`;
    } else if (hours > 0) {
        return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    } else if (minutes > 0) {
        return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    } else {
        return "just now";
    }
}

function handleChannelSelect(data: any) {
    if (data.channelId && data.channelId !== currentChannelId) {
        currentChannelId = data.channelId;
        currentFetch = {
            channelId: data.channelId,
            startTime: performance.now()
        };
    }
}

function handleMessageLoad(data: any) {
    if (!currentFetch || data.channelId !== currentFetch.channelId) return;

    const existing = channelTimings.get(currentFetch.channelId);
    if (existing) return;

    const endTime = performance.now();
    const duration = endTime - currentFetch.startTime;

    channelTimings.set(currentFetch.channelId, {
        time: duration,
        timestamp: new Date()
    });

    currentFetch = null;
}

export default definePlugin({
    name: "MessageFetchTimer",
    description: "Shows how long it took to fetch messages for the current channel",
    authors: [EquicordDevs.GroupXyz],
    settings,

    chatBarButton: {
        icon: FetchTimeIcon,
        render: FetchTimeButton
    },

    start() {
        FluxDispatcher.subscribe("CHANNEL_SELECT", handleChannelSelect);
        FluxDispatcher.subscribe("LOAD_MESSAGES_SUCCESS", handleMessageLoad);
        FluxDispatcher.subscribe("MESSAGE_CREATE", handleMessageLoad);

        const currentChannel = getCurrentChannel();
        if (currentChannel) {
            currentChannelId = currentChannel.id;
        }
    },

    stop() {
        FluxDispatcher.unsubscribe("CHANNEL_SELECT", handleChannelSelect);
        FluxDispatcher.unsubscribe("LOAD_MESSAGES_SUCCESS", handleMessageLoad);
        FluxDispatcher.unsubscribe("MESSAGE_CREATE", handleMessageLoad);

        currentFetch = null;
        channelTimings.clear();
        currentChannelId = null;
    }
});
