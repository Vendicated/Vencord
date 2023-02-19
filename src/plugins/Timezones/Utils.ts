/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

const PreloadedUserSettings = findLazy(m => m.ProtoClass?.typeName === "discord_protos.discord_users.v1.PreloadedUserSettings");

import * as DataStore from "@api/DataStore";
import { VENCORD_USER_AGENT } from "@utils/constants";
import { debounce } from "@utils/debounce";
import { findLazy } from "@webpack";
export const DATASTORE_KEY = "plugins.Timezones.savedTimezones";
import type { timezones } from "./all_timezones";


export interface TimezoneDB {
    [userId: string]: typeof timezones[number];
}

const API_URL = "https://timezonedb.catvibers.me";
const Cache: Record<string, typeof timezones[number]> = {};

export function getTimeString(timezone: string, timestamp = new Date()): string {
    const locale = PreloadedUserSettings.getCurrentValue().localization.locale.value;

    return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "numeric", timeZone: timezone }).format(timestamp); // we hate javascript
}


// A map of ids and callbacks that should be triggered on fetch
const requestQueue: Record<string, ((timezone: typeof timezones[number]) => void)[]> = {};


async function bulkFetchTimezones(ids: string[]): Promise<TimezoneDB | undefined> {
    try {
        const req = await fetch(`${API_URL}/api/user/bulk`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "User-Agent": VENCORD_USER_AGENT
            },
            body: JSON.stringify(ids),
        });

        return await req.json()
            .then((res: { [userId: string]: { timezoneId: string; } | null; }) => {
                const tzs = (Object.keys(res).map(userId => {
                    return res[userId] && { [userId]: res[userId]!.timezoneId as typeof timezones[number] };
                }).filter(Boolean) as TimezoneDB[]).reduce((acc, cur) => ({ ...acc, ...cur }), {});

                Object.assign(Cache, tzs);
                return tzs;
            });
    } catch (e) {
        console.error("Timezone fetching failed: ", e);
    }
}


// Executes all queued requests and calls their callbacks
const bulkFetch = debounce(async () => {
    const ids = Object.keys(requestQueue);
    const timezones = await bulkFetchTimezones(ids);
    if (!timezones) {
        // retry after 15 seconds
        setTimeout(bulkFetch, 15000);
        return;
    }

    for (const id of ids) {
        // Call all callbacks for the id
        requestQueue[id].forEach(c => c(timezones[id]));
        delete requestQueue[id];
    }
});

export function getUserTimezone(discordID: string): Promise<typeof timezones[number] | undefined> {
    return new Promise(res => {
        if (discordID in Cache) res(Cache[discordID]);

        const timezone = (DataStore.get(DATASTORE_KEY) as Promise<TimezoneDB | undefined>).then(tzs => tzs?.[discordID]);
        timezone.then(tz => {
            if (tz) res(tz);
            else {
                if (discordID in requestQueue) requestQueue[discordID].push(res);
                // If not already added, then add it and call the debounced function to make sure the request gets executed
                else {
                    requestQueue[discordID] = [res];
                    bulkFetch();
                }
            }
        });
    });
}
