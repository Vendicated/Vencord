/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { ChannelStore, GuildStore } from "@webpack/common";

const SummaryStore = findByPropsLazy("allSummaries", "findSummary");
const { createSummaryFromServer } = findByPropsLazy("createSummaryFromServer");

const settings = definePluginSettings({
    summaryExpiryThreshold: {
        type: OptionType.NUMBER,
        description: "The time in days before a summary is removed",
        default: 3,
    }
});

export default definePlugin({
    name: "Summaries",
    description: "Enables summaries and persists them on restart",
    authors: [Devs.mantikafasi],
    settings,
    patches: [
        {
            find: "ChannelTypesSets.SUMMARIZEABLE.has",
            replacement: {
                match: /\i\.hasFeature\(\i\.GuildFeatures\.SUMMARIES_ENABLED\w+?\)/g,
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

            const incomingSummaries: any[] = [];

            for (let i = data.summaries.length - 1; i >= 0; i--) {
                const summary = createSummaryFromServer(data.summaries[i]);
                summary.time = new Date().getTime();
                incomingSummaries.push(summary);
            }

            // idk if this is good for performance but it doesnt seem to be a problem in my experience
            DataStore.update("summaries-data", summaries => {
                summaries ??= {};
                summaries[data.channel_id] ? summaries[data.channel_id].push(...incomingSummaries) : (summaries[data.channel_id] = incomingSummaries);
                if (summaries[data.channel_id].length > 50)
                    summaries[data.channel_id].shift();

                return summaries;
            });
        }
    },

    async start() {
        await DataStore.update("summaries-data", summaries => {
            for (const key of Object.keys(summaries)) {
                for (let i = summaries[key].length - 1; i >= 0; i--) {
                    if (summaries[key][i].time < new Date().getTime() - 1000 * 60 * 60 * 24 * settings.store.summaryExpiryThreshold) {
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
        // @ts-ignore
        return guild.hasFeature("SUMMARIES_ENABLED_GA");
    }
});
