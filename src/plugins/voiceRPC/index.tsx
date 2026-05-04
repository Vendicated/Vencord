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

import { Devs } from "@utils/constants";
import { debounce } from "@utils/index";
import definePlugin from "@utils/types";
import { Activity } from "@vencord/discord-types";
import { ActivityFlags, ActivityType } from "@vencord/discord-types/enums";
import {
    ApplicationAssetUtils,
    ChannelStore,
    FluxDispatcher,
    GuildStore,
    SelectedChannelStore,
    UserStore,
    VoiceStateStore
} from "@webpack/common";

const DISCORD_APP_ID = "1213488426712563733"; // Last.fm App ID (supports external assets)
const MICROPHONE_ICON_URL = "image_mic";

let lastChannelId: string | null | undefined = null;
let startTime: number | null = null;
let lastParticipantsStr: string | null = null;

async function getAsset(key: string | undefined | null) {
    if (!key || key.startsWith("data:")) return undefined;
    try {
        // fetchAssetIds converts public URLs into Discord-proxied asset IDs
        return (await ApplicationAssetUtils.fetchAssetIds(DISCORD_APP_ID, [key]))[0];
    } catch {
        return key;
    }
}

async function updateRPC() {
    const channelId = SelectedChannelStore.getVoiceChannelId();

    // Track participants
    const voiceStates = channelId ? VoiceStateStore.getVoiceStatesForChannel(channelId) : {};
    const userIds = Object.keys(voiceStates);
    const participantsStr = userIds.sort().join(",");

    if (channelId === lastChannelId && participantsStr === lastParticipantsStr) return;

    lastChannelId = channelId;
    lastParticipantsStr = participantsStr;

    if (!channelId) {
        startTime = null;
        FluxDispatcher.dispatch({
            type: "LOCAL_ACTIVITY_UPDATE",
            activity: null,
            socketId: "VoiceRPC",
        });
        return;
    }

    const channel = ChannelStore.getChannel(channelId);
    if (!channel) return;

    if (!startTime) startTime = Date.now();

    const user = UserStore.getCurrentUser();
    const guild = channel.guild_id ? GuildStore.getGuild(channel.guild_id) : null;

    const guildName = guild ? guild.name : "Private Call";
    const channelName = channel.name || "Voice Channel";

    // Build member list for the state field
    const otherMembers = userIds
        .filter(id => id !== user?.id)
        .map(id => UserStore.getUser(id)?.username)
        .filter(Boolean);

    let stateText = channelName; // Default Line 2 to Channel Name
    if (otherMembers.length > 0) {
        if (otherMembers.length > 2) {
            stateText = `With ${otherMembers.length} others`;
        } else {
            stateText = `With ${otherMembers.join(", ")}`;
        }
        if (stateText.length > 120) stateText = stateText.substring(0, 117) + "...";
    }

    // Assets: Use Microphone Icon (Large) and User Avatar (Small)
    const userAvatarUrl = user?.getAvatarURL(null, 1024);

    const activity: Activity = {
        application_id: DISCORD_APP_ID,
        name: `In Voice Chat (${channelName})`, // Line 0: "In Voice Chat #channel-name"
        details: `In ${guildName}`, // Line 1: Guild Name
        state: stateText, // Line 2: Members list or count
        type: ActivityType.PLAYING,
        assets: {
            large_image: await getAsset(MICROPHONE_ICON_URL),
            large_text: "In Voice Chat",
            // small_image: await getAsset(MICROPHONE_ICON_URL),
            // small_text: user?.username
        },
        timestamps: {
            start: startTime
        },
        flags: ActivityFlags.INSTANCE,
    };

    FluxDispatcher.dispatch({
        type: "LOCAL_ACTIVITY_UPDATE",
        activity,
        socketId: "VoiceRPC",
    });
}

const debouncedUpdateRPC = debounce(updateRPC, 500);

export default definePlugin({
    name: "VoiceRPC",
    description: "Shows a custom Rich Presence when you join a voice channel",
    authors: [Devs.Pankaj],
    tags: ["Voice", "Activity"],

    flux: {
        VOICE_STATE_UPDATES() {
            debouncedUpdateRPC();
        }
    },

    start() {
        updateRPC();
    },

    stop() {
        lastChannelId = null;
        startTime = null;
        lastParticipantsStr = null;
        FluxDispatcher.dispatch({
            type: "LOCAL_ACTIVITY_UPDATE",
            activity: null,
            socketId: "VoiceRPC",
        });
    }
});
