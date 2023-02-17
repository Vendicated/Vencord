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
    "412797059612278785",
    "752999910097289267",
    "759604595810107412"
];
export default definePlugin({
    name: "Listening To WACUP",
    description: "Adds \"Listening to\" type prefix to the user's rich presence when using WACUP.",
    authors: [{
        id: 477660562533384213n,
        name: "brenden",
    }],
    patches: [
        {
            find: '.displayName="LocalActivityStore"',
            replacement: {
                match: /LOCAL_ACTIVITY_UPDATE:function\((\i)\)\{/,
                replace: "$&$self.patchActivity($1.activity);",
            }
        }
    ],
    settingsAboutComponent: () => (
        <>
            <Forms.FormTitle tag="h3">Install WACUP to use this Plugin</Forms.FormTitle>
            <Forms.FormText>
                You can grab WACUP on the website <Link href="https://getwacup.com">here</Link>.
            </Forms.FormText>
            <br></br>
            <Forms.FormTitle tag="h3">What is WACUP?</Forms.FormTitle>
            <Forms.FormText>
            Winamp Community Update Project is a media player that's made to emulate some of your favourite media players from the past & bring them into the future.
            </Forms.FormText>
        </>
    ),
    patchActivity(activity: any) {
        if (appIds.includes(activity.application_id)) {
            activity.type = 2; /* LISTENING type */
        }
    },
});
