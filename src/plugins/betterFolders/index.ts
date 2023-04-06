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

import "./betterFolders.css";

import { definePluginSettings } from "@api/settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy, findLazy, findStoreLazy } from "@webpack";
import { FluxDispatcher } from "@webpack/common";

import FolderSideBar from "./FolderSideBar";

const GuildsTree = findLazy(m => m.prototype?.convertToFolder);
const GuildFolderStore = findStoreLazy("SortedGuildStore");
const ExpandedFolderStore = findStoreLazy("ExpandedGuildFolderStore");
const FolderUtils = findByPropsLazy("move", "toggleGuildFolderExpand");

const settings = definePluginSettings({
    sidebar: {
        type: OptionType.BOOLEAN,
        description: "Display servers from folder on dedicated sidebar",
        default: true,
    },
    sidebarAnim: {
        type: OptionType.BOOLEAN,
        description: "Animate opening the folder sidebar",
        default: true,
    },
    closeAllFolders: {
        type: OptionType.BOOLEAN,
        description: "Close all folders when selecting a server not in a folder",
        default: false,
    },
    closeAllHomeButton: {
        type: OptionType.BOOLEAN,
        description: "Close all folders when clicking on the home button",
        default: false,
    },
    closeOthers: {
        type: OptionType.BOOLEAN,
        description: "Close other folders when opening a folder",
        default: false,
    },
    forceOpen: {
        type: OptionType.BOOLEAN,
        description: "Force a folder to open when switching to a server of that folder",
        default: false,
    },
});

export default definePlugin({
    name: "BetterFolders",
    description: "Shows server folders on dedicated sidebar and adds folder related improvements",
    authors: [Devs.juby, Devs.AutumnVN],
    patches: [
        {
            find: '("guildsnav")',
            predicate: () => settings.store.sidebar,
            replacement: [
                {
                    match: /(\i)\(\){return \i\(\(0,\i\.jsx\)\("div",{className:\i\(\)\.guildSeparator}\)\)}/,
                    replace: "$&$self.Separator=$1;"
                },

                // Folder component patch
                {
                    match: /\i\(\(function\(\i,\i,\i\){var \i=\i\.key;return.+\(\i\)},\i\)}\)\)/,
                    replace: "arguments[0].bfHideServers?null:$&"
                },

                // BEGIN Guilds component patch
                {
                    match: /(\i)\.themeOverride,(.{15,25}\(function\(\){var \i=)(\i\.\i\.getGuildsTree\(\))/,
                    replace: "$1.themeOverride,bfPatch=$1.bfGuildFolders,$2bfPatch?$self.getGuildsTree(bfPatch,$3):$3"
                },
                {
                    match: /return(\(0,\i\.jsx\))(\(\i,{)(folderNode:\i,setNodeRef:\i\.setNodeRef,draggable:!0,.+},\i\.id\));case/,
                    replace: "var bfHideServers=typeof bfPatch==='undefined',folder=$1$2bfHideServers,$3;return !bfHideServers&&arguments[1]?[$1($self.Separator,{}),folder]:folder;case"
                },
                // END

                {
                    match: /\("guildsnav"\);return\(0,\i\.jsx\)\(.{1,6},{navigator:\i,children:\(0,\i\.jsx\)\(/,
                    replace: "$&$self.Guilds="
                }
            ]
        },
        {
            find: "APPLICATION_LIBRARY,render",
            predicate: () => settings.store.sidebar,
            replacement: {
                match: /(\(0,\i\.jsx\))\(\i\..,{className:\i\(\)\.guilds,themeOverride:\i}\)/,
                replace: "$&,$1($self.FolderSideBar,{})"
            }
        },
        {
            find: '("guildsnav")',
            predicate: () => settings.store.closeAllHomeButton,
            replacement: {
                match: ",onClick:function(){if(!__OVERLAY__){",
                replace: "$&$self.closeFolders();"
            }
        }
    ],

    settings,

    start() {
        const getGuildFolder = (id: string) => GuildFolderStore.getGuildFolders().find(f => f.guildIds.includes(id));

        FluxDispatcher.subscribe("CHANNEL_SELECT", this.onSwitch = data => {
            if (!settings.store.closeAllFolders && !settings.store.forceOpen)
                return;

            if (this.lastGuildId !== data.guildId) {
                this.lastGuildId = data.guildId;

                const guildFolder = getGuildFolder(data.guildId);
                if (guildFolder?.folderId) {
                    if (settings.store.forceOpen && !ExpandedFolderStore.isFolderExpanded(guildFolder.folderId))
                        FolderUtils.toggleGuildFolderExpand(guildFolder.folderId);
                } else if (settings.store.closeAllFolders)
                    this.closeFolders();
            }
        });

        FluxDispatcher.subscribe("TOGGLE_GUILD_FOLDER_EXPAND", this.onToggleFolder = e => {
            if (settings.store.closeOthers && !this.dispatching)
                FluxDispatcher.wait(() => {
                    const expandedFolders = ExpandedFolderStore.getExpandedFolders();
                    if (expandedFolders.size > 1) {
                        this.dispatching = true;

                        for (const id of expandedFolders) if (id !== e.folderId)
                            FolderUtils.toggleGuildFolderExpand(id);

                        this.dispatching = false;
                    }
                });
        });
    },

    stop() {
        FluxDispatcher.unsubscribe("CHANNEL_SELECT", this.onSwitch);
        FluxDispatcher.unsubscribe("TOGGLE_GUILD_FOLDER_EXPAND", this.onToggleFolder);
    },

    FolderSideBar,

    getGuildsTree(folders, oldTree) {
        const tree = new GuildsTree();
        tree.root.children = oldTree.root.children.filter(e => folders.includes(e.id));
        tree.nodes = folders.map(id => oldTree.nodes[id]);
        return tree;
    },

    closeFolders() {
        for (const id of ExpandedFolderStore.getExpandedFolders())
            FolderUtils.toggleGuildFolderExpand(id);
    },
});
