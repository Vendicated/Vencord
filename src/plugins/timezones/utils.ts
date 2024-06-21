/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { findStoreLazy } from "@webpack";
export const DATASTORE_KEY = "plugins.timezones.savedTimezones";

import { debounce } from "@shared/debounce";
import { VENCORD_USER_AGENT } from "@shared/vencordUserAgent";

import { CustomTimezonePreference } from "./settings";

export interface TimezoneDB {
    [userId: string]: string;
}

export const API_URL = "https://timezonedb.catvibers.me";
const Cache: Record<string, string> = {};

const UserSettingsProtoStore = findStoreLazy("UserSettingsProtoStore");

export function getTimeString(timezone: string, timestamp = new Date()): string {
    try {
        const locale = UserSettingsProtoStore.settings.localization.locale.value;
        return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "numeric", timeZone: timezone }).format(timestamp); // we hate javascript
    } catch (e) {
        return "Error"; // incase it gets invalid timezone from api, probably not gonna happen but if it does this will prevent discord from crashing
    }
}


// A map of ids and callbacks that should be triggered on fetch
const requestQueue: Record<string, ((timezone: string) => void)[]> = {};


async function bulkFetchTimezones(ids: string[]): Promise<TimezoneDB | undefined> {
    try {
        const req = await fetch(`${API_URL}/api/user/bulk`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-User-Agent": VENCORD_USER_AGENT
            },
            body: JSON.stringify(ids),
        });

        return await req.json()
            .then((res: { [userId: string]: { timezoneId: string; } | null; }) => {
                const tzs = (Object.keys(res).map(userId => {
                    return res[userId] && { [userId]: res[userId]!.timezoneId };
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

export function getUserTimezone(discordID: string, strategy: CustomTimezonePreference):
    Promise<string | undefined> {

    return new Promise(res => {
        const timezone = (DataStore.get(DATASTORE_KEY) as Promise<TimezoneDB | undefined>).then(tzs => tzs?.[discordID]);
        timezone.then(tz => {
            if (strategy === CustomTimezonePreference.Always) {
                if (tz) res(tz);
                else res(undefined);
                return;
            }

            if (tz && strategy === CustomTimezonePreference.Secondary)
                res(tz);
            else {
                if (discordID in Cache) res(Cache[discordID]);
                else if (discordID in requestQueue) requestQueue[discordID].push(res);
                // If not already added, then add it and call the debounced function to make sure the request gets executed
                else {
                    requestQueue[discordID] = [res];
                    bulkFetch();
                }
            }
        });
    });
}

const gist = "e321f856f98676505efb90aad82feff1";
const revision = "91034ee32eff93a7cb62d10702f6b1d01e0309e6";
const timezonesLink = `https://gist.githubusercontent.com/ArjixWasTaken/${gist}/raw/${revision}/timezones.json`;

export const getAllTimezones = async (): Promise<string[]> => {
    if (typeof Intl !== "undefined" && "supportedValuesOf" in Intl) {
        try {
            return Intl.supportedValuesOf("timeZone");
        } catch { }
    }

    return await fetch(timezonesLink).then(tzs => tzs.json());
};
