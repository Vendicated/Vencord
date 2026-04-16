/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType, PluginNative } from "@utils/types";
import { Message } from "@vencord/discord-types";
import { ApplicationAssetUtils, FluxDispatcher, UserStore } from "@webpack/common";

export async function getApplicationAsset(key: string): Promise<string> {
    if (/https?:\/\/(cdn|media)\.discordapp\.(com|net)\/attachments\//.test(key)) return "mp:" + key.replace(/https?:\/\/(cdn|media)\.discordapp\.(com|net)\//, "");
    return (await ApplicationAssetUtils.fetchAssetIds("0", [key]))[0];
}

enum StatsDisplay {
    messagesSentToday,
    messagesSentAllTime,
    mostListenedAlbum
}

const settings = definePluginSettings(
    {
        assetURL: {
            type: OptionType.STRING,
            description: "The image to use for your rpc. Your profile picture is used if left blank",
            default: "",
            restartNeeded: false,
            onChange: () => { updateData(); }
        },
        RPCTitle: {
            type: OptionType.STRING,
            description: "The title for the rpc",
            default: "RPCStats",
            restartNeeded: false,
            onChange: () => { updateData(); }
        },
        statDisplay: {
            type: OptionType.SELECT,
            description: "What should the rpc display? (you can only have one line i'm pretty sure)",
            options: [
                { value: StatsDisplay.messagesSentToday, label: "The amount of messages sent today", default: true },
                { value: StatsDisplay.messagesSentAllTime, label: "The amount of messages sent all time" },
                { value: StatsDisplay.mostListenedAlbum, label: "Your most listened album for the week" }
            ],
            restartNeeded: false,
            onChange: () => { updateData(); }
        },
        lastFMApiKey: {
            type: OptionType.STRING,
            description: "Your last.fm API key",
            default: "",
            restartNeeded: false,
            onChange: () => { updateData(); }
        },
        lastFMUsername: {
            type: OptionType.STRING,
            description: "Your last.fm username",
            default: "",
            restartNeeded: false,
            onChange: () => { updateData(); }
        },
        albumCoverImage: {
            type: OptionType.BOOLEAN,
            description: "Should the album cover image be used as the rpc image? (if you have the last fm display chosen)",
            default: true,
            restartNeeded: false,
            onChange: () => { updateData(); }
        },
        lastFMStatFormat: {
            type: OptionType.STRING,
            description: "How should the last fm stat be formatted? $album is replaced with the album name, and $artist is replaced with the artist name",
            default: "Top album this week: \"$album - $artist\"",
            restartNeeded: false,
            onChange: () => { updateData(); }
        }
    });

async function setRpc(disable?: boolean, details?: string, imageURL?: string) {
    if (!disable) {
        if (!settings.store.lastFMApiKey.length && settings.store.statDisplay === StatsDisplay.mostListenedAlbum) {
            FluxDispatcher.dispatch({
                type: "LOCAL_ACTIVITY_UPDATE",
                activity: null,
                socketId: "RPCStats",
            });
        }
    }
    const activity = {
        "application_id": "0",
        "name": settings.store.RPCTitle,
        "details": details || "No info right now :(",
        "type": 0,
        "flags": 1,
        "assets": {
            // i love insanely long statements
            "large_image":
                (imageURL == null || !settings.store.albumCoverImage) ?
                    await getApplicationAsset(settings.store.assetURL.length ? settings.store.assetURL : UserStore.getCurrentUser().getAvatarURL()) :
                    await getApplicationAsset(imageURL)
        }
    };
    FluxDispatcher.dispatch({
        type: "LOCAL_ACTIVITY_UPDATE",
        activity: !disable ? activity : null,
        socketId: "RPCStats",
    });
}

function getCurrentDate(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

interface IMessageCreate {
    type: "MESSAGE_CREATE";
    optimistic: boolean;
    isPushNotification: boolean;
    channelId: string;
    message: Message;
}

const Native = VencordNative.pluginHelpers.RPCStats as PluginNative<typeof import("./native")>;

async function updateData() {
    switch (settings.store.statDisplay) {
        case StatsDisplay.messagesSentToday:
            let messagesSent;
            if (await DataStore.get("RPCStatsDate") === getCurrentDate()) {
                messagesSent = await DataStore.get("RPCStatsMessages");
            }
            else {
                await DataStore.set("RPCStatsDate", getCurrentDate());
                await DataStore.set("RPCStatsMessages", 0);
                messagesSent = 0;
            }
            setRpc(false, `Messages sent today: ${messagesSent}\n`);
            break;
        case StatsDisplay.messagesSentAllTime:
            let messagesAllTime = await DataStore.get("RPCStatsAllTimeMessages");
            if (!messagesAllTime) {
                DataStore.set("RPCStatsAllTimeMessages", 0);
                messagesAllTime = 0;
            }
            setRpc(false, `Messages sent all time: ${messagesAllTime}\n`);
            break;
        // slightly cursed
        case StatsDisplay.mostListenedAlbum:

            const lastFMDataJson = await Native.fetchTopAlbum(
                {
                    apiKey: settings.store.lastFMApiKey,
                    user: settings.store.lastFMUsername,
                    period: "7day"
                });

            if (lastFMDataJson == null) return;

            const lastFMData = JSON.parse(lastFMDataJson);
            console.log(lastFMData);
            setRpc(false, settings.store.lastFMStatFormat.replace("$album", lastFMData.albumName).replace("$artist", lastFMData.artistName), lastFMData?.albumCoverUrl);
            break;
    }
}

export default definePlugin({
    name: "RPCStats",
    description: "Displays stats about your activity as an rpc",
    authors: [Devs.Samwich],
    async start() {
        updateData();

        setInterval(() => {
            checkForNewDay();
            updateData();
        }, 1000);

    },
    settings,
    stop() {
        setRpc(true);
    },
    flux:
    {
        async MESSAGE_CREATE({ optimistic, type, message }: IMessageCreate) {
            if (optimistic || type !== "MESSAGE_CREATE") return;
            if (message.state === "SENDING") return;
            if (message.author.id !== UserStore.getCurrentUser().id) return;
            await DataStore.set("RPCStatsMessages", await DataStore.get("RPCStatsMessages") + 1);
            await DataStore.set("RPCStatsAllTimeMessages", await DataStore.get("RPCStatsAllTimeMessages") + 1);
            updateData();
        },
    }
});

let lastCheckedDate: string = getCurrentDate();

function checkForNewDay(): void {
    const currentDate = getCurrentDate();
    if (currentDate !== lastCheckedDate) {
        lastCheckedDate = currentDate;
    }
}
