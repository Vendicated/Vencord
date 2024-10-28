/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addChatBarButton, ChatBarButton, removeChatBarButton } from "@api/ChatButtons";
import { addPreSendListener, removePreSendListener } from "@api/MessageEvents";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { getCurrentChannel, getCurrentGuild } from "@utils/discord";
import definePlugin, { OptionType } from "@utils/types";
import { useEffect, useState } from "@webpack/common";

const settings = definePluginSettings({
    countdownAmount: {
        type: OptionType.SLIDER,
        description: "The amount of seconds you want the countdown to be",
        markers: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90],
        default: 60,
        stickToMarkers: true
    },
    onlyInGuilds: {
        type: OptionType.BOOLEAN,
        description: "Only enable the countdown in guilds",
        default: true
    },
    channelWhitelist: {
        type: OptionType.BOOLEAN,
        description: "Only enable the countdown in the specified channels",
        default: false
    },
    channels: {
        type: OptionType.STRING,
        description: "Comma-separated list of channel IDs where the countdown is enabled",
        default: ""
    }
});

const storage = new Map<string, Date>();

const CountdownComponent = ({ isMainChat, channel }) => {
    if (!isMainChat) return null;
    if (settings.store.onlyInGuilds && !channel.guild_id) return null;
    if (settings.store.channelWhitelist && !settings.store.channels.split(",").includes(channel.id)) return null;

    const getSecondsLeft = (channelId: string) => {
        const timeData = storage.get(channelId);
        if (timeData) {
            const seconds = Math.floor((timeData.getTime() - new Date().getTime()) / 1000);
            return seconds;
        }
        return 0;
    };

    const [timeLeft, setTimeLeft] = useState(() => {
        const channelId = getCurrentChannel()?.id;
        const secondsLeft = channelId ? getSecondsLeft(channelId) : 0;
        return secondsLeft > 0 ? secondsLeft : settings.store.countdownAmount;
    });

    useEffect(() => {
        const loop = setInterval(() => {
            const channelId = getCurrentChannel()?.id;
            if (channelId) {
                const seconds = getSecondsLeft(channelId);
                if (seconds > 0) {
                    setTimeLeft(seconds);
                } else {
                    setTimeLeft(settings.store.countdownAmount);
                    storage.delete(channelId);
                }
            }
        }, 1000);

        return () => clearInterval(loop);
    }, []);

    return (
        <ChatBarButton
            tooltip="Reset Countdown!"
            onClick={() => {
                const channelId = getCurrentChannel()?.id;
                if (channelId) storage.delete(channelId);
                setTimeLeft(settings.store.countdownAmount);
            }}
        >
            <p style={{
                width: `${String(settings.store.countdownAmount).length * 12}px`,
                height: "24px",
                margin: 0,
                padding: 0,
                fontSize: "24px",
                alignContent: "center",
                textAlign: "center",
            }}>{String(timeLeft).padStart(String(settings.store.countdownAmount).length, "0")}</p>
        </ChatBarButton>
    );
};

export default definePlugin({
    name: "MessageCountdown",
    description: "A countdown starts when you send a message, you need to wait for it to finish before it can start again",
    authors: [Devs.Kewi],
    settings,

    start() {
        addChatBarButton("MessageCountdown", CountdownComponent);

        this.listener = addPreSendListener((channelId, _) => {
            if (settings.store.onlyInGuilds && !getCurrentGuild()?.id) return;
            if (settings.store.channelWhitelist && !settings.store.channels.split(",").includes(channelId)) return;

            const timeData = storage.get(channelId);
            const nowAndAmount = new Date().getTime() + (settings.store.countdownAmount * 1000);

            if (!timeData || timeData.getTime() > nowAndAmount) {
                storage.set(channelId, new Date(nowAndAmount));
                console.log(storage);
            }
        });
    },

    stop() {
        removeChatBarButton("MessageCountdown");
        removePreSendListener(this.listener);
    },
});
