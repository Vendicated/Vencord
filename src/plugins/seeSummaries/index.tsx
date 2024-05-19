/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { FluxDispatcher } from "@webpack/common";


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
            // I pollute the flux object but tbh, its fine
            data.time = new Date().getTime();

            // idk if this is good for performance but it doesnt seem to be a problem in my experience
            DataStore.update("summaries-data", summaries => {
                summaries ??= [];
                summaries.push(data);
                return summaries;
            });
        }
    },

    async start() {
        DataStore.update("summaries-data", summaries => {
            for (let i = summaries.length - 1; i >= 0; i--) {
                FluxDispatcher.dispatch(summaries[i]);

                // Remove summaries older than 3 days
                if (summaries[i].time < new Date().getTime() - 1000 * 60 * 60 * 24 * 3) {
                    summaries.splice(i, 1);
                    i--;
                }
            }

            return summaries;
        });
    }
});
