/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { getUserSettingLazy } from "@api/UserSettings";
import { CodeBlock } from "@components/CodeBlock";
import { ErrorCard } from "@components/ErrorCard";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import definePlugin, { OptionType, PluginNative } from "@utils/types";
import { ApplicationAssetUtils, Button, FluxDispatcher, Forms } from "@webpack/common";
const Native = VencordNative.pluginHelpers.YoutubeMusicRichPresence as PluginNative<typeof import("./native")>;
const logger = new Logger("YoutubeMusicRichPresence");

/** Big thanks to CustomRPC's devs for this method. Literal lifesaver */
async function getApplicationAsset(key: string): Promise<string> {
    if (/https?:\/\/(cdn|media)\.discordapp\.(com|net)\/attachments\//.test(key)) return "mp:" + key.replace(/https?:\/\/(cdn|media)\.discordapp\.(com|net)\//, "");
    return (await ApplicationAssetUtils.fetchAssetIds(getAppID(), [key]))[0];
}

interface ActivityAssets {
    large_image?: string;
    large_text?: string;
    small_image?: string;
    small_text?: string;
}

interface Activity {
    state?: string;
    details?: string;
    timestamps?: {
        start?: number;
        end?: number;
    };
    assets?: ActivityAssets;
    buttons?: Array<string>;
    name: string;
    application_id: string;
    metadata?: {
        button_urls?: Array<string>;
    };
    type: ActivityType;
    url?: string;
    flags: number;
}

const enum ActivityType {
    PLAYING = 0,
    STREAMING = 1,
    LISTENING = 2,
    WATCHING = 3,
    COMPETING = 5
}

function getAppID() {
    const { customAppId } = settings.store;
    return (!isCustomAppDisabled() && customAppId != null) ? customAppId : "1250864146669502506";
}

function isCustomAppDisabled() {
    return !settings.store.useCustomApp;
}

async function createActivity(mediaSession: any) {
    const { activityType, shareAtCurrentTimestamp } = settings.store;
    const applicationId = getAppID();
    if (!mediaSession) return;

    const artwork_large = await getApplicationAsset(mediaSession.artwork || "ytm_logo");
    const artwork_small = await getApplicationAsset("ytm_logo");
    const [currentSongTime, startTime, endTime] = songTimestamps(mediaSession.time);
    const activity: Activity = {
        application_id: applicationId,
        name: "YouTube Music",
        type: activityType,
        details: mediaSession.title || "Unknown Title",
        state: mediaSession.artist || "Unknown Artist",
        assets: {
            large_image: artwork_large,
            large_text: mediaSession.album || "Unknown Album",
            small_image: artwork_small,
            small_text: "YouTube Music"
        },
        buttons: ["Listen on YouTube Music"],
        metadata: {
            button_urls: [mediaSession.url + (shareAtCurrentTimestamp ? `&t=${currentSongTime}` : "")]
        },
        timestamps: {
            start: startTime,
            end: endTime
        },
        flags: 1 << 0
    };

    return activity;
}

function songTimestamps(time: string): [number, number, number] {
    const [current, end] = time.split(" / ");
    const [currentMinutes, currentSeconds] = current.split(":").map(Number);
    const [endMinutes, endSeconds] = end.split(":").map(Number);

    const currentSongTime = currentMinutes * 60 + currentSeconds;
    const startTime = Date.now() - currentSongTime * 1000;
    const endTime = startTime + (endMinutes * 60 + endSeconds) * 1000;

    return [currentSongTime, startTime, endTime];
}

async function updateActivity(mediaSession: any) {
    if (!mediaSession) return;

    if (mediaSession.playbackState !== "playing") {
        dispatchActivityUpdate(null);
        return;
    }

    const activity = await createActivity(mediaSession);
    // logger.log("Updating Activity:", activity);
    dispatchActivityUpdate(activity);
}

function dispatchActivityUpdate(activity: Activity | null = null) {
    FluxDispatcher.dispatch({
        type: "LOCAL_ACTIVITY_UPDATE",
        activity: activity,
        socketId: "YoutubeMusicRichPresence",
    });
}

const settings = definePluginSettings({
    useCustomApp: {
        type: OptionType.BOOLEAN,
        description: "Use a custom Discord application ID instead of the default one",
        default: false
    },
    customAppId: {
        type: OptionType.STRING,
        description: "Custom Discord application ID",
        default: "",
        disabled: isCustomAppDisabled,
        isValid: (value: string) => {
            if (!value && !isCustomAppDisabled()) return "Application ID is required.";
            if (!/^\d+$/.test(value)) return "Application ID must be a number.";
            return true;
        },
        restartNeeded: true,
    },
    updateTimer: {
        type: OptionType.SLIDER,
        description: "The duration between activity updates",
        markers: [1, 2, 3, 4, 5, 10, 15],
        default: 5,
        restartNeeded: true,
    },
    activityType: {
        type: OptionType.SELECT,
        description: "Activity type to display",
        options: [
            { label: "Listening", value: ActivityType.LISTENING, default: true },
            { label: "Playing", value: ActivityType.PLAYING },
            { label: "Watching", value: ActivityType.WATCHING },
            { label: "Streaming", value: ActivityType.STREAMING }
        ],
        restartNeeded: true,
    },
    shareAtCurrentTimestamp: {
        type: OptionType.BOOLEAN,
        description: "When enabled, whenever users click on the 'Listen on YouTube Music' button, the song will start at the current timestamp",
        default: false,
        restartNeeded: true,
    }
});

export default definePlugin({
    name: "YoutubeMusicRichPresence",
    description: "Adds rich presence support for YouTube Music",
    authors: [Devs.teop],
    dependencies: ["UserSettingsAPI"],

    async start() {
        await this.enableRichPresence();
    },
    stop() {
        this.disableRichPresence();
    },
    async enableRichPresence() {
        await this.updatePresence();
        this.presenceUpdatesIntervalId = setInterval(async () => { await this.updatePresence(); }, settings.store.updateTimer * 1000);
    },
    disableRichPresence() {
        clearInterval(this.presenceUpdatesIntervalId);
        dispatchActivityUpdate(null);
        this.closeWebSocket();
    },
    async updatePresence() {
        const webSocketDebuggerUrl = await Native.getWebSocketDebuggerUrl();
        if (!webSocketDebuggerUrl || webSocketDebuggerUrl === "") {
            logger.error("Failed to get WebSocket URL");
            return;
        }
        if (!this.webSocketDebuggerUrl || this.webSocketDebuggerUrl !== webSocketDebuggerUrl) {
            this.webSocketDebuggerUrl = webSocketDebuggerUrl;
            await this.initWebSocket();
        } else {
            this.requestMediaSessionUpdate();
        }
    },
    async initWebSocket() {
        try {
            this.ws = new WebSocket(this.webSocketDebuggerUrl);
            this.ws.onopen = () => {
                logger.log("Connected to Chrome DevTools");
                this.requestMediaSessionUpdate();
            };

            this.ws.onmessage = async (ev: { data: string; }) => {
                const response = JSON.parse(ev.data);
                if (response.id === 1 && response.result?.result?.value) {
                    const mediaSession = response.result.result.value;
                    await updateActivity(mediaSession);
                }
            };

            this.ws.onerror = (error: { target: any; }) => {
                logger.error("WebSocket Error:", error.target);
            };

        } catch (err) {
            logger.error(err);
        }
    },
    requestMediaSessionUpdate() {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        this.ws.send(JSON.stringify({
            id: 1,
            method: "Runtime.evaluate",
            params: {
                expression: `
      (() => {
            return {
                    "playbackState"   : navigator.mediaSession.playbackState,
                    "title"     : navigator.mediaSession.metadata.title,
                    "artist"    : navigator.mediaSession.metadata.artist,
                    "album"     : navigator.mediaSession.metadata.album,
                    "artwork"   : navigator.mediaSession.metadata.artwork[0].src,
                    "time"      : document.querySelector('#left-controls > span').textContent.trim(),
                    "url"       : window.location.href,
                }
      })();
    `,
                returnByValue: true
            }
        }));
    },
    closeWebSocket() {
        if (this.ws) {
            this.ws.close();
        }
    },
    settings,
    settingsAboutComponent: () => {
        const gameActivityEnabledSetting = getUserSettingLazy<boolean>("status", "showCurrentGame")!;
        return (
            <>
                <div
                    className={classes(Margins.top16, Margins.bottom16)}
                    style={{ padding: "1em" }}
                >
                    <ErrorCard>
                        <Forms.FormTitle>Warning</Forms.FormTitle>
                        <Forms.FormText>
                            Enabling remote debugging on your browser can expose your browser to potential security risks. In this case,
                            by setting the <code>--remote-allow-origins</code> flag to <code>https://discord.com</code>,
                            you are allowing Discord to connect to your browser. Please try to understand and be aware of the risks before proceeding.
                        </Forms.FormText>

                    </ErrorCard>
                    <Forms.FormTitle>How to Enable the Plugin</Forms.FormTitle>
                    <Forms.FormText>
                        (This plugin only works on Chromium-based browsers)
                        To enable this plugin, please add the following flags to your Chromium-based browser:
                    </Forms.FormText>
                    <CodeBlock content="--remote-debugging-port=9222 --remote-allow-origins=https://discord.com" lang="bash" />
                    <Forms.FormText>
                        You do so by right-clicking your browser shortcut, selecting "Properties", and adding the flags to the "Target" field, right after the path to your browser executable.
                        Click "Apply" and "OK" to save the changes.
                    </Forms.FormText>
                    <Forms.FormText>Here are some images for context:</Forms.FormText>

                    <div className={Margins.top16}>
                        <img src="https://teop.me/resources/discord/shortcut-props.png" alt="How to set flags" style={{ width: "200", height: "200", marginBottom: "1em" }} />
                        <img src="https://teop.me/resources/discord/first-flag.png" alt="First flag" style={{ width: "100", height: "100", marginBottom: "1em" }} />
                        <img src="https://teop.me/resources/discord/second-flag.png" alt="Second flag" style={{ width: "150", height: "150", marginBottom: "1em" }} />
                    </div>
                </div>


                {!gameActivityEnabledSetting.useSetting() && (
                    <ErrorCard
                        className={classes(Margins.top16, Margins.bottom16)}
                        style={{ padding: "1em" }}
                    >
                        <Forms.FormTitle>WARNING</Forms.FormTitle>
                        <Forms.FormText>Game Activity Not Enabled</Forms.FormText>

                        <Button
                            color={Button.Colors.TRANSPARENT}
                            className={Margins.top16}
                            onClick={() => gameActivityEnabledSetting.updateSetting(true)}
                        >
                            Enable Game Activity
                        </Button>
                    </ErrorCard>
                )}
            </>
        );
    }
});
