/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { VENCORD_USER_AGENT } from "@shared/vencordUserAgent";
import { Logger } from "@utils/Logger";

import settings from "./settings";

export type Snowflake = string;
type ApiError = { error: string; };
type UserFetchResponse = ApiError | { timezoneId: string }
type BulkFetchResponse = ApiError | Record<Snowflake, { timezoneId: string | null }>;

export async function fetchTimezonesBulk(ids: Snowflake[]): Promise<Record<Snowflake, string | null> | undefined> {
    try {
        const { apiUrl } = settings.store;
        const req = await fetch(`${apiUrl}/user/bulk`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-User-Agent": VENCORD_USER_AGENT,
            },
            body: JSON.stringify(ids),
        });

        const json: BulkFetchResponse = await req.json();
        if ("error" in json) throw "API Error: " + json.error;

        const parsed: Record<Snowflake, string | null> = {};

        for (const userId of Object.keys(json)) {
            parsed[userId] = json[userId]?.timezoneId ?? null;
        }

        return parsed;
    } catch (e) {
        new Logger("Timezones").error("Failed to fetch timezones bulk: ", e);
    }
}

export async function fetchTimezone(userId: Snowflake): Promise<string | null | undefined> {
    try {
        const { apiUrl } = settings.store;
        const req = await fetch(`${apiUrl}/user/${userId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "X-User-Agent": VENCORD_USER_AGENT,
            },
        });

        const json: UserFetchResponse = await req.json();

        if ("error" in json) {
            if (json.error === "not_found") return null;

            throw "API Error: " + json.error;
        }

        return json.timezoneId;
    } catch (e) {
        new Logger("Timezones").error("Failed to fetch user timezone: ", e);
        return undefined;
    }
}
