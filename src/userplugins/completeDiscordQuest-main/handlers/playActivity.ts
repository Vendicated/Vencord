/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findByPropsLazy } from "@webpack";

import settings from "../settings";
import { callWithRetry } from "../utils/retry";
import { QuestHandler } from "./types";

const VoiceActions = findByPropsLazy("selectVoiceChannel", "selectChannel") as { selectVoiceChannel?: (channelId: string) => void; };

function resolveVoiceChannelId(ChannelStore, GuildChannelStore): string | undefined {
    const configuredChannelId = (settings.store.preferredVoiceChannelId ?? "").trim();
    if (configuredChannelId) {
        const channel = ChannelStore?.getChannel?.(configuredChannelId);
        if (channel != null) {
            return configuredChannelId;
        }
        console.warn("[CompleteDiscordQuest] Preferred voice channel not found, falling back to first available channel.");
    }

    const dmChannel = ChannelStore?.getSortedPrivateChannels?.()?.[0]?.id;
    if (dmChannel) return dmChannel;

    const guilds = Object.values(GuildChannelStore?.getAllGuilds?.() ?? {});
    const firstGuildWithVocal = guilds.find(x => x != null && (x as any).VOCAL?.length > 0);
    return (firstGuildWithVocal as any)?.VOCAL?.[0]?.channel?.id;
}

function maybeJoinVoiceChannel(channelId: string) {
    if (!settings.store.autoJoinVoiceChannel) return;
    if (!VoiceActions?.selectVoiceChannel) {
        console.warn("[CompleteDiscordQuest] Could not find voice action to join channel automatically.");
        return;
    }
    try {
        VoiceActions.selectVoiceChannel(channelId);
    } catch (err) {
        console.error("[CompleteDiscordQuest] Failed to auto-join voice channel", channelId, err);
    }
}

async function maybeSendAutoInvite(RestAPI: any, channelId: string) {
    if (!settings.store.autoInviteEnabled) return;
    const targetUserId = (settings.store.autoInviteUserId ?? "").trim();
    if (!targetUserId) {
        console.warn("[CompleteDiscordQuest] Auto-invite enabled but no user ID set.");
        return;
    }

    try {
        const inviteRes = await callWithRetry(() => RestAPI.post({
            url: `/channels/${channelId}/invites`,
            body: { max_age: 1800, max_uses: 1, unique: true }
        }), { label: "quest-auto-invite-create" });
        const inviteCode = (inviteRes as any)?.body?.code;
        if (!inviteCode) {
            console.warn("[CompleteDiscordQuest] Failed to create invite code for auto-invite.");
            return;
        }

        const dmRes = await callWithRetry(() => RestAPI.post({
            url: "/users/@me/channels",
            body: { recipient_id: targetUserId }
        }), { label: "quest-auto-invite-dm" });
        const dmChannelId = (dmRes as any)?.body?.id;
        if (!dmChannelId) {
            console.warn("[CompleteDiscordQuest] Failed to open DM channel for auto-invite.");
            return;
        }

        await callWithRetry(() => RestAPI.post({
            url: `/channels/${dmChannelId}/messages`,
            body: { content: `https://discord.gg/${inviteCode}` }
        }), { label: "quest-auto-invite-send" });

        console.log(`[CompleteDiscordQuest] Sent auto-invite for voice channel ${channelId} to user ${targetUserId}.`);
    } catch (err) {
        console.error("[CompleteDiscordQuest] Auto-invite failed", err);
    }
}

export const playActivityHandler: QuestHandler = {
    supports(taskName: string) {
        return taskName === "PLAY_ACTIVITY";
    },

    handle({ quest, questName, secondsNeeded, RestAPI, completingQuest, ChannelStore, GuildChannelStore, getSpoofingProfile, onQuestComplete }) {
        const channelId = resolveVoiceChannelId(ChannelStore, GuildChannelStore);
        if (!channelId) {
            console.error("[CompleteDiscordQuest] No voice channel found to use for quest:", questName);
            completingQuest.set(quest.id, false);
            return;
        }
        const streamKey = `call:${channelId}:1`;
        maybeJoinVoiceChannel(channelId);
        void maybeSendAutoInvite(RestAPI, channelId);

        const playActivity = async () => {
            console.log("Completing quest", questName, "-", quest.config.messages.questName);

            while (true) {
                let res;
                try {
                    res = await callWithRetry(() => RestAPI.post({ url: `/quests/${quest.id}/heartbeat`, body: { stream_key: streamKey, terminal: false } }), { label: "heartbeat" });
                } catch (err) {
                    console.error("Heartbeat failed after retries, stopping quest:", questName, err);
                    completingQuest.set(quest.id, false);
                    break;
                }
                const progress = res.body.progress.PLAY_ACTIVITY.value;
                console.log(`Quest progress ${questName}: ${progress}/${secondsNeeded}`);

                const { playActivity: playActivityProfile } = getSpoofingProfile();
                await new Promise(resolve => setTimeout(resolve, playActivityProfile.intervalMs));

                if (!completingQuest.get(quest.id) || progress >= secondsNeeded) {
                    console.log("Stopping completing quest:", questName);

                    if (progress >= secondsNeeded) {
                        try {
                            await callWithRetry(() => RestAPI.post({ url: `/quests/${quest.id}/heartbeat`, body: { stream_key: streamKey, terminal: true } }), { label: "heartbeat-terminal" });
                        } catch (err) {
                            console.error("Terminal heartbeat failed after retries for quest:", questName, err);
                        }
                        console.log("Quest completed!");
                        onQuestComplete();
                    } else {
                        completingQuest.set(quest.id, false);
                    }
                    break;
                }
            }
        };
        playActivity();
    }
};
