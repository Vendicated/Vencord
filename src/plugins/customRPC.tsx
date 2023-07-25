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

const strOpt = (description: string, disabled: () => boolean = () => false) => ({
    type: OptionType.STRING,
    description,
    disabled,
    onChange: setRpc,
    restartNeeded: true
}) as const;

const numOpt = (description: string, disabled: () => boolean = () => false) => ({
    type: OptionType.NUMBER,
    description,
    disabled,
    onChange: setRpc,
    restartNeeded: true
}) as const;

const choice = (label: string, value: any, _default?: boolean) => ({
    label,
    value,
    default: _default
}) as const;

const choiceOpt = <T,>(description: string, options: T) => ({
    type: OptionType.SELECT,
    description,
    onChange: setRpc,
    restartNeeded: true,
    options
}) as const;


const settings = definePluginSettings({
    appID: strOpt("Application ID"),
    appName: strOpt("Application name"),
    details: strOpt("Details (line 1)"),
    state: strOpt("State (line 2)"),
    type: choiceOpt("Activity type", [
        choice("Playing", ActivityType.PLAYING, true),
        choice("Streaming", ActivityType.STREAMING),
        choice("Listening", ActivityType.LISTENING),
        choice("Watching", ActivityType.WATCHING),
        choice("Competing", ActivityType.COMPETING)
    ]),
    streamLink: strOpt("Twitch.tv or Youtube.com link (only for Streaming activity type)", isStreamLinkDisabled),
    timestampMode: choiceOpt("Timestamp mode", [
        choice("Off", "off", true),
        choice("Since discord open", "now"),
        choice("Same as your current time", "time"),
        choice("Custom", "custom")
    ]),
    startTime: numOpt("Start timestamp (only for custom timestamp mode)", isTimestampDisabled),
    endTime: numOpt("End timestamp (only for custom timestamp mode)", isTimestampDisabled),
    imageBig: strOpt("Big image key"),
    imageBigTooltip: strOpt("Big image tooltip"),
    imageSmall: strOpt("Small image key"),
    imageSmallTooltip: strOpt("Small image tooltip"),
    buttonOneText: strOpt("Button 1 text"),
    buttonOneURL: strOpt("Button 1 URL"),
    buttonTwoText: strOpt("Button 2 text"),
    buttonTwoURL: strOpt("Button 2 URL")
});

function isStreamLinkDisabled(): boolean {
    return settings.store.type !== ActivityType.STREAMING;
}

function isTimestampDisabled(): boolean {
    return settings.store.timestampMode !== "custom";
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
        name: appName.slice(0, 128),
        state: state?.slice(0, 128),
        details: details?.slice(0, 128),
        type,
        flags: 1 << 0,
    };

    if (type === ActivityType.STREAMING) {
        if (streamLink && /(https?:\/\/(www\.)?(twitch\.tv|youtube\.com)\/\w+)/.test(streamLink)) {
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
            buttonOneText?.slice(0, 31),
            buttonTwoText?.slice(0, 31)
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
            large_text: imageBigTooltip?.slice(0, 128) || undefined
        };
    }

    if (imageSmall) {
        activity.assets = {
            ...activity.assets,
            small_image: await getApplicationAsset(imageSmall),
            small_text: imageSmallTooltip?.slice(0, 128) || undefined
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
