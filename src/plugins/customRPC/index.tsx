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
import { Link } from "@components/Link";
import { Devs } from "@utils/constants";
import { isTruthy } from "@utils/guards";
import { Logger } from "@utils/Logger";
import { useAwaiter } from "@utils/react";
import definePlugin, { OptionType } from "@utils/types";
import { chooseFile, saveFile } from "@utils/web";
import { findByPropsLazy, findComponentByCodeLazy } from "@webpack";
import { ApplicationAssetUtils, Button, Flex, FluxDispatcher, Forms, GuildStore, React, SelectedChannelStore, SelectedGuildStore, UserStore } from "@webpack/common";

import Presets, { PresetsType } from "./presets";

const ActivityComponent = findComponentByCodeLazy("onOpenGameProfile");
const ActivityClassName = findByPropsLazy("activity", "buttonColor");
const Colors = findByPropsLazy("profileColors");

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

export interface Activity {
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
    preset: {
        type: OptionType.SELECT,
        description: "Some default presets by Vencord",
        onChange: onChange,
        options: [
            {
                label: "None",
                value: 0,
                default: true
            },
            {
                label: "Vencord",
                value: 1,
            },
            {
                label: "VSCode",
                value: 2
            },
            {
                label: "Anime",
                value: 3
            }
        ]
    },
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

function loadActivity(preset: PresetsType) {
    settings.store.appID = "1";
    settings.store.appName = preset.appName;
    settings.store.details = preset.details;
    settings.store.state = preset.state;
    settings.store.type = preset.type;
    settings.store.imageBig = preset.imageBig;
    settings.store.imageBigTooltip = preset.imageBigTooltip;
    settings.store.imageSmall = preset.imageSmall;
    settings.store.imageSmallTooltip = preset.imageSmallTooltip;
    settings.store.buttonOneText = preset.buttonOneText;
    settings.store.buttonOneURL = preset.buttonOneURL;
    settings.store.buttonTwoText = preset.buttonTwoText;
    settings.store.buttonTwoURL = preset.buttonTwoURL;
    return true;
}

function loadPreset() {
    if (!settings.store.preset) return;
    if (settings.store.preset === 1) {
    }
    if (settings.store.preset === 2) {
        loadActivity(Presets.VSCode);
    }
    if (settings.store.preset === 3) {
        loadActivity(Presets.Anime);
    }
}

function onChange() {
    loadPreset();
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


async function exportBackup() {
    const filename = "rpc-backup.json";
    const backup = JSON.stringify({
        appId: settings.store.appID,
        appName: settings.store.appName,
        details: settings.store.details,
        state: settings.store.state,
        type: settings.store.type,
        streamLink: settings.store.streamLink,
        timestampMode: settings.store.timestampMode,
        startTime: settings.store.startTime,
        endTime: settings.store.endTime,
        imageBig: settings.store.imageBig,
        imageBigTooltip: settings.store.imageBigTooltip,
        imageSmall: settings.store.imageSmall,
        imageSmallTooltip: settings.store.imageSmallTooltip,
        buttonOneText: settings.store.buttonOneText,
        buttonOneURL: settings.store.buttonOneURL,
        buttonTwoText: settings.store.buttonTwoText,
        buttonTwoURL: settings.store.buttonTwoURL,
    });
    const data = new TextEncoder().encode(backup);

    if (IS_DISCORD_DESKTOP) {
        DiscordNative.fileManager.saveWithDialog(data, filename);
    } else {
        saveFile(new File([data], filename, { type: "application/json" }));
    }
}

async function loadBackup(data: string) {
    const backup = await JSON.parse(data);
    if (backup) {
        settings.store.appID = backup.appID;
        settings.store.appName = backup.appName;
        settings.store.details = backup.details;
        settings.store.state = backup.state;
        settings.store.type = backup.type;
        settings.store.streamLink = backup.streamLink;
        settings.store.timestampMode = backup.timestampMode;
        settings.store.startTime = backup.startTime;
        settings.store.endTime = backup.endTime;
        settings.store.imageBig = backup.imageBig;
        settings.store.imageBigTooltip = backup.imageBigTooltip;
        settings.store.imageSmall = backup.imageSmall;
        settings.store.imageSmallTooltip = backup.imageSmallTooltip;
        settings.store.buttonOneText = backup.buttonOneText;
        settings.store.buttonOneURL = backup.buttonOneURL;
        settings.store.buttonTwoText = backup.buttonTwoText;
        settings.store.buttonTwoURL = backup.buttonTwoURL;
        return true;
    }
}


async function importBackup(): Promise<void> {
    if (IS_DISCORD_DESKTOP) {
        const [file] = await DiscordNative.fileManager.openFiles({
            filters: [
                { name: "RPC Backup", extensions: ["json"] },
                { name: "all", extensions: ["*"] }
            ]
        });
        if (file) {
            try {
                await loadBackup(new TextDecoder().decode(file.data));
            } catch (err) {
                new Logger("SettingsSync").error(err);
            }
        }
    } else {
        const file = await chooseFile("application/json");
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async () => {
            try {
                await loadBackup(reader.result as string);
            } catch (err) {
                new Logger("SettingsSync").error(err);
            }
        };
        reader.readAsText(file);
    }
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
    authors: [Devs.captain, Devs.AutumnVN, Devs.Mannu],
    start: setRpc,
    stop: () => setRpc(true),
    settings,

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
                <Forms.FormText>
                    Click on the save & close after importing backup in order to see new changes. Save before exporting the backup.
                </Forms.FormText>
                <br />
                <Flex>
                    <Button
                        onClick={() => importBackup()}
                        size={Button.Sizes.TINY}
                    >
                        Import Backup
                    </Button>
                </Flex>
                <br />
                <Flex>
                    <Button
                        onClick={exportBackup}
                        size={Button.Sizes.TINY}
                    >
                        Export Backup
                    </Button>
                </Flex>
                <br />
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

export { ActivityType, TimestampMode };
