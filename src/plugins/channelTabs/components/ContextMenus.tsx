/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { filters, mapMangledModuleLazy } from "@webpack";
import { ChannelStore, FluxDispatcher, i18n, Menu, ReadStateStore, useState } from "@webpack/common";

import { ChannelTabsProps, ChannelTabsUtils } from "../util";

const { closeOtherTabs, closeTab, closeTabsToTheRight, toggleCompactTab } = ChannelTabsUtils;

const ReadStateUtils = mapMangledModuleLazy('"ENABLE_AUTOMATIC_ACK",', {
    markAsRead: filters.byCode(".getActiveJoinedThreadsForParent")
});

export function ChannelContextMenu({ tab }: { tab: ChannelTabsProps; }) {
    const channel = ChannelStore.getChannel(tab.channelId);
    const { openTabs } = ChannelTabsUtils;
    const [compact, setCompact] = useState(tab.compact);

    return <Menu.Menu
        navId="channeltabs-channel-context"
        onClose={() => FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" })}
        aria-label="Channel Tab Context Menu"
    >
        <Menu.MenuGroup>
            {channel &&
                <Menu.MenuItem
                    key="mark-as-read"
                    id="mark-as-read"
                    label={i18n.Messages.MARK_AS_READ}
                    disabled={!ReadStateStore.hasUnread(channel.id)}
                    action={() => ReadStateUtils.markAsRead(channel)}
                />
            }
            <Menu.MenuCheckboxItem
                checked={compact}
                key="toggle-compact-tab"
                id="toggle-compact-tab"
                label="Compact"
                action={() => {
                    setCompact(compact => !compact);
                    toggleCompactTab(tab.id);
                    FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" });
                }}
            />
        </Menu.MenuGroup>
        {openTabs.length !== 1 && <Menu.MenuGroup>
            <Menu.MenuItem
                key="close-tab"
                id="close-tab"
                label="Close Tab"
                action={() => closeTab(tab.id)}
            />
            <Menu.MenuItem
                key="close-other-tabs"
                id="close-other-tabs"
                label="Close Other Tabs"
                action={() => closeOtherTabs(tab.id)}
            />
            <Menu.MenuItem
                key="close-right-tabs"
                id="close-right-tabs"
                label="Close Tabs to the Right"
                disabled={openTabs.indexOf(tab) === openTabs.length - 1}
                action={() => closeTabsToTheRight(tab.id)}
            />
        </Menu.MenuGroup>}
    </Menu.Menu>;
}
