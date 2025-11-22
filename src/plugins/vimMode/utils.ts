/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export function getChatScroller(): HTMLElement | null {
    const messageList = document.querySelector('[data-list-id="chat-messages"]');
    if (messageList) {
        const scroller = messageList.closest('[class*="scroller_"]');
        if (scroller) return scroller as HTMLElement;
    }
    const wrapper = document.querySelector('[class*="messagesWrapper_"]');
    if (wrapper) {
        const scroller = wrapper.querySelector('[class*="scroller_"]');
        if (scroller) return scroller as HTMLElement;
    }
    const mainContent = document.querySelector('[class*="chatContent_"]');
    if (mainContent) {
        const scroller = mainContent.querySelector('[class*="scroller_"]');
        if (scroller) return scroller as HTMLElement;
    }

    return null;
}

export function getEditor(): HTMLElement | null {
    return document.querySelector('[contenteditable="true"][role="textbox"]');
}

export function getSearchBar(): HTMLElement | null {
    return document.querySelector('[aria-label="Search"]') as HTMLElement;
}
