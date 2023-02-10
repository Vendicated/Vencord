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

import definePlugin, { OptionType } from "@utils/types";
import { Settings } from "@api/settings";
import { Forms } from "@webpack/common";
import { Link } from "@components/Link";
export default definePlugin({
    name: "audaciousRPC",
    authors: [{ id: 236907218342117376n, name: "akira", }],
    description: "Adds listening activity type to Audacious and changes the details to see more like Spotify.",
    patches: [
        {
            find: '.displayName="LocalActivityStore"',
            replacement: {
                match: /LOCAL_ACTIVITY_UPDATE:function\((\i)\)\{/,
                replace: "$&$self.patchActivity($1.activity);",
            }
        }
    ],
    options: {
        showListening: {
            type: OptionType.BOOLEAN,
            description: "Shows Listening to Audacious instead of Playing Audacious.",
            default: true,
        },
        spotifyStyle: {
            type: OptionType.BOOLEAN,
            description: "Changes where the artist and title are displayed so it looks more like Spotify.",
            default: true,
        }
    },
    settingsAboutComponent: () => (
        <>
            <Forms.FormTitle tag="h3">Audacious RPC</Forms.FormTitle>
            <Forms.FormText>Install the <Link href="https://github.com/crackheadakira/audacious-plugin-rpc/releases/tag/Recommended"> RPC plugin for Audacious.</Link> to be able to use this.</Forms.FormText>
        </>
    ),
    patchActivity(activity: any) {
        if ("1036306255507095572" === activity.application_id) {
            if (Settings.plugins.audaciousRPC.showListening) activity.type = 2;
            if (!Settings.plugins.audaciousRPC.spotifyStyle) return;

            const song = activity.details.split(" - ");
            const album = activity.assets.large_text;
            const artist = song[0];
            const title = song[1];

            activity.details = title;
            activity.state = `by ${artist}`;
            activity.assets.large_text = `on ${album}`;
        }
    },
});
