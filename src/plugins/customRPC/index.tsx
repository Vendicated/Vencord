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

import { definePluginSettings, Settings } from "@api/Settings";
import { disableStyle, enableStyle } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { Link } from "@components/Link";
import { Devs } from "@utils/constants";
import { isTruthy } from "@utils/guards";
import { useAwaiter } from "@utils/react";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy, findComponentByCodeLazy } from "@webpack";
import { ApplicationAssetUtils, FluxDispatcher, Forms, GuildStore, React, SelectedChannelStore, SelectedGuildStore, UserStore } from "@webpack/common";

import style from "./style.css?managed";

const Button = findComponentByCodeLazy("Button.Sizes.NONE,disabled:");

const ActivityComponent = findComponentByCodeLazy("onOpenGameProfile");
const ActivityClassName = findByPropsLazy("activity", "buttonColor");
const Colors = findByPropsLazy("profileColors");
let activeRPC = false;

async function getApplicationAsset(key: string): Promise<string> {
    if (/https?:\/\/(cdn|media)\.discordapp\.(com|net)\/attachments\//.test(key)) return "mp:" + key.replace(/https?:\/\/(cdn|media)\.discordapp\.(com|net)\//, "");
    return (await ApplicationAssetUtils.fetchAssetIds(settings.store.appID!, [key]))[0];
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

const enum TimestampMode {
    NONE,
    NOW,
    TIME,
    CUSTOM,
}

const settings = definePluginSettings({
    appID: {
        type: OptionType.STRING,
        description: "Application ID (required)",
        onChange: onChange,
        isValid: (value: string) => {
            if (!value) return "Application ID is required.";
            if (value && !/^\d+$/.test(value)) return "Application ID must be a number.";
            return true;
        }
    },
    appName: {
        type: OptionType.STRING,
        description: "Application name (required)",
        onChange: onChange,
        isValid: (value: string) => {
            if (!value) return "Application name is required.";
            if (value.length > 128) return "Application name must be not longer than 128 characters.";
            return true;
        }
    },
    details: {
        type: OptionType.STRING,
        description: "Details (line 1)",
        onChange: onChange,
        isValid: (value: string) => {
            if (value && value.length > 128) return "Details (line 1) must be not longer than 128 characters.";
            return true;
        }
    },
    state: {
        type: OptionType.STRING,
        description: "State (line 2)",
        onChange: onChange,
        isValid: (value: string) => {
            if (value && value.length > 128) return "State (line 2) must be not longer than 128 characters.";
            return true;
        }
    },
    type: {
        type: OptionType.SELECT,
        description: "Activity type",
        onChange: onChange,
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
        onChange: onChange,
        disabled: isStreamLinkDisabled,
        isValid: isStreamLinkValid
    },
    timestampMode: {
        type: OptionType.SELECT,
        description: "Timestamp mode",
        onChange: onChange,
        options: [
            {
                label: "None",
                value: TimestampMode.NONE,
                default: true
            },
            {
                label: "Since discord open",
                value: TimestampMode.NOW
            },
            {
                label: "Same as your current time",
                value: TimestampMode.TIME
            },
            {
                label: "Custom",
                value: TimestampMode.CUSTOM
            }
        ]
    },
    startTime: {
        type: OptionType.NUMBER,
        description: "Start timestamp in milisecond (only for custom timestamp mode)",
        onChange: onChange,
        disabled: isTimestampDisabled,
        isValid: (value: number) => {
            if (value && value < 0) return "Start timestamp must be greater than 0.";
            return true;
        }
    },
    endTime: {
        type: OptionType.NUMBER,
        description: "End timestamp in milisecond (only for custom timestamp mode)",
        onChange: onChange,
        disabled: isTimestampDisabled,
        isValid: (value: number) => {
            if (value && value < 0) return "End timestamp must be greater than 0.";
            return true;
        }
    },
    imageBig: {
        type: OptionType.STRING,
        description: "Big image key/link",
        onChange: onChange,
        isValid: isImageKeyValid
    },
    imageBigTooltip: {
        type: OptionType.STRING,
        description: "Big image tooltip",
        onChange: onChange,
        isValid: (value: string) => {
            if (value && value.length > 128) return "Big image tooltip must be not longer than 128 characters.";
            return true;
        }
    },
    imageSmall: {
        type: OptionType.STRING,
        description: "Small image key/link",
        onChange: onChange,
        isValid: isImageKeyValid
    },
    imageSmallTooltip: {
        type: OptionType.STRING,
        description: "Small image tooltip",
        onChange: onChange,
        isValid: (value: string) => {
            if (value && value.length > 128) return "Small image tooltip must be not longer than 128 characters.";
            return true;
        }
    },
    buttonOneText: {
        type: OptionType.STRING,
        description: "Button 1 text",
        onChange: onChange,
        isValid: (value: string) => {
            if (value && value.length > 31) return "Button 1 text must be not longer than 31 characters.";
            return true;
        }
    },
    buttonOneURL: {
        type: OptionType.STRING,
        description: "Button 1 URL",
        onChange: onChange
    },
    buttonTwoText: {
        type: OptionType.STRING,
        description: "Button 2 text",
        onChange: onChange,
        isValid: (value: string) => {
            if (value && value.length > 31) return "Button 2 text must be not longer than 31 characters.";
            return true;
        }
    },
    buttonTwoURL: {
        type: OptionType.STRING,
        description: "Button 2 URL",
        onChange: onChange
    }
});

function onChange() {
    setRpc(true);
    if (Settings.plugins.CustomRPC.enabled) setRpc();
}

function isStreamLinkDisabled() {
    return settings.store.type !== ActivityType.STREAMING;
}

function isStreamLinkValid(value: string) {
    if (!isStreamLinkDisabled() && !/https?:\/\/(www\.)?(twitch\.tv|youtube\.com)\/\w+/.test(value)) return "Streaming link must be a valid URL.";
    return true;
}

function isTimestampDisabled() {
    return settings.store.timestampMode !== TimestampMode.CUSTOM;
}

function isImageKeyValid(value: string) {
    if (/https?:\/\/(?!i\.)?imgur\.com\//.test(value)) return "Imgur link must be a direct link to the image. (e.g. https://i.imgur.com/...)";
    if (/https?:\/\/(?!media\.)?tenor\.com\//.test(value)) return "Tenor link must be a direct link to the image. (e.g. https://media.tenor.com/...)";
    return true;
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

    if (type === ActivityType.STREAMING) activity.url = streamLink;

    switch (settings.store.timestampMode) {
        case TimestampMode.NOW:
            activity.timestamps = {
                start: Date.now()
            };
            break;
        case TimestampMode.TIME:
            activity.timestamps = {
                start: Date.now() - (new Date().getHours() * 3600 + new Date().getMinutes() * 60 + new Date().getSeconds()) * 1000
            };
            break;
        case TimestampMode.CUSTOM:
            if (startTime || endTime) {
                activity.timestamps = {};
                if (startTime) activity.timestamps.start = startTime;
                if (endTime) activity.timestamps.end = endTime;
            }
            break;
        case TimestampMode.NONE:
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

function makeIcon(showCurrentGame?: boolean) {
    const redLinePath = "M23 2.27 21.73 1 1 21.73 2.27 23 23 2.27Z";

    const maskBlackPath = "M23.27 4.54 19.46.73 .73 19.46 4.54 23.27 23.27 4.54Z";

    return function () {
        return (
            <svg width="20" height="20" viewBox="0 0 24 24">
                <path
                    fill={!showCurrentGame ? "var(--status-danger)" : "currentColor"}
                    mask={!showCurrentGame ? "url(#gameActivityMask)" : void 0}
                    d="M3.06 20.4q-1.53 0-2.37-1.065T.06 16.74l1.26-9q.27-1.8 1.605-2.97T6.06 3.6h11.88q1.8 0 3.135 1.17t1.605 2.97l1.26 9q.21 1.53-.63 2.595T20.94 20.4q-.63 0-1.17-.225T18.78 19.5l-2.7-2.7H7.92l-2.7 2.7q-.45.45-.99.675t-1.17.225Zm14.94-7.2q.51 0 .855-.345T19.2 12q0-.51-.345-.855T18 10.8q-.51 0-.855.345T16.8 12q0 .51.345 .855T18 13.2Zm-2.4-3.6q.51 0 .855-.345T16.8 8.4q0-.51-.345-.855T15.6 7.2q-.51 0-.855.345T14.4 8.4q0 .51.345 .855T15.6 9.6ZM6.9 13.2h1.8v-2.1h2.1v-1.8h-2.1v-2.1h-1.8v2.1h-2.1v1.8h2.1v2.1Z"
                />
                {!showCurrentGame && <>
                    <path fill="var(--status-danger)" d={redLinePath} />
                    <mask id="gameActivityMask">
                        <rect fill="white" x="0" y="0" width="24" height="24" />
                        <path fill="black" d={maskBlackPath} />
                    </mask>
                </>}
            </svg>
        );
    };
}

async function setRpc(disable?: boolean) {
    const activity: Activity | undefined = await createActivity();

    FluxDispatcher.dispatch({
        type: "LOCAL_ACTIVITY_UPDATE",
        activity: disable ? activity : null,
        socketId: "CustomRPC",
    });
}

function toggleRPC() {
    console.log(activeRPC);
    setRpc(!activeRPC);
    activeRPC = !activeRPC;
}

function RPCToggleButton() {
    return (
        <Button
            tooltipText={activeRPC ? "Disable CustomRPC" : "Enable CustomRPC"}
            role="switch"
            icon={makeIcon(activeRPC)}
            aria-checked={!activeRPC}
            onClick={() => toggleRPC()}
        />
    );
}

export default definePlugin({
    name: "CustomRPC",
    description: "Allows you to set a custom rich presence.",
    authors: [Devs.captain, Devs.AutumnVN, {
        id: 515163980965085184n,
        name: "SzyZu",
    }],
    start() {
        enableStyle(style);
    },
    stop() {
        disableStyle(style);
    },
    settings,
    patches: [
        {
            find: ".Messages.ACCOUNT_SPEAKING_WHILE_MUTED",
            replacement: {
                match: /this\.renderNameZone\(\).+?children:\[/,
                replace: "$&$self.RPCToggleButton(),"
            }
        }
    ],

    RPCToggleButton: ErrorBoundary.wrap(RPCToggleButton, { noop: true }),

    settingsAboutComponent: () => {
        const activity = useAwaiter(createActivity);
        return (
            <>
                <Forms.FormText>
                    Go to <Link href="https://discord.com/developers/applications">Discord Developer Portal</Link> to create an application and
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
