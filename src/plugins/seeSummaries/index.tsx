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
    name: "See Summaries",
    description: "Enables Summaries and stores them in IndexedDB",
    authors: [Devs.mantikafasi],
    patches: [
        {
            find: "ChannelTypesSets.SUMMARIZEABLE.has",
            replacement: {
                match: /\(e\){var .;let .*GuildFeatures.SUMMARIES_ENABLED_BY_USER\)\)}/,
                replace: "(e){return true;}"
            }
        }
    ],
    flux: {
        // @ts-ignore - Sadly this flux event is not in types
        CONVERSATION_SUMMARY_UPDATE(data) {
            console.log("update blahbalha ", data);

            // I pollute the flux object but tbh, its fine
            data.time = new Date().getTime();

            DataStore.update("summaries-data", summaries => {
                summaries ??= [];
                summaries.push(data);
                return summaries;
            });
        }
    },

    async start() {
        DataStore.update("summaries-data", summaries => {
            for (const summary of summaries) {
                FluxDispatcher.dispatch(summary);

                // Remove summaries older than 3 days
                if (summary.time < new Date().getTime() - 1000 * 60 * 60 * 24 * 3) {
                    summaries.splice(summaries.indexOf(summary), 1);
                }
            }
            return summaries;
        });
    }
});
