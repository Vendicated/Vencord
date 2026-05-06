/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { get_scroll, save_scroll } from "@plugins/dmSearch/state";
import { ChannelMeta, MessageHit } from "@plugins/dmSearch/types";
import { ReactDOM, useEffect, useState } from "@webpack/common";

import { HitRow } from "./HitRow";

const SCROLLER_SELECTOR = "[class^='quickswitcher_'] [class^='resultsArea_'] [class^='scroller_']";
const SCROLL_DEBOUNCE_MS = 150;

interface Props {
    query: string;
    hits: MessageHit[];
    total: number;
    limit: number;
    channels: Map<string, ChannelMeta>;
    on_show_all: () => void;
    on_keep_open: () => void;
}

export function InlinePreview({ query, hits, total, limit, channels, on_show_all, on_keep_open }: Props) {
    const [target, set_target] = useState<HTMLElement | null>(null);

    useEffect(() => {
        let canceled = false;
        let attempts = 0;
        const find = () => {
            if (canceled) return;
            const node = document.querySelector(SCROLLER_SELECTOR) as HTMLElement | null;
            if (node) {
                set_target(node);
                const saved = get_scroll("all");
                if (saved > 0) requestAnimationFrame(() => { node.scrollTop = saved; });
                return;
            }
            if (++attempts < 20) window.setTimeout(find, 50);
        };
        find();
        return () => { canceled = true; };
    }, []);

    useEffect(() => {
        if (!target) return;
        let timer: number | null = null;
        const on_scroll = () => {
            if (timer != null) clearTimeout(timer);
            timer = window.setTimeout(() => save_scroll("all", target.scrollTop), SCROLL_DEBOUNCE_MS);
        };
        target.addEventListener("scroll", on_scroll, { passive: true });
        return () => {
            target.removeEventListener("scroll", on_scroll);
            if (timer != null) clearTimeout(timer);
        };
    }, [target]);

    if (!hits.length || !target) return null;
    const shown = hits.slice(0, limit);

    return ReactDOM.createPortal(
        <div className="vc-dms-inline">
            <div className="vc-dms-section-header">
                <span className="vc-dms-section-title">Messages</span>
                <span className="vc-dms-section-count">{total}</span>
            </div>
            <div className="vc-dms-list vc-dms-list-inline">
                {shown.map(hit => (
                    <HitRow
                        key={hit.id}
                        hit={hit}
                        query={query}
                        tab="messages"
                        channel_meta={channels.get(hit.channel_id)}
                        on_keep_open={on_keep_open}
                    />
                ))}
            </div>
            {total > shown.length && (
                <button
                    type="button"
                    className="vc-dms-more"
                    onClick={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        on_show_all();
                    }}
                >
                    Show all {total} messages
                </button>
            )}
        </div>,
        target
    );
}
