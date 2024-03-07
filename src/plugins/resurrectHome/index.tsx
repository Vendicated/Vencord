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

import { findGroupChildrenByChildId } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Menu } from "@webpack/common";

const settings = definePluginSettings({
    forceServerHome: {
        type: OptionType.BOOLEAN,
        description: "Force the Server Guide to be the Server Home tab when it is enabled.",
        default: false
    }
});

function useForceServerHome() {
    const { forceServerHome } = settings.use(["forceServerHome"]);

    return forceServerHome;
}

export default definePlugin({
    name: "ResurrectHome",
    description: "Re-enables the Server Home tab when there isn't a Server Guide. Also has an option to force the Server Home over the Server Guide, which is accessible through right-clicking the Server Guide.",
    authors: [Devs.Dolfies, Devs.Nuckyz],
    settings,

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
        // This feature was never finished, so the patch is disabled

        // Enable guild feed render mode selector
        // {
        //     find: "2022-01_home_feed_toggle",
        //     replacement: [
        //         {
        //             match: /showSelector:!1/,
        //             replace: "showSelector:true"
        //         }
        //     ]
        // },

        // Fix focusMessage clearing previously cached messages and causing a loop when fetching messages around home messages
        {
            find: '"MessageActionCreators"',
            replacement: {
                match: /(?<=focusMessage\(\i\){.+?)(?=focus:{messageId:(\i)})/,
                replace: "before:$1,"
            }
        },
        // Force Server Home instead of Server Guide
        {
            find: "61eef9_2",
            replacement: {
                match: /(?<=getMutableGuildChannelsForGuild\(\i\)\);)(?=if\(null==\i\|\|)/,
                replace: "if($self.useForceServerHome())return false;"
            }
        }
    ],

    useForceServerHome,

    contextMenus: {
        "guild-context"(children, props) {
            const forceServerHome = useForceServerHome();

            if (!props?.guild) return;

            const group = findGroupChildrenByChildId("hide-muted-channels", children);

            group?.unshift(
                <Menu.MenuCheckboxItem
                    key="force-server-home"
                    id="force-server-home"
                    label="Force Server Home"
                    checked={forceServerHome}
                    action={() => settings.store.forceServerHome = !forceServerHome}
                />
            );
        }
    }
});
