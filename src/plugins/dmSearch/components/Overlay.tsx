/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { search } from "@plugins/dmSearch/api/search";
import { DEBOUNCE_MS, MIN_QUERY_LENGTH, SEARCHABLE_TABS } from "@plugins/dmSearch/constants";
import { settings } from "@plugins/dmSearch/settings";
import { load_session, save_session } from "@plugins/dmSearch/state";
import { Bag, MessageHit, SearchCursor, SearchTab, TabKey } from "@plugins/dmSearch/types";
import { FluxDispatcher, useCallback, useEffect, useRef, useState } from "@webpack/common";
import type { ReactNode } from "react";

import { InlinePreview } from "./InlinePreview";
import { TabContent } from "./TabContent";
import { Tabs } from "./Tabs";

interface Props {
    query: string;
    discord_matches: number;
    default_results: ReactNode;
    protip: ReactNode;
    tutorial: ReactNode;
}

const empty_bag = (): Bag => ({
    hits: { messages: [], media: [], pins: [], links: [], files: [] },
    cursors: { messages: null, media: null, pins: null, links: null, files: null },
    totals: { messages: 0, media: 0, pins: 0, links: 0, files: 0 },
    channels: new Map()
});

function take_initial() {
    if (!settings.store.restoreLastSession) return null;
    return load_session();
}

export function Overlay({ query: raw_query, discord_matches, default_results, protip, tutorial }: Props) {
    const { sortBy, limit } = settings.use(["sortBy", "limit"]);
    const live_query = raw_query.trim();
    const [shadow, set_shadow] = useState<string>(() => take_initial()?.query ?? "");
    const [tab, set_tab] = useState<TabKey>(() => take_initial()?.tab ?? "all");
    const [loading, set_loading] = useState(false);
    const [bag, set_bag] = useState<Bag>(() => take_initial()?.bag ?? empty_bag());
    const auto_switched = useRef(false);
    const restored_query = useRef<string | null>(shadow || null);

    useEffect(() => {
        if (!shadow) return;
        window.setTimeout(() => {
            try {
                FluxDispatcher.dispatch({ type: "QUICKSWITCHER_SEARCH", query: shadow, queryMode: null });
            } catch { }
        }, 80);
    }, []);

    useEffect(() => {
        if (live_query.length > 0 && shadow) set_shadow("");
    }, [live_query, shadow]);

    const query = live_query || shadow;

    useEffect(() => {
        if (query.length < MIN_QUERY_LENGTH) {
            if (restored_query.current !== null) return;
            set_bag(empty_bag());
            set_loading(false);
            set_tab("all");
            auto_switched.current = false;
            return;
        }

        if (restored_query.current === query) {
            restored_query.current = null;
            return;
        }
        restored_query.current = null;

        auto_switched.current = false;
        let cancelled = false;
        set_loading(true);

        const handle = window.setTimeout(async () => {
            const result = await search(query, SEARCHABLE_TABS);
            if (cancelled) return;

            const next = empty_bag();
            for (const t of SEARCHABLE_TABS) {
                next.hits[t] = result[t].hits;
                next.cursors[t] = result[t].cursor;
                next.totals[t] = result[t].total_results;
            }
            next.channels = result.channels;
            set_bag(next);
            set_loading(false);
        }, DEBOUNCE_MS);

        return () => {
            cancelled = true;
            clearTimeout(handle);
        };
    }, [query, sortBy, limit]);

    useEffect(() => {
        if (!settings.store.autoOpenMessagesTab) return;
        if (auto_switched.current) return;
        if (loading) return;
        if (bag.hits.messages.length === 0) return;
        if (discord_matches > 0) return;
        auto_switched.current = true;
        set_tab("messages");
    }, [discord_matches, bag.hits.messages.length, loading]);

    useEffect(() => {
        if (!settings.store.restoreLastSession) return;
        if (query.length < MIN_QUERY_LENGTH) return;
        const has_data = SEARCHABLE_TABS.some(t => bag.hits[t].length > 0);
        if (!has_data) return;
        save_session(query, tab, bag);
    }, [query, tab, bag]);

    const append_page = useCallback((t: SearchTab, more: MessageHit[], next_cursor: SearchCursor | null) => {
        set_bag(prev => ({
            ...prev,
            hits: { ...prev.hits, [t]: [...prev.hits[t], ...more] },
            cursors: { ...prev.cursors, [t]: next_cursor }
        }));
    }, []);

    const pick_tab = useCallback((t: TabKey) => {
        auto_switched.current = true;
        set_tab(t);
    }, []);

    const lock_query_ref = useRef<() => void>(() => { });
    lock_query_ref.current = () => {
        if (query) set_shadow(query);
    };
    const lock_query = useCallback(() => lock_query_ref.current(), []);

    if (tab === "all") {
        return (
            <>
                <Tabs query={query} totals={bag.totals} loading={loading} active={tab} on_pick={pick_tab} />
                {default_results}
                {settings.store.showInlinePreview && query && bag.totals.messages > 0 && (
                    <InlinePreview
                        query={query}
                        hits={bag.hits.messages}
                        total={bag.totals.messages}
                        limit={settings.store.inlinePreviewLimit}
                        channels={bag.channels}
                        on_show_all={() => pick_tab("messages")}
                        on_keep_open={lock_query}
                    />
                )}
                {protip}
                {tutorial}
            </>
        );
    }

    const focused = tab as SearchTab;
    return (
        <>
            <Tabs query={query} totals={bag.totals} loading={loading} active={tab} on_pick={pick_tab} />
            <TabContent
                tab={focused}
                query={query}
                hits={bag.hits[focused]}
                cursor={bag.cursors[focused]}
                loading={loading}
                channels={bag.channels}
                on_more={append_page}
                on_keep_open={lock_query}
            />
            {tutorial}
        </>
    );
}
