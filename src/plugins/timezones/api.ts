/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { VENCORD_USER_AGENT } from "@shared/vencordUserAgent";
import { Logger } from "@utils/Logger";
import { UserStore } from "@webpack/common";

import settings from "./settings";

export const API_URL: string = "https://timezonedb.catvibers.me/api";

export type Snowflake = string;
type ApiError = { error: string; };
type UserFetchResponse = ApiError | { timezoneId: string }
type BulkFetchResponse = ApiError | Record<Snowflake, { timezoneId: string | null }>;

export async function verifyLogin(token: string): Promise<boolean> {
    const res = await fetch(API_URL, {
        method: "GET",
        headers: {
            "User-Agent": VENCORD_USER_AGENT,
            "Authorization": token,
        },
    });

    const json: { logged_in?: boolean } = await res.json();
    return !!json.logged_in;
}

export async function fetchTimezonesBulk(ids: Snowflake[]): Promise<Record<Snowflake, string | null> | undefined> {
    try {
        const req = await fetch(`${API_URL}/user/bulk`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "User-Agent": VENCORD_USER_AGENT,
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
        const req = await fetch(`${API_URL}/user/${userId}`, {
            method: "GET",
            headers: {
                "User-Agent": VENCORD_USER_AGENT,
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

export function getCurrentToken(): string | undefined {
    const userId = UserStore.getCurrentUser().id;
    const { tokens } = settings.store;

    return tokens[userId];
}
