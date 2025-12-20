/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import {
    ChannelStore,
    GuildChannelStore,
    RestAPI,
    showToast,
    Toasts,
} from "@webpack/common";

import { QuestSpooferLogger } from "@plugins/questSpoofer/constants";

/**
 * Spoofs the PLAY_ACTIVITY quest by sending periodic heartbeats
 * against the user's current private call or a guild voice channel.
 */
export async function spoofPlayActivityQuest(
    quest: any,
    secondsNeeded: number,
) {
    const guilds = GuildChannelStore.getAllGuilds() as Record<
        string,
        { VOCAL?: { channel: { id: string } }[] }
    >;

    const vcId =
        ChannelStore.getSortedPrivateChannels()[0]?.id ??
        Object.values(guilds).find(g => (g.VOCAL ?? []).length > 0)
            ?.VOCAL?.[0]?.channel?.id;

    if (!vcId) {
        QuestSpooferLogger.error("No voice channel found to spoof activity.");
        return showToast(
            "❌ No voice channel available to spoof activity.",
            Toasts.Type.FAILURE,
        );
    }

    const streamKey = `call:${vcId}:1`;
    QuestSpooferLogger.debug(`Using stream key: ${streamKey}`);

    await (async function spoofHeartbeat() {
        QuestSpooferLogger.info("Started activity spoofing...");
        while (true) {
            const res = await RestAPI.post({
                url: `/quests/${quest.id}/heartbeat`,
                body: { stream_key: streamKey, terminal: false },
            });

            const progress = res.body.progress.PLAY_ACTIVITY.value;
            QuestSpooferLogger.debug(
                `Activity progress: ${progress}/${secondsNeeded}`,
            );

            if (progress >= secondsNeeded) {
                await RestAPI.post({
                    url: `/quests/${quest.id}/heartbeat`,
                    body: { stream_key: streamKey, terminal: true },
                });

                showToast("✅ Activity quest completed!", Toasts.Type.SUCCESS);
                QuestSpooferLogger.info("Activity quest spoofed successfully.");
                break;
            }

            await new Promise(r => setTimeout(r, 20_000));
        }
    })();

    showToast(
        `🧠 Spoofing activity: ${quest.config.messages.questName}`,
        Toasts.Type.MESSAGE,
    );
}
