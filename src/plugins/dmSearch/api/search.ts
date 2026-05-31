/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { HARD_LIMIT } from "@plugins/dmSearch/constants";
import { settings } from "@plugins/dmSearch/settings";
import {
    ChannelMeta,
    HasFilter,
    MessageHit,
    SearchCursor,
    SearchTab,
    SearchTabsBody,
    SearchTabsResponse,
    TabRequest,
    TabResult,
    TabResults
} from "@plugins/dmSearch/types";
import { RestAPI } from "@webpack/common";

const ENDPOINT = "/users/@me/messages/search/tabs";

const TAB_FILTERS: Record<SearchTab, { has?: HasFilter[]; pinned?: boolean; }> = {
    messages: {},
    media: { has: ["image", "video"] },
    pins: { pinned: true },
    links: { has: ["link"] },
    files: { has: ["file"] }
};

let in_flight: AbortController | null = null;

interface RunOpts {
    query: string;
    tabs: SearchTab[];
    cursors?: Partial<Record<SearchTab, SearchCursor | null>>;
    abort?: AbortSignal;
}

async function run(opts: RunOpts): Promise<TabResults> {
    const sort: TabRequest["sort_by"] = settings.store.sortBy === "relevance" ? "relevance" : "timestamp";
    const limit = Math.min(settings.store.limit, HARD_LIMIT);

    const body: SearchTabsBody = { tabs: {}, track_exact_total_hits: false };
    for (const tab of opts.tabs) {
        const req: TabRequest = {
            sort_by: sort,
            sort_order: "desc",
            content: opts.query,
            cursor: opts.cursors?.[tab] ?? null,
            limit
        };
        const filter = TAB_FILTERS[tab];
        if (filter.has) req.has = filter.has;
        if (filter.pinned) req.pinned = true;
        body.tabs[tab] = req;
    }

    try {
        const res = await RestAPI.post({
            url: ENDPOINT,
            body: body as unknown as Record<string, unknown>,
            oldFormErrors: true,
            signal: opts.abort
        } as Parameters<typeof RestAPI.post>[0]);

        const data = res.body as SearchTabsResponse;
        const out = empty_results(opts.tabs);
        for (const tab of opts.tabs) {
            const td = data.tabs?.[tab];
            const raw = (td?.messages?.flat?.() ?? []) as MessageHit[];
            out[tab] = {
                hits: raw,
                cursor: td?.cursor ?? null,
                total_results: td?.total_results ?? raw.length
            };
            for (const c of td?.channels ?? []) {
                if (!out.channels.has(c.id)) out.channels.set(c.id, c);
            }
        }
        return out;
    } catch {
        return empty_results(opts.tabs);
    }
}

export async function search(query: string, tabs: SearchTab[]): Promise<TabResults> {
    in_flight?.abort();
    const ctl = new AbortController();
    in_flight = ctl;
    try {
        return await run({ query, tabs, abort: ctl.signal });
    } finally {
        if (in_flight === ctl) in_flight = null;
    }
}

export async function load_page(query: string, tab: SearchTab, cursor: SearchCursor | null): Promise<TabResult> {
    const r = await run({ query, tabs: [tab], cursors: { [tab]: cursor } });
    return r[tab];
}

function empty_results(tabs: SearchTab[]): TabResults {
    const out = { channels: new Map<string, ChannelMeta>() } as TabResults;
    for (const tab of tabs) out[tab] = { hits: [], cursor: null, total_results: 0 };
    return out;
}
