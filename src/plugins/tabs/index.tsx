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

import "./tabs.css";

import { addContextMenuPatch, NavContextMenuPatchCallback, removeContextMenuPatch } from "@api/ContextMenu";
import { DataStore } from "@api/index";
import { useForceUpdater } from "@utils/react";
import definePlugin from "@utils/types";
import { Menu, NavigationRouter, ReactDOM, UserStore } from "@webpack/common";

/**
 * TODO Add middle click close tab
 * TODO Add draggable/ re-orderable tabs
 * TODO Add GDMs into tabs
 * TODO Update styling when channel is changed
 * TODO Do not allow navigation to the same channel user is currently in
 * TODO Right click on tab brings up correct context menu
 * TODO Horizontal Scroll
 */

type Tab = {
    tabName: string;
    isFavorite: boolean;
    channelId: string;
    guildId: string | null;
};

// Array of Ids
export const tabs = new Map<string, Tab>();

type ForceUpdate = undefined | (() => void);
let globalUpdateTabs: ForceUpdate;

// tabs key
const tabsKey = () => `tabs-${UserStore.getCurrentUser().id}`;

// const ChannelTypes = {
//     GUILD_CHANNEL: 0,
//     USER_CHANNEL: 1,
//     GUILD_VOICE: 2,
//     GUILD_CATEGORY: 4,
// } as const;

const ContextMenu: NavContextMenuPatchCallback = (children: unknown[], props) => () => {
    if (props.channel.type > 1) return;
    const channelId = props.channel.id;

    if (tabs.has(channelId)) return;

    async function handleAddTab() {
        tabs.set(channelId, {
            channelId: channelId,
            tabName: props.channel.name || props.user.username,
            isFavorite: false,
            guildId: props?.guild?.id ?? null,
        });

        // Persist data
        await DataStore.set(tabsKey(), tabs);

        if (globalUpdateTabs) {
            globalUpdateTabs();
        }
    }

    children.push(
        <Menu.MenuItem
            id="tabs-seomeitsodsf"
            label="Create a tab"
            action={handleAddTab}
        />
    );
};

function TabChild({ tab }: { tab: Tab; }) {
    function handleTransition() {
        const linkBase = "/channels/";
        const link = linkBase +
            (tab.guildId ? `${tab.guildId}/${tab.channelId}` : `@me/${tab.channelId}`);
        window.focus();

        NavigationRouter.transitionTo(link);
    }

    async function handleDelete() {
        tabs.delete(tab.channelId);
        // Persist data
        await DataStore.set(tabsKey(), tabs);
        if (globalUpdateTabs) {
            globalUpdateTabs();
        }
    }

    return <div
        className="tab-link"
    >
        <div onClick={handleTransition} className="tab-name">
            {tab.tabName}
        </div>
        <button onClick={handleDelete} className="tab-remove">
            x
        </button>
    </div>;
}

function TabParent() {
    globalUpdateTabs = useForceUpdater();
    return <div className="tabs-parent">
        {Array.from(tabs).map(([_id, tab]) => {
            return <TabChild tab={tab} />;
        })}
    </div>;
}

export default definePlugin({
    name: "Tabs",
    description: "Adds browser tabs to Discord",
    // TODO add devs.axu
    authors: [],
    async start() {
        const div = document.createElement("div");
        const appMount = document.querySelector("#app-mount");
        const contentDiv = document.querySelector(".appAsidePanelWrapper-ev4hlp");

        if (!div || !appMount || !contentDiv) return;

        await DataStore.set(tabsKey(), new Map());

        // Load tabs
        const storedTabs: typeof tabs = await DataStore.get(tabsKey()) || tabs;
        for (const [id, tab] of Array.from(storedTabs)) {
            tabs.set(id, tab);
        }

        // Inject before everything
        appMount.insertBefore(div, contentDiv);
        ReactDOM.render(<TabParent />, div);

        addContextMenuPatch("channel-context", ContextMenu);
        addContextMenuPatch("user-context", ContextMenu);
    },
    stop() {
        removeContextMenuPatch("channel-context", ContextMenu);
        removeContextMenuPatch("user-context", ContextMenu);
    }
});
