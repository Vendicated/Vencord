/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";

const SummaryStore = findByPropsLazy("allSummaries", "findSummary");
const { createSummaryFromServer } = findByPropsLazy("createSummaryFromServer");
export default definePlugin({
    name: "Summaries",
    description: "Enables summaries and persists them on restart",
    authors: [Devs.mantikafasi],
    patches: [
        {
            find: "ChannelTypesSets.SUMMARIZEABLE.has",
            replacement: {
                match: /\i\.hasFeature\(\i\.GuildFeatures\.SUMMARIES_ENABLED\w+?\)/g,
                replace: "true"
            }
        }
    ],
    flux: {
        CONVERSATION_SUMMARY_UPDATE(data) {

            const summaries: any[] = [];

            for (let i = data.summaries.length - 1; i >= 0; i--) {
                const summary = createSummaryFromServer(data.summaries[i]);
                summary.time = new Date().getTime();
                summaries.push(summary);
            }

            // idk if this is good for performance but it doesnt seem to be a problem in my experience
            DataStore.update("summaries-data", summaries => {
                summaries ??= {};
                summaries[data.channel_id] ? summaries[data.channel_id].push(...summaries) : (summaries[data.channel_id] = summaries);
                return summaries;
            });
        }
    },

    async start() {
        await DataStore.update("summaries-data", summaries => {
            for (const key of Object.keys(summaries)) {
                for (let i = summaries[key].length - 1; i >= 0; i--) {
                    if (summaries[key][i].time < new Date().getTime() - 1000 * 60 * 60 * 24 * 3) {
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
    }
});
