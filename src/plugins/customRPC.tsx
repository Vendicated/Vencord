/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { definePluginSettings } from "@api/Settings";
import { Link } from "@components/Link";
import { Devs } from "@utils/constants";
import { isTruthy } from "@utils/guards";
import { useAwaiter } from "@utils/react";
import definePlugin, { OptionType } from "@utils/types";
import { filters, findByCodeLazy, findByPropsLazy, mapMangledModuleLazy } from "@webpack";
import { FluxDispatcher, Forms, GuildStore, React, SelectedChannelStore, SelectedGuildStore, UserStore } from "@webpack/common";

const ActivityComponent = findByCodeLazy("onOpenGameProfile");
const ActivityClassName = findByPropsLazy("activity", "buttonColor");
const Colors = findByPropsLazy("profileColors");

const assetManager = mapMangledModuleLazy(
    "getAssetImage: size must === [number, number] for Twitch",
    {
        getAsset: filters.byCode("apply("),
    }
);

async function getApplicationAsset(key: string): Promise<string> {
    return (await assetManager.getAsset(settings.store.appID, [key, undefined]))[0];
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

const settings = definePluginSettings({
    appID: {
        type: OptionType.STRING,
        description: "Application ID (required)",
        restartNeeded: true,
        onChange: setRpc,
        isValid: (value: string) => {
            if (!value) return "Application ID is required.";
            if (value && !/^\d+$/.test(value)) return "Application ID must be a number.";
            return true;
        }
    },
    appName: {
        type: OptionType.STRING,
        description: "Application name (required)",
        restartNeeded: true,
        onChange: setRpc,
        isValid: (value: string) => {
            if (!value) return "Application name is required.";
            if (value.length > 128) return "Application name must be less than 128 characters.";
            return true;
        }
    },
    details: {
        type: OptionType.STRING,
        description: "Details (line 1)",
        restartNeeded: true,
        onChange: setRpc,
        isValid: (value: string) => {
            if (value && value.length > 128) return "Details (line 1) must be less than 128 characters.";
            return true;
        }
    },
    state: {
        type: OptionType.STRING,
        description: "State (line 2)",
        restartNeeded: true,
        onChange: setRpc,
        isValid: (value: string) => {
            if (value && value.length > 128) return "State (line 2) must be less than 128 characters.";
            return true;
        }
    },
    type: {
        type: OptionType.SELECT,
        description: "Activity type",
        restartNeeded: true,
        onChange: setRpc,
        options: [
            {
                label: "Playing",
                value: ActivityType.PLAYING,
                default: true
            },
            {
                label: "Streaming",
                value: ActivityType.STREAMING
            },
            {
                label: "Listening",
                value: ActivityType.LISTENING
            },
            {
                label: "Watching",
                value: ActivityType.WATCHING
            },
            {
                label: "Competing",
                value: ActivityType.COMPETING
            }
        ]
    },
    streamLink: {
        type: OptionType.STRING,
        description: "Twitch.tv or Youtube.com link (only for Streaming activity type)",
        restartNeeded: true,
        onChange: setRpc,
        isDisabled: isStreamLinkDisabled,
        isValid: isStreamLinkValid
    },
    timestampMode: {
        type: OptionType.SELECT,
        description: "Timestamp mode",
        restartNeeded: true,
        onChange: setRpc,
        options: [
            {
                label: "Off",
                value: "off",
                default: true
            },
            {
                label: "Since discord open",
                value: "now"
            },
            {
                label: "Same as your current time",
                value: "time"
            },
            {
                label: "Custom",
                value: "custom"
            }
        ]
    },
    startTime: {
        type: OptionType.NUMBER,
        description: "Start timestamp (only for custom timestamp mode)",
        restartNeeded: true,
        onChange: setRpc,
        isDisabled: isTimestampDisabled,
        isValid: (value: number) => {
            if (value && value < 0) return "Start timestamp must be greater than 0.";
            return true;
        }
    },
    endTime: {
        type: OptionType.NUMBER,
        description: "End timestamp (only for custom timestamp mode)",
        restartNeeded: true,
        onChange: setRpc,
        isDisabled: isTimestampDisabled,
        isValid: (value: number) => {
            if (value && value < 0) return "End timestamp must be greater than 0.";
            return true;
        }
    },
    imageBig: {
        type: OptionType.STRING,
        description: "Big image key",
        restartNeeded: true,
        onChange: setRpc,
        isValid: isImageKeyValid
    },
    imageBigTooltip: {
        type: OptionType.STRING,
        description: "Big image tooltip",
        restartNeeded: true,
        onChange: setRpc,
        isValid: (value: string) => {
            if (value && value.length > 128) return "Big image tooltip must be less than 128 characters.";
            return true;
        }
    },
    imageSmall: {
        type: OptionType.STRING,
        description: "Small image key",
        restartNeeded: true,
        onChange: setRpc,
        isValid: isImageKeyValid
    },
    imageSmallTooltip: {
        type: OptionType.STRING,
        description: "Small image tooltip",
        restartNeeded: true,
        onChange: setRpc,
        isValid: (value: string) => {
            if (value && value.length > 128) return "Small image tooltip must be less than 128 characters.";
            return true;
        }
    },
    buttonOneText: {
        type: OptionType.STRING,
        description: "Button 1 text",
        restartNeeded: true,
        onChange: setRpc,
        isValid: (value: string) => {
            if (value && value.length > 31) return "Button 1 text must be less than 31 characters.";
            return true;
        }
    },
    buttonOneURL: {
        type: OptionType.STRING,
        description: "Button 1 URL",
        restartNeeded: true,
        onChange: setRpc
    },
    buttonTwoText: {
        type: OptionType.STRING,
        description: "Button 2 text",
        restartNeeded: true,
        onChange: setRpc,
        isValid: (value: string) => {
            if (value && value.length > 31) return "Button 2 text must be less than 31 characters.";
            return true;
        }
    },
    buttonTwoURL: {
        type: OptionType.STRING,
        description: "Button 2 URL",
        restartNeeded: true,
        onChange: setRpc
    }
});

function isStreamLinkDisabled(): boolean {
    return settings.store.type !== ActivityType.STREAMING;
}

function isStreamLinkValid(): boolean | string {
    if (settings.store.type === ActivityType.STREAMING && settings.store.streamLink && !/(https?:\/\/(www\.)?(twitch\.tv|youtube\.com)\/\w+)/.test(settings.store.streamLink)) return "Streaming link must be a valid URL.";
    return true;
}

function isTimestampDisabled(): boolean {
    return settings.store.timestampMode !== "custom";
}

function isImageKeyValid(value: string) {
    if (!/https?:\/\//.test(value)) return true;
    if (/https?:\/\/(cdn|media)\.discordapp\.(com|net)\/attachments\//.test(value)) return "Discord CDN won't work, please use Imgur instead.";
    if (/https?:\/\/(?!i\.)?imgur\.com\//.test(value)) return "Imgur link must be a direct link to the image. (e.g. https://i.imgur.com/...)";
    if (/https?:\/\/(?!media\.)?tenor\.com\//.test(value)) return "Tenor link must be a direct link to the image. (e.g. https://media.tenor.com/...)";
}

async function createActivity(): Promise<Activity | undefined> {
    const {
        appID,
        appName,
        details,
        state,
        type,
        streamLink,
        startTime,
        endTime,
        imageBig,
        imageBigTooltip,
        imageSmall,
        imageSmallTooltip,
        buttonOneText,
        buttonOneURL,
        buttonTwoText,
        buttonTwoURL
    } = settings.store;

    if (!appName) return;

    const activity: Activity = {
        application_id: appID || "0",
        name: appName,
        state,
        details,
        type,
        flags: 1 << 0,
    };

    if (type === ActivityType.STREAMING) {
        if (streamLink && /https?:\/\/(www\.)?(twitch\.tv|youtube\.com)\/\w+/.test(streamLink)) {
            activity.url = streamLink;
        } else {
            activity.url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
        }
    }

    switch (settings.store.timestampMode) {
        case "now":
            activity.timestamps = {
                start: Math.floor(Date.now() / 1000)
            };
            break;
        case "time":
            activity.timestamps = {
                start: Math.floor(Date.now() / 1000) - (new Date().getHours() * 3600) - (new Date().getMinutes() * 60) - new Date().getSeconds()
            };
            break;
        case "custom":
            if (startTime && startTime > 0) {
                activity.timestamps = {
                    start: startTime,
                };
                if (endTime && endTime >= startTime) {
                    activity.timestamps.end = endTime;
                }
            }
            break;
        case "off":
        default:
            break;
    }

    if (buttonOneText) {
        activity.buttons = [
            buttonOneText,
            buttonTwoText
        ].filter(isTruthy);

        activity.metadata = {
            button_urls: [
                buttonOneURL,
                buttonTwoURL
            ].filter(isTruthy)
        };
    }

    if (imageBig) {
        activity.assets = {
            large_image: await getApplicationAsset(imageBig),
            large_text: imageBigTooltip || undefined
        };
    }

    if (imageSmall) {
        activity.assets = {
            ...activity.assets,
            small_image: await getApplicationAsset(imageSmall),
            small_text: imageSmallTooltip || undefined
        };
    }


    for (const k in activity) {
        if (k === "type") continue;
        const v = activity[k];
        if (!v || v.length === 0)
            delete activity[k];
    }

    return activity;
}

async function setRpc(disable?: boolean) {
    const activity: Activity | undefined = await createActivity();

    FluxDispatcher.dispatch({
        type: "LOCAL_ACTIVITY_UPDATE",
        activity: !disable ? activity : null,
        socketId: "CustomRPC",
    });
}

export default definePlugin({
    name: "CustomRPC",
    description: "Allows you to set a custom rich presence.",
    authors: [Devs.captain, Devs.AutumnVN],
    start: setRpc,
    stop: () => setRpc(true),
    settings,

    settingsAboutComponent: () => {
        const activity = useAwaiter(createActivity);
        return (
            <>
                <Forms.FormText>
                    Go to <Link href="https://discord.com/developers/applications">Discord Deverloper Portal</Link> to create an application and
                    get the application ID.
                </Forms.FormText>
                <Forms.FormText>
                    Upload images in the Rich Presence tab to get the image keys.
                </Forms.FormText>
                <Forms.FormText>
                    If you want to use image link, download your image and reupload the image to <Link href="https://imgur.com">Imgur</Link> and get the image link by right-clicking the image and select "Copy image address".
                </Forms.FormText>
                <Forms.FormDivider />
                <div style={{ width: "284px" }} className={Colors.profileColors}>
                    {activity[0] && <ActivityComponent activity={activity[0]} className={ActivityClassName.activity} channelId={SelectedChannelStore.getChannelId()}
                        guild={GuildStore.getGuild(SelectedGuildStore.getLastSelectedGuildId())}
                        application={{ id: settings.store.appID }}
                        user={UserStore.getCurrentUser()} />}
                </div>
            </>
        );
    }
});
