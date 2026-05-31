/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { load_page } from "@plugins/dmSearch/api/search";
import { SCROLL_GAP_PX, SCROLL_SAVE_MS } from "@plugins/dmSearch/constants";
import { get_scroll, save_scroll } from "@plugins/dmSearch/state";
import { ChannelMeta, MessageHit, SearchCursor, SearchTab } from "@plugins/dmSearch/types";
import { useEffect, useRef, useState } from "@webpack/common";

import { HitRow } from "./HitRow";

const EMPTY_TEXT: Record<SearchTab, string> = {
    messages: "No matching messages.",
    media: "No matching images or videos.",
    pins: "No pinned messages match this search.",
    links: "No messages contain a matching link.",
    files: "No matching file attachments."
};

interface Props {
    tab: SearchTab;
    query: string;
    hits: MessageHit[];
    cursor: SearchCursor | null;
    loading: boolean;
    channels: Map<string, ChannelMeta>;
    on_more: (tab: SearchTab, more: MessageHit[], next: SearchCursor | null) => void;
    on_keep_open: () => void;
}

export function TabContent({ tab, query, hits, cursor, loading, channels, on_more, on_keep_open }: Props) {
    const scroller = useRef<HTMLDivElement>(null);
    const [paging, set_paging] = useState(false);

    useEffect(() => {
        const node = scroller.current;
        if (!node) return;
        const saved = get_scroll(tab);
        if (saved > 0) requestAnimationFrame(() => { node.scrollTop = saved; });
    }, [tab]);

    useEffect(() => {
        const node = scroller.current;
        if (!node) return;
        let save_timer: number | null = null;

        const handler = () => {
            if (save_timer != null) clearTimeout(save_timer);
            save_timer = window.setTimeout(() => save_scroll(tab, node.scrollTop), SCROLL_SAVE_MS);

            if (paging || !cursor) return;
            const { scrollTop, scrollHeight, clientHeight } = node;
            if (scrollHeight - scrollTop - clientHeight > SCROLL_GAP_PX) return;

            set_paging(true);
            const captured = query;
            void (async () => {
                const next = await load_page(query, tab, cursor);
                if (captured === query) on_more(tab, next.hits, next.cursor);
                set_paging(false);
            })();
        };

        node.addEventListener("scroll", handler, { passive: true });
        return () => {
            node.removeEventListener("scroll", handler);
            if (save_timer != null) clearTimeout(save_timer);
        };
    }, [tab, query, cursor, paging, on_more]);

    if (loading && !hits.length) {
        return (
            <div className="vc-dms-content">
                <div className="vc-dms-loading">
                    Searching
                    <Dots />
                </div>
            </div>
        );
    }

    if (!hits.length) {
        return (
            <div className="vc-dms-content">
                <div className="vc-dms-empty">{EMPTY_TEXT[tab]}</div>
            </div>
        );
    }

    return (
        <div ref={scroller} className="vc-dms-content">
            <div className="vc-dms-list">
                {hits.map(hit => (
                    <HitRow
                        key={hit.id}
                        hit={hit}
                        query={query}
                        tab={tab}
                        channel_meta={channels.get(hit.channel_id)}
                        on_keep_open={on_keep_open}
                    />
                ))}
            </div>
            {paging
                ? (
                    <div className="vc-dms-loading">
                        Loading more
                        <Dots />
                    </div>
                )
                : !cursor && hits.length > 0 && <div className="vc-dms-end">End of results</div>
            }
        </div>
    );
}

export function Dots() {
    return (
        <span className="vc-dms-loading-dots">
            <span /><span /><span />
        </span>
    );
}
