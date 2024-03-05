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
import definePlugin from "@utils/types";

export default definePlugin({
    name: "ResurrectHome",
    description: "Re-enables the Server Home tab when there isn't a Server Guide.",
    authors: [Devs.Dolfies, Devs.Nuckyz],
    patches: [
        // Force home deprecation override
        {
            find: "GuildFeatures.GUILD_HOME_DEPRECATION_OVERRIDE",
            all: true,
            replacement: [
                {
                    match: /\i\.hasFeature\(\i\.GuildFeatures\.GUILD_HOME_DEPRECATION_OVERRIDE\)/g,
                    replace: "true"
                }
            ],
        },
        // Disable feedback prompts
        {
            find: "GuildHomeFeedbackExperiment.definition.id",
            replacement: [
                {
                    match: /return{showFeedback:\i,setOnDismissedFeedback:(\i)}/,
                    replace: "return{showFeedback:false,setOnDismissedFeedback:$1}"
                }
            ]
        },
        // Enable guild feed render mode selector
        {
            find: "2022-01_home_feed_toggle",
            replacement: [
                {
                    match: /showSelector:!1/,
                    replace: "showSelector:true"
                }
            ]
        },
        // Fix focusMessage clearing previously cached messages and causing a loop when fetching messages around home messages
        {
            find: '"MessageActionCreators"',
            replacement: {
                match: /(?<=focusMessage\(\i\){.+?)(?=focus:{messageId:(\i)})/,
                replace: "before:$1,"
            }
        }
    ]
});
