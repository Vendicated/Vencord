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

import definePlugin from "@utils/types";

const appIds = [
    "911790844204437504",
    "886578863147192350",
    "1020414178047041627",
    "1032800329332445255"
]

export default definePlugin({
    name: "richerCider", // why must you make me run in circles for 2 hours.
    description: "Enhances Cider by adding the \"Listening to\" and progress bar to the rich presence.",
    authors: [{
        id: 191621342473224192n,
        name: "cryptofyre",
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

    patchActivity(activity: any) {
        if (appIds.includes(activity.application_id)) {
            activity.type = 2; /* LISTENING type */
        }
    }
});