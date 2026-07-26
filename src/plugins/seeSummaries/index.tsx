/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { hasGuildFeature } from "@utils/discord";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { ChannelStore, GuildStore } from "@webpack/common";

const SummaryStore = findByPropsLazy("allSummaries", "findSummary");

const settings = definePluginSettings({
    summaryExpiryThresholdDays: {
        type: OptionType.SLIDER,
        description: "The time in days before a summary is removed. Note that only up to 50 summaries are kept per channel",
        markers: [1, 3, 5, 7, 10, 15, 20, 25, 30],
        stickToMarkers: false,
        default: 3,
    }
});

interface Summary {
    count: number;
    end_id: string;
    id: string;
    message_ids: string[];
    people: string[];
    source: number;
    start_id: string;
    summ_short: string;
    topic: string;
    type: number;
    unsafe: boolean;
}

interface ChannelSummary {
    type: string;
    channel_id: string;
    guild_id: string;
    summaries: Summary[];

    // custom property
    time?: number;
}
// TODO: these types are wrong and evil and incorrect
function createChannelSummaryFromServer(s: Summary, channelId: string): ChannelSummary {
    return {
        id: s.id,
        topic: s.topic,
        summShort: s.summ_short,
        people: Array.from(new Set(s.people)),
        startId: s.start_id,
        endId: s.end_id,
        count: s.count,
        channelId,
        source: s.source,
        type: s.type as any,
    } as any as ChannelSummary;
}

export default definePlugin({
    name: "Summaries",
    description: "Enables Discord's experimental Summaries feature on every server, displaying AI generated summaries of conversations",
    tags: ["Chat", "Fun"],
    authors: [Devs.mantikafasi],
    settings,
    patches: [
        {
            find: "SUMMARIZEABLE.has",
            replacement: {
                match: /\i\.features\.has\(\i\.\i\.SUMMARIES_ENABLED\w+?\)/g,
                replace: "true"
            }
        },
        {
            find: "RECEIVE_CHANNEL_SUMMARY(",
            replacement: {
                match: /shouldFetch\((\i),\i\){/,
                replace: "$& if(!$self.shouldFetch($1)) return false;"
            }
        }
    ],

    flux: {
        CONVERSATION_SUMMARY_UPDATE(data) {
            const incomingSummaries: ChannelSummary[] = data.summaries.map((summary: any) => ({
                ...createChannelSummaryFromServer(summary, undefined!),
                time: Date.now()
            }));

            // idk if this is good for performance but it doesnt seem to be a problem in my experience
            DataStore.update("summaries-data", summaries => {
                summaries ??= {};
                summaries[data.channel_id] ? summaries[data.channel_id].unshift(...incomingSummaries) : (summaries[data.channel_id] = incomingSummaries);
                if (summaries[data.channel_id].length > 50)
                    summaries[data.channel_id] = summaries[data.channel_id].slice(0, 50);

                return summaries;
            });
        }
    },

    async start() {
        await DataStore.update("summaries-data", summaries => {
            summaries ??= {};
            for (const key of Object.keys(summaries)) {
                for (let i = summaries[key].length - 1; i >= 0; i--) {
                    if (summaries[key][i].time < Date.now() - 1000 * 60 * 60 * 24 * settings.store.summaryExpiryThresholdDays) {
                        summaries[key].splice(i, 1);
                    }
                }

                if (summaries[key].length === 0) {
                    delete summaries[key];
                }
            }

            Object.assign(SummaryStore.allSummaries(), summaries);
            return summaries;
        });
    },

    shouldFetch(channelId: string) {
        const channel = ChannelStore.getChannel(channelId);
        // SUMMARIES_ENABLED feature is not in discord-types
        const guild = GuildStore.getGuild(channel.guild_id);

        return hasGuildFeature(guild, "SUMMARIES_ENABLED_GA");
    }
});
