/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as m from "./modules";

/** Try querySelector with class, fall back to attribute/structural selector */
function q(classVal: string | undefined, fallback?: string): Element | null {
    if (classVal) {
        const el = document.querySelector(`.${classVal}`);
        if (el) return el;
    }
    return fallback ? document.querySelector(fallback) : null;
}

export function getInviteToolbar(): Element | null {
    return q(m.social?.inviteToolbar);
}

export function getSearchBar(): Element | null {
    return q(m.toolbar?.search, '[class*="search_"][class*="searchBar"]');
}

export function getToolbar(): Element | null {
    return q(m.icons?.toolbar, '[class*="toolbar_"]');
}

export function getMembersList(): Element | null {
    // Old: membersWrap → Now: "members" in module 73045
    return q(m.members?.members, '[class*="members_"]');
}

export function getUserProfile(): Element | null {
    if (m.guilds?.content && m.panel?.inner)
        return document.querySelector(`.${m.guilds.content} .${m.panel.inner}`);
    return document.querySelector('[class*="userProfile_"]');
}

export function getMessageInput(): Element | null {
    return q(m.guilds?.form, 'form[class*="form_"]');
}

export function getWindowBar(): Element | null {
    return q(m.frame?.bar, '[class*="titleBar"]');
}

export function getCallWindow(): Element | null {
    if (m.calls?.callContainer)
        return document.querySelector(`.${m.calls.callContainer}`);
    return document.querySelector('[class*="callContainer"]');
}

export function getSettingsContainer(): Element | null {
    const selector = m.user?.buttons
        ? `.${m.user.buttons}`
        : '[class*="actionButtons"]';
    const all = document.querySelectorAll(selector);
    return all.length > 0 ? all[all.length - 1] : null;
}

export function getMessageInputContainer(): Element | null {
    const selector = m.input?.buttons
        ? `.${m.input.buttons}`
        : '[class*="buttons_"][class*="__74017"]';
    const all = document.querySelectorAll(selector);
    return all.length > 0 ? all[all.length - 1] : null;
}

export function getForumPopout(): Element | null {
    return q(m.popout?.chatLayerWrapper, '[class*="chatLayerWrapper"]');
}

export function getBiteSizePanel(): Element | null {
    if (m.panel?.outer)
        return document.querySelector(`[role="dialog"] .${m.panel.outer}`);
    return null;
}

export function getUserArea(): Element | null {
    return q(m.sidebar?.panels, '[class*="panels_"]');
}

export function getServerList(): Element | null {
    return q(m.sidebar?.guilds,
        '[data-list-id="guildsnav"]') ?? document.querySelector('[class*="guilds_"]');
}

export function getChannelList(): Element | null {
    return q(m.sidebar?.sidebarList, '[class*="sidebarList_"]');
}

export function getRightClickMenu(): Element | null {
    return q(m.tooltip?.menu, '[class*="menu_"]');
}

export function getForumPreviewTooltip(): Element | null {
    return q(m.preview?.popout);
}

export function getSearchPanel(): Element | null {
    return q(m.search?.searchResultsWrap, '[class*="searchResult"]');
}

export function getActivityPanel(): Element | null {
    // Old: nowPlayingColumn → Now: activityPanel in sidebar module
    return q(m.social?.nowPlayingColumn) ?? q(m.sidebar?.activityPanel);
}

export function getChatWrapper(): Element | null {
    return q(m.guilds?.content, '[class*="content_"][class*="f75fb0"]');
}

export function getNoChat(): Element | null {
    return q(m.guilds?.noChat, '[class*="noChat_"]');
}

export function getExpressionPicker(): Element | null {
    return q(m.input?.expressionPickerPositionLayer);
}

/** Returns all 11 panel elements in index order */
export function getAllPanels(): (Element | null)[] {
    return [
        getServerList(),
        getChannelList(),
        getMembersList(),
        getUserProfile(),
        getMessageInput(),
        getWindowBar(),
        getCallWindow(),
        getUserArea(),
        getSearchPanel(),
        getForumPopout(),
        getActivityPanel(),
    ];
}
