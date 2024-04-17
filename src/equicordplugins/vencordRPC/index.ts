/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { isTruthy } from "@utils/guards";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy, findStoreLazy } from "@webpack";
import { ApplicationAssetUtils, ChannelStore, FluxDispatcher, GuildStore, PresenceStore, RelationshipStore, SelectedChannelStore, SelectedGuildStore, UserStore } from "@webpack/common";
import { FluxStore } from "@webpack/types";
import { Channel } from "discord-types/general";

const presenceStore = findByPropsLazy("getLocalPresence");
const GuildMemberCountStore = findStoreLazy("GuildMemberCountStore") as FluxStore & { getMemberCount(guildId: string): number | null; };
const ChannelMemberStore = findStoreLazy("ChannelMemberStore") as FluxStore & {
    getProps(guildId: string, channelId: string): { groups: { count: number; id: string; }[]; };
};
const VoiceStates = findByPropsLazy("getVoiceStatesForChannel");
const chino = "https://i.imgur.com/Dsa2rQy.png";
const shiggy = "https://i.imgur.com/MgUzhs0.gif";
const wysi = "https://i.imgur.com/uKtXde9.gif";

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
    userAvatarAsSmallImage: {
        type: OptionType.BOOLEAN,
        description: "Use your avatar as small image",
        onChange: onChange,
        default: false
    },
    exposeDmsUsername: {
        type: OptionType.BOOLEAN,
        description: "Expose current DMs username",
        onChange: onChange,
        default: false
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
        description: "Start timestamp (only for custom timestamp mode)",
        onChange: onChange,
        disabled: isTimestampDisabled,
        isValid: (value: number) => {
            if (value && value < 0) return "Start timestamp must be greater than 0.";
            return true;
        }
    },
    endTime: {
        type: OptionType.NUMBER,
        description: "End timestamp (only for custom timestamp mode)",
        onChange: onChange,
        disabled: isTimestampDisabled,
        isValid: (value: number) => {
            if (value && value < 0) return "End timestamp must be greater than 0.";
            return true;
        }
    }
});

function onChange() {
    setRpc(true);
    setRpc();
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

// //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function onlineFriendCount(): number {
    let onlineFriends = 0;
    const relationships = RelationshipStore.getRelationships();
    for (const id in relationships) {
        if (relationships[id] === 1 && PresenceStore.getStatus(id) !== "offline") onlineFriends++;
    }
    return onlineFriends;
}

function totalFriendCount(): number {
    return Object.values(RelationshipStore.getRelationships()).filter(r => r === 1).length;
}

function memberCount(): string {
    const channelId = SelectedChannelStore.getChannelId();
    const guildId = SelectedGuildStore.getGuildId();
    const { groups } = ChannelMemberStore.getProps(guildId, channelId);
    const total = GuildMemberCountStore.getMemberCount(guildId);

    if (total == null)
        return "";

    const online =
        (groups.length === 1 && groups[0].id === "unknown")
            ? 0
            : groups.reduce((count, curr) => count + (curr.id === "offline" ? 0 : curr.count), 0);

    return online === 0 ? `${total} members` : `${online} online / ${total} total`;
}

function getChannelIconURL(channel: Channel): string {
    if (channel.icon) return `https://cdn.discordapp.com/channel-icons/${channel.id}/${channel.icon}.webp?size=128`;
    return chino;
}

async function createActivity(): Promise<Activity | undefined> {

    const {
        appID,
        userAvatarAsSmallImage,
        exposeDmsUsername,
        streamLink,
        timestampMode,
        startTime,
        endTime,
    } = settings.store;

    let { type } = settings.store;

    let appName = "Vencord";
    let details = "";
    let state = "";
    let imageBig = "";
    const imageBigTooltip = undefined;
    let imageSmall = "";
    const imageSmallTooltip = undefined;
    let buttonOneText: string | undefined;
    let buttonOneURL: string | undefined;
    let buttonTwoText: string | undefined;
    let buttonTwoURL: string | undefined;


    const channelId = SelectedChannelStore.getChannelId();
    const guildId = SelectedGuildStore.getGuildId();
    const voiceId = SelectedChannelStore.getVoiceChannelId();
    const currentUser = UserStore.getCurrentUser();
    if (userAvatarAsSmallImage) imageSmall = currentUser.getAvatarURL(undefined, undefined, true) || chino;

    if (!channelId) {
        appName = "Friends List";
        details = `${onlineFriendCount()} online / ${totalFriendCount()} total`;
        state = `${GuildStore.getGuildCount()} servers`;
        imageBig = chino;
    } else {
        if (channelId === "@home" || channelId === "customize-community" || channelId === "channel-browser" || channelId === "onboarding") {
            appName = channelId === "@home" ? "Server Guide" : channelId === "customize-community" ? "Channels & Roles" : channelId === "channel-browser" ? "Browse Channels" : "Onboarding";
            const guild = GuildStore.getGuild(guildId);
            if (guild) {
                details = guild.name;
                state = memberCount();
                imageBig = guild.getIconURL(128, true) || chino;
                if (guild.vanityURLCode) {
                    buttonOneText = `Join ${guild.name.slice(0, 26)}`;
                    buttonOneURL = `https://discord.gg/${guild.vanityURLCode}`;
                }
            }
        } else {

            const channel = ChannelStore.getChannel(channelId);

            if (channel.isDM()) {
                const recipient = UserStore.getUser(channel.recipients[0]);
                appName = exposeDmsUsername ? `${recipient.username}'s DM` : "Direct Messages";
                details = `${onlineFriendCount()} online / ${totalFriendCount()} total`;
                state = `${GuildStore.getGuildCount()} servers`;
                imageBig = recipient.getAvatarURL(undefined, undefined, true) || chino;
            }

            if (channel.isGroupDM()) {
                appName = channel.name || "Group DM";
                details = `${channel.recipients.length + 1} members`;
                imageBig = getChannelIconURL(channel);
            }

            const guild = GuildStore.getGuild(guildId);
            if (guild) {
                appName = `#${channel.name}`;
                details = guild.name;
                state = memberCount();
                imageBig = guild.getIconURL(128, true) || chino;
                if (guild.vanityURLCode) {
                    buttonOneText = `Join ${guild.name.slice(0, 31 - 5)}`;
                    buttonOneURL = `https://discord.gg/${guild.vanityURLCode}`;
                }
            }
        }
    }

    if (voiceId) {
        const voiceChannel = ChannelStore.getChannel(voiceId);
        const voiceGuild = GuildStore.getGuild(voiceChannel.guild_id);
        const voiceMemberCount = Object.keys(VoiceStates.getVoiceStatesForChannel(voiceChannel.id)).length;
        buttonTwoText = `🔊 ${voiceGuild.name.slice(0, 31 - 6 - voiceMemberCount.toString().length)} [${voiceMemberCount}]`;
        buttonTwoURL = `https://discordapp.com/channels/${voiceGuild.id}/${voiceChannel.id}`;

        if (!buttonOneText) {
            buttonOneText = buttonTwoText;
            buttonOneURL = buttonTwoURL;
            buttonTwoText = undefined;
            buttonTwoURL = undefined;
        }
    }

    if ((new Date().getHours() === 7 || new Date().getHours() === 19) && new Date().getMinutes() === 27) {
        type = ActivityType.PLAYING;
        appName = "WHEN YOU SEE IT";
        imageBig = wysi;
        details = "7:27 👈";
        state = "";
    }

    // //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    const activity: Activity = {
        application_id: appID || "0",
        name: appName,
        state,
        details,
        type,
        flags: 1 << 0,
    };

    if (type === ActivityType.STREAMING) activity.url = streamLink;

    switch (timestampMode) {
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

let timeout: NodeJS.Timeout | null = null;

async function setRpc(disable?: boolean) {
    const activities: any = presenceStore.getActivities();
    const activity: Activity | undefined = !activities.length || (activities.length === 1 && activities[0].application_id === settings.store.appID) ? await createActivity() : undefined;

    FluxDispatcher.dispatch({
        type: "LOCAL_ACTIVITY_UPDATE",
        activity: !disable ? activity : null,
        socketId: "CustomRPC",
    });

    if (!disable) {
        timeout = setTimeout(() => setRpc(), 4000);
    } else if (timeout) {
        clearTimeout(timeout);
        timeout = null;
    }
}

export default definePlugin({
    name: "VencordRPC",
    description: "how to expose yourself",
    authors: [Devs.AutumnVN],
    start: setRpc,
    stop: () => setRpc(true),
    settings
});
