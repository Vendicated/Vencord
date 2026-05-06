/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { SearchTab, TabKey } from "@plugins/dmSearch/types";

const ORDER: TabKey[] = ["all", "messages", "media", "pins", "links", "files"];

const LABELS: Record<TabKey, string> = {
    all: "All",
    messages: "Messages",
    media: "Media",
    pins: "Pins",
    links: "Links",
    files: "Files"
};

interface Props {
    query: string;
    totals: Record<SearchTab, number>;
    loading: boolean;
    active: TabKey;
    on_pick: (tab: TabKey) => void;
}

export function Tabs({ query, totals, loading, active, on_pick }: Props) {
    if (!query) return null;

    const visible = ORDER.filter(t => t === "all" || totals[t] > 0);
    const tabs_with_hits = visible.length - 1;
    if (!tabs_with_hits && !loading) return null;

    const all_total = (Object.keys(totals) as SearchTab[]).reduce((sum, t) => sum + totals[t], 0);

    return (
        <div className="vc-dms-tabs">
            {visible.map(tab => {
                const count = tab === "all" ? all_total : totals[tab];
                const is_active = tab === active;
                return (
                    <button
                        key={tab}
                        type="button"
                        className={"vc-dms-tab" + (is_active ? " vc-dms-tab-active" : "")}
                        onClick={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            on_pick(tab);
                        }}
                    >
                        <span>{LABELS[tab]}</span>
                        {tab !== "all" && <span className="vc-dms-tab-count">{count}</span>}
                    </button>
                );
            })}
            {loading && (
                <span className="vc-dms-loading-dots">
                    <span /><span /><span />
                </span>
            )}
        </div>
    );
}
