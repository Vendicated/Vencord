/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { FluxDispatcher } from "@webpack/common";

import { currentSearchBar } from ".";

function getScroller(): HTMLElement | null {
    return (
        document.querySelector('[data-list-id="chat-messages"]')
            ?.closest('[class*="scroller_"]') ?? null
    );
}

export const VimActions = {
    scrollDown(count: number) {
        const s = getScroller();
        s?.scrollBy({ top: 50 * count, behavior: "smooth" });
    },

    scrollUp(count: number) {
        const s = getScroller();
        s?.scrollBy({ top: -50 * count, behavior: "smooth" });
    },

    scrollTop() {
        const s = getScroller();
        if (s) s.scrollTop = 0;
    },

    scrollBottom() {
        const s = getScroller();
        if (s) s.scrollTop = s.scrollHeight;
    },

    openQuickSwitcher() {
        FluxDispatcher.dispatch({
            type: "QUICKSWITCHER_SHOW",
            query: ""
        });
    },

    openFind() {
        if (!currentSearchBar) return;
        currentSearchBar.handleFocusSearch({ prefillCurrentChannel: false });
    }
};
