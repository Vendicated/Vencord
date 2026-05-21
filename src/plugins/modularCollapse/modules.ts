/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findCssClassesLazy } from "@webpack";

// ─── Module 111113 — Main Layout ───
// sidebar__5e434, guilds__5e434, panels__5e434, sidebarList__5e434, etc.
export const sidebar = findCssClassesLazy(
    "sidebar", "guilds", "panels", "sidebarList",
    "sidebarResizeHandle", "base", "content", "activityPanel"
);

// ─── Module 964623 — Chat Area ───
// chatContent_f75fb0, noChat_f75fb0, form_f75fb0, title_f75fb0, etc.
export const guilds = findCssClassesLazy(
    "chatContent", "noChat", "form", "title",
    "subtitleContainer", "threadSidebarOpen", "content"
);

// ─── Module 167881 — Toolbar / Header Icons ───
// toolbar__9293f, iconWrapper__9293f, clickable__9293f, selected__9293f, etc.
export const icons = findCssClassesLazy(
    "toolbar", "iconWrapper", "clickable", "selected",
    "icon", "container"
);

// ─── Module 266599 — Text Input Area ───
// channelTextArea__74017, attachButton__74017, buttons__74017, etc.
export const input = findCssClassesLazy(
    "channelTextArea", "attachButton", "buttons",
    "expressionPickerPositionLayer", "emojiButton"
);

// ─── Module 803921 — Guild Scroller ───
// tree_ef3116, scroller_ef3116, discoveryIcon_ef3116, wrapper_ef3116
export const scroller = findCssClassesLazy("tree", "discoveryIcon", "scroller");

// ─── Module 73045 — Members List ───
// members__6e500, memberCount__6e500, dotOnline__6e500, guildName__6e500
export const members = findCssClassesLazy("members", "memberCount", "dotOnline", "member");

// ─── Module 85486 — Search Bar (header) ───
// search_c322aa, searchBar_c322aa
export const toolbar = findCssClassesLazy("search", "searchBar");

// ─── Module 13808 — Search Results / Content Panel ───
// content_c3474d, scroller_c3474d, headerRow_c3474d, closeButton_c3474d
export const search = findCssClassesLazy("headerRow", "closeButton", "scrollerContent", "searchResultsWrap");

// ─── Module 21101 — Channel ───
export const channels = findCssClassesLazy("channel", "iconWrapper");

// ─── Modules not yet mapped (gracefully empty) ───
// These class names no longer exist in current Discord or need further inspection.
// They return empty objects so property access yields undefined (no crash).

export const panel = findCssClassesLazy("outer", "inner", "overlay");
export const frame = findCssClassesLazy("bar", "winButtons");
export const calls = findCssClassesLazy("callContainer", "fullScreen", "noChat", "wrapper");
export const social = findCssClassesLazy("inviteToolbar", "peopleColumn", "nowPlayingColumn", "tabBody");
export const user = findCssClassesLazy("nameTag", "avatarWrapper", "buttons");
export const popout = findCssClassesLazy("chatLayerWrapper", "container");
export const effects = findCssClassesLazy("profileEffects");
export const tooltip = findCssClassesLazy("menu", "caret");
export const preview = findCssClassesLazy("popout", "timestamp");
export const activity = findCssClassesLazy("itemCard", "emptyCard");
export const game = findCssClassesLazy("openOnHover", "userSection", "container");
export const callButtons = findCssClassesLazy("controlButton");
export const userAreaButtons = findCssClassesLazy("actionButtons");
export const threads = findCssClassesLazy("uploadArea", "newMemberBanner", "grid", "list", "headerRow");
export const profileWrappers = findCssClassesLazy("header", "footerButton");

// Debug helper — run __modularCollapse_modules() in Discord console
(globalThis as any).__modularCollapse_modules = () => {
    const mods: Record<string, any> = {
        sidebar, guilds, icons, input, scroller, members, toolbar,
        search, channels, panel, frame, calls, social, user, popout,
        effects, tooltip, preview, activity, game, callButtons,
        userAreaButtons, threads, profileWrappers,
    };
    for (const [name, mod] of Object.entries(mods)) {
        try {
            const keys = mod ? Object.keys(mod) : [];
            const found = keys.length > 0;
            console.log(
                `[CUI] ${name}: ${found ? "✓" : "✗"} (${keys.length} keys)`,
                found ? keys.slice(0, 8).join(", ") : "(empty)"
            );
        } catch (e) {
            console.log(`[CUI] ${name}: ✗ (error)`, e);
        }
    }
};
