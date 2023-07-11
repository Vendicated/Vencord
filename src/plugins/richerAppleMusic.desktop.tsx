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
import definePlugin from "@utils/types";
import { Forms } from "@webpack/common";
const appIds = [
    "1066220978406953012"
];
export default definePlugin({
    name: "richerAppleMusic",
    description: "Enhances the Apple Music (Previe) app from the Microsoft Store, (More details in info button) by adding the \"Listening to\" type prefix to the user's rich presence when an applicable ID is found.",
    authors: [{
        id: 260495694882668547n,
        name: "tonymontana",
    }],
    patches: [
        {
            find: '.displayName="LocalActivityStore"',
            replacement: {
                match: /LOCAL_ACTIVITY_UPDATE:function\((\i)\)\{/,
                replace: "$&$self.patchActivity($1.activity);",
            }
        },
        {
            find: "renderTimeBar=function",
            replacement: {
                match: /renderTimeBar=function\((.{1,3})\){.{0,50}?var/,
                replace: "renderTimeBar=function($1){var"
            }
        }
    ],
    settingsAboutComponent: () => (
        <>
            <Forms.FormTitle tag="h3">1. Install Apple Music (Preview) to use this Plugin</Forms.FormTitle>
            <Forms.FormText>
                <Link href="https://www.microsoft.com/store/apps/9PFHDD62MXS1">Follow the link to the website</Link> to get Apple Music (Preview) up and running.
            </Forms.FormText>
            <br></br>
            <Forms.FormTitle tag="h3">2. Install AMWin-RP to use this Plugin</Forms.FormTitle>
            <Forms.FormText>
                <Link href="https://github.com/PKBeam/AMWin-RP">Follow the link to the website</Link> to get the regular RPC for Apple Music (Preview) up and running, and then enable the plugin.
            </Forms.FormText>
            <br></br>
            <Forms.FormTitle tag="h3">3. Recommended Optional Plugins</Forms.FormTitle>
            <Forms.FormText>
                I'd recommend using TimeBarAllActivities alongside this plugin to give off a much better visual to the eye (Keep in mind this only affects your client and will not show for other users)
            </Forms.FormText>
        </>
    ),
    patchActivity(activity: any) {
        if (appIds.includes(activity.application_id)) {
            activity.type = 2; /* LISTENING type */
        }
    },
});
