/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 OpenAsar
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

import { Link } from "@components/Link";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin from "@utils/types";
import { Forms } from "@webpack/common";
const logger = new Logger("EnhancedAMWin");

interface ActivityAssets {
    large_image: string;
    large_text: string;
    small_image: string;
}

interface Activity {
    application_id: string;
    assets?: ActivityAssets;
    buttons?: string[];
    details?: string;
    metadata?: {
        button_urls?: string[];
    };
    name: string;
    state?: string;
    timestamps?: {
        end?: number;
        start?: number;
    };
    type: ActivityType;
    url?: string;
}

const enum ActivityType {
    PLAYING = 0,
    STREAMING = 1,
    LISTENING = 2,
    WATCHING = 3,
    COMPETING = 5
}

const AMWinClientID = "1066220978406953012";

export default definePlugin({
    name: "EnhancedAMWin",
    description: 'Replaces AMWin-RP\'s "Playing Apple Music" status with the "Listening" status.',
    authors: [Devs.Chloe],
    start() {
        logger.debug("Plugin started");
    },

    patches: [
        {
            find: '="LocalActivityStore",',
            replacement: {
                match: /LOCAL_ACTIVITY_UPDATE:function\((\i)\)\{/,
                replace: "$&$self.patchActivity($1.activity);",
            },
        },

        // Replace the default "time remaining" text with the time bar in case the TimeBarAllActivies plugin is disabled.
        {
            find: "}renderTimeBar(",
            replacement: {
                match: /renderTimeBar\((.{1,3})\){.{0,50}?let/,
                replace: "renderTimeBar($1){let",
            },
        },
    ],
    settingsAboutComponent: () => (
        <>
            <Forms.FormTitle tag="h3">Usage</Forms.FormTitle>
            <Forms.FormText>
                You will need to install <Link href="https://github.com/PKBeam/AMWin-RP">AMWin-RP</Link>.
                <br />
                This then replaces AMWin-RP's "Playing Apple Music" status with a "Listening to Apple Music" status.
                <br />
                To customize the Rich Presence further, you can right click AMWin-RP's tray icon and go to the settings page.
                <br />
                Optionally, you can install the TimeBarAllActivities plugin to add a time bar for the Rich Presence.
            </Forms.FormText>
        </>
    ),
    patchActivity(activity: Activity) {
        if (activity?.application_id === AMWinClientID) {
            activity.type = 2;
        }
    },
});
