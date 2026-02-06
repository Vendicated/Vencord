/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Quest } from "@vencord/discord-types";
import { QuestSpooferLogger } from "@plugins/questSpoofer/constants";
import { claimQuestReward } from "@plugins/questSpoofer/helpers";
import {
    ChannelStore,
    GuildChannelStore,
    RestAPI,
    showToast,
    Toasts,
} from "@webpack/common";

/**
 * Spoofs the PLAY_ACTIVITY quest by sending periodic heartbeats
 * against the user's current private call or a guild voice channel.
 */
export async function spoofPlayActivityQuest(
    quest: Quest,
    secondsNeeded: number,
) {
    const questName =
        quest.config.messages.questName
        ?? quest.config.messages.quest_name
        ?? quest.config.messages.game_title
        ?? quest.config.application.name;
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

                const claimResult = await claimQuestReward(quest.id);
                if (claimResult.status === "captcha") {
                    showToast(
                        "⚠️ Quest reward requires captcha. Claim manually in Discord.",
                        Toasts.Type.MESSAGE,
                    );
                } else if (claimResult.status === "error") {
                    showToast(
                        "Quest reward claim failed. See console for details.",
                        Toasts.Type.FAILURE,
                    );
                }
                break;
            }

            await new Promise(r => setTimeout(r, 20_000));
        }
    })();

    showToast(
        `🧠 Spoofing activity: ${questName}`,
        Toasts.Type.MESSAGE,
    );
}
