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
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { Button, Menu, Tooltip, useEffect, useState } from "@webpack/common";

const ChannelRowClasses = findByPropsLazy("modeConnected", "modeLocked", "icon");

let currentShouldViewServerHome = false;
const shouldViewServerHomeStates = new Set<React.Dispatch<React.SetStateAction<boolean>>>();

function ViewServerHomeButton() {
    return (
        <Tooltip text="View Server Home">
            {tooltipProps => (
                <Button
                    {...tooltipProps}
                    look={Button.Looks.BLANK}
                    size={Button.Sizes.NONE}
                    innerClassName={ChannelRowClasses.icon}
                    onClick={e => {
                        e.preventDefault();

                        currentShouldViewServerHome = true;
                        for (const setState of shouldViewServerHomeStates) {
                            setState(true);
                        }
                    }}

                >
                    <svg width="20" height="20" viewBox="0 0 24 24">
                        <path fill="currentColor" d="m2.4 8.4 8.38-6.46a2 2 0 0 1 2.44 0l8.39 6.45a2 2 0 0 1-.79 3.54l-.32.07-.82 8.2a2 2 0 0 1-1.99 1.8H16a1 1 0 0 1-1-1v-5a3 3 0 0 0-6 0v5a1 1 0 0 1-1 1H6.31a2 2 0 0 1-1.99-1.8L3.5 12l-.32-.07a2 2 0 0 1-.79-3.54Z" />
                    </svg>
                </Button>
            )}
        </Tooltip>
    );
}

function useForceServerHome() {
    const { forceServerHome } = settings.use(["forceServerHome"]);
    const [shouldViewServerHome, setShouldViewServerHome] = useState(currentShouldViewServerHome);

    useEffect(() => {
        shouldViewServerHomeStates.add(setShouldViewServerHome);

        return () => {
            shouldViewServerHomeStates.delete(setShouldViewServerHome);
        };
    }, []);

    return shouldViewServerHome || forceServerHome;
}

function useDisableViewServerHome() {
    useEffect(() => () => {
        currentShouldViewServerHome = false;
        for (const setState of shouldViewServerHomeStates) {
            setState(false);
        }
    }, []);
}

const settings = definePluginSettings({
    forceServerHome: {
        type: OptionType.BOOLEAN,
        description: "Force the Server Guide to be the Server Home tab when it is enabled.",
        default: false
    }
});

export default definePlugin({
    name: "ResurrectHome",
    description: "Re-enables the Server Home tab when there isn't a Server Guide. Also has an option to force the Server Home over the Server Guide, which is accessible through right-clicking a server.",
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
                    match: /return{showFeedback:.+?,setOnDismissedFeedback:(\i)}/,
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
                replace: "after:$1,"
            }
        },
        // Force Server Home instead of Server Guide
        {
            find: "61eef9_2",
            replacement: {
                match: /getMutableGuildChannelsForGuild\(\i\);return\(0,\i\.useStateFromStores\).+?\]\)(?=}function)/,
                replace: m => `${m}&&!$self.useForceServerHome()`
            }
        },
        // Add View Server Home Button to Server Guide
        {
            find: "487e85_1",
            replacement: {
                match: /(?<=text:(\i)\?\i\.\i\.Messages\.SERVER_GUIDE:\i\.\i\.Messages\.GUILD_HOME,)/,
                replace: "trailing:$self.ViewServerHomeButton({serverGuide:$1}),"
            }
        },
        // Disable view Server Home override when the Server Home is unmouted
        {
            find: "69386d_5",
            replacement: {
                match: /location:"69386d_5".+?;/,
                replace: "$&$self.useDisableViewServerHome();"
            }
        }
    ],

    ViewServerHomeButton: ErrorBoundary.wrap(({ serverGuide }: { serverGuide?: boolean; }) => {
        if (serverGuide !== true) return null;

        return <ViewServerHomeButton />;
    }),

    useForceServerHome,
    useDisableViewServerHome,

    contextMenus: {
        "guild-context"(children, props) {
            const { forceServerHome } = settings.use(["forceServerHome"]);

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
