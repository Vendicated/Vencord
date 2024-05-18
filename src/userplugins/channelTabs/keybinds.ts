/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavigationRouter } from "@webpack/common";

import { ChannelTabsUtils } from "./util";

export default function onKey(e: KeyboardEvent) {
    const hasCtrl = e.ctrlKey || (e.metaKey && navigator.platform.includes("Mac"));

    if (hasCtrl) switch (e.key) {
        case "t":
            e.preventDefault();
            ChannelTabsUtils.createTab({ guildId: "@me", channelId: "" }, true);
            break;
        case "T":
            e.preventDefault();
            ChannelTabsUtils.reopenClosedTab();
            break;
        case "w":
            if (ChannelTabsUtils.openTabs.length <= 1) {
                NavigationRouter.transitionToGuild("@me");
                break;
            }
            e.preventDefault();
            ChannelTabsUtils.closeTab(ChannelTabsUtils.getCurrentTabId());
            break;
        case "Tab":
        case "PageUp":
        case "PageDown":
            e.preventDefault();
            const modifier = (e.key === "Tab" ? e.shiftKey : e.key === "PageUp") ? -1 : 1;
            let index = ChannelTabsUtils.openTabs.findIndex(c => c.id === ChannelTabsUtils.getCurrentTabId()) + modifier;
            if (index >= ChannelTabsUtils.openTabs.length) index = 0;
            if (index < 0) index = ChannelTabsUtils.openTabs.length - 1;
            ChannelTabsUtils.moveToTab(ChannelTabsUtils.openTabs[index].id);
            break;
        default:
            if (e.key >= "1" && e.key <= "9") {
                e.preventDefault();
                let index = Number(e.key);
                if (e.key === "9") index = ChannelTabsUtils.openTabs.length;
                if (index > ChannelTabsUtils.openTabs.length) break;
                ChannelTabsUtils.moveToTab(ChannelTabsUtils.openTabs[index - 1].id);
            }
            break;
    }
}
