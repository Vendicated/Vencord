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

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { FluxDispatcher } from "@webpack/common";

interface ActivityAssets {
    large_image?: string;
    large_text?: string;
    small_image?: string;
    small_text?: string;
}

interface Activity {
    state?: string;
    details?: string;
    timestamps?: {
        start?: number;
        end?: number;
    };
    assets?: ActivityAssets;
    buttons?: Array<string>;
    name: string;
    application_id: string;
    metadata?: {
        button_urls?: Array<string>;
    };
    type: ActivityType;
    url?: string;
    flags: number;
}

interface Data {
    activity: Activity;
    pid?: number;
    socketId: string;
    type: string;
}


const enum ActivityType {
    PLAYING = 0,
    STREAMING = 1,
    LISTENING = 2,
    WATCHING = 3,
    COMPETING = 5
}


const settings = definePluginSettings({
    musicPlayerNames: {
        type: OptionType.STRING,
        default: "Spotify,Music",
        description: "List of activity names which will get replaced by the song's title (separated by ,)",
        restartNeeded: false
    },
    forceListeningType: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Force all music player activities to be \"Listening to\", instead of \"Playing\"",
        restartNeeded: false
    }
});


function handleUpdate(data: Data) {
    console.log(data);
    if(data.activity.state === undefined) return;

    const players = settings.store.musicPlayerNames.split(",");
    if(!players.includes(data.activity.name)) return;

    if(settings.store.forceListeningType) {
        data.activity.type = ActivityType.LISTENING;
    }

    if(data.activity.details !== undefined) {
        data.activity.name = data.activity.details;
    }
}

async function start() {
    FluxDispatcher.subscribe("LOCAL_ACTIVITY_UPDATE", handleUpdate);
}

async function stop() {
    FluxDispatcher.unsubscribe("LOCAL_ACTIVITY_UPDATE", handleUpdate);
}

export default definePlugin({
    name: "MusicTitleRPC",
    description: "Makes the song's title appear as the activity name when listening to music.",
    authors: [Devs.Blackilykat],
    start: start,
    stop: stop,
    settings
});

