/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { makeRange, OptionType } from "@utils/types";
import type { Channel } from "@vencord/discord-types";
import { findStoreLazy } from "@webpack";
import { GuildChannelStore, Menu, React, RestAPI, UserStore } from "@webpack/common";

const VoiceStateStore = findStoreLazy("VoiceStateStore");

async function runSequential<T>(promises: Promise<T>[]): Promise<T[]> {
    const results: T[] = [];

    for (let i = 0; i < promises.length; i++) {
        const promise = promises[i];
        const result = await promise;
        results.push(result);

        if (i % settings.store.waitAfter === 0) {
            await new Promise(resolve => setTimeout(resolve, settings.store.waitSeconds * 1000));
        }
    }

    return results;
}

function sendPatchToServer(guildId: string, body: Record<string, any>, targetChannelId?: string) {
    const myId = UserStore.getCurrentUser().id;
    const guildChannels: { VOCAL: { channel: Channel, comparator: number }[] } = GuildChannelStore.getChannels(guildId);
    const voiceChannels = guildChannels.VOCAL.map(({ channel }) => channel);

    const promises: Promise<any>[] = [];
    
    // Loop through all voice channels in the server
    voiceChannels.forEach(channel => {
        const usersVoice = VoiceStateStore.getVoiceStatesForChannel(channel.id);
        
        Object.keys(usersVoice).forEach((key) => {
            const userVoice = usersVoice[key];
            
            // Skip the current user for all actions except move
            if (userVoice.userId !== myId || targetChannelId) {
                const patchBody = targetChannelId 
                    ? { channel_id: targetChannelId }
                    : body;
                    
                promises.push(RestAPI.patch({
                    url: `/guilds/${guildId}/members/${userVoice.userId}`,
                    body: patchBody
                }));
            }
        });
    });

    runSequential(promises).catch(error => {
        console.error("VoiceChatUtilities failed to run on server", error);
    });
}

interface GuildContextProps {
    guild: {
        id: string;
        name: string;
    };
}

const GuildContext: NavContextMenuPatchCallback = (children, props: GuildContextProps) => {
    const { guild } = props;
    if (!guild) return;

    const guildChannels: { VOCAL: { channel: Channel, comparator: number }[] } = GuildChannelStore.getChannels(guild.id);
    const voiceChannels = guildChannels.VOCAL.map(({ channel }) => channel);
    
    // Check if there are any users in voice channels
    let totalUsers = 0;
    voiceChannels.forEach(channel => {
        totalUsers += Object.keys(VoiceStateStore.getVoiceStatesForChannel(channel.id)).length;
    });
    
    if (totalUsers === 0) return;

    children.splice(
        -1,
        0,
        <Menu.MenuItem
            label="Server Voice Tools"
            key="server-voice-tools"
            id="server-voice-tools"
        >
            <Menu.MenuItem
                key="server-voice-tools-disconnect-all"
                id="server-voice-tools-disconnect-all"
                label="Disconnect all from server"
                action={() => sendPatchToServer(guild.id, {
                    channel_id: null,
                })}
            />

            <Menu.MenuItem
                key="server-voice-tools-mute-all"
                id="server-voice-tools-mute-all"
                label="Mute all in server"
                action={() => sendPatchToServer(guild.id, {
                    mute: true,
                })}
            />

            <Menu.MenuItem
                key="server-voice-tools-unmute-all"
                id="server-voice-tools-unmute-all"
                label="Unmute all in server"
                action={() => sendPatchToServer(guild.id, {
                    mute: false,
                })}
            />

            <Menu.MenuItem
                key="server-voice-tools-deafen-all"
                id="server-voice-tools-deafen-all"
                label="Deafen all in server"
                action={() => sendPatchToServer(guild.id, {
                    deaf: true,
                })}
            />

            <Menu.MenuItem
                key="server-voice-tools-undeafen-all"
                id="server-voice-tools-undeafen-all"
                label="Undeafen all in server"
                action={() => sendPatchToServer(guild.id, {
                    deaf: false,
                })}
            />

            <Menu.MenuItem
                label="Move all to channel"
                key="server-voice-tools-move-all"
                id="server-voice-tools-move-all"
            >
                {voiceChannels.map(voiceChannel => {
                    return (
                        <Menu.MenuItem
                            key={voiceChannel.id}
                            id={voiceChannel.id}
                            label={voiceChannel.name}
                            action={() => sendPatchToServer(guild.id, {}, voiceChannel.id)}
                        />
                    );
                })}
            </Menu.MenuItem>
        </Menu.MenuItem>
    );
};

const settings = definePluginSettings({
    waitAfter: {
        type: OptionType.SLIDER,
        description: "Amount of API actions to perform before waiting (to avoid rate limits)",
        default: 5,
        markers: makeRange(1, 20),
    },
    waitSeconds: {
        type: OptionType.SLIDER,
        description: "Time to wait between each action (in seconds)",
        default: 2,
        markers: makeRange(1, 10, .5),
    }
});

export default definePlugin({
    name: "Kicks",
    description: "Perform voice actions on all users across the entire server at once (disconnect, mute, deafen, move all)",
    authors: [Devs.pluckerpilple],

    settings,

    contextMenus: {
        "guild-context": GuildContext
    },
});