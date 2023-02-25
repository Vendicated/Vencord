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

import { Settings } from "@api/settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { find, findByProps } from "@webpack";
import { FluxDispatcher } from "@webpack/common";

import FolderSideBar from "./FolderSideBar";

export default definePlugin({
    name: "BetterFolders",
    description: "Shows server folders on dedicated sidebar and adds folder related improvements",
    authors: [Devs.juby],
    patches: [
        {
            find: "(\"guildsnav\")",
            predicate: () => Settings.plugins.BetterFolders.sidebar,
            replacement: [
                {
                    match: /(\w{1,3})\(\){return \w{1,3}\(\(0,\i\.jsx\)\("div",{className:\w{1,3}\(\)\.guildSeparator}\)\)}/,
                    replace: "$&$self.Separator=$1;"
                },

                // BEGIN Folder component patch
                {
                    match: /\i=(\i)\.folderIconContent,\i=\i\.id,\i=\i\.name,/,
                    replace: "$&bfHideServers=$1.bfHideServers,"
                },
                {
                    match: /\w{1,3}\(\(function\(\i,\i,\i\){var \i=\i\.key;return.+\(\i\)},\i\)}\)\)/,
                    replace: "bfHideServers?null:$&"
                },
                // END

                // BEGIN Guilds component patch
                {
                    match: /(\i)\.themeOverride,(.{15,25}\(function\(\){var \i=)(\w{1,3}\.\i\.getGuildsTree\(\))/,
                    replace: "$1.themeOverride,bfPatch=$1.bfGuildFolders,$2bfPatch?$self.getGuildsTree(bfPatch,$3):$3"
                },
                {
                    match: /\((\i)\)({switch\(\i\.type\){case \w{1,3}\.\w{1,3}\.FOLDER)/,
                    replace: "($1,bfIndex)$2"
                },
                {
                    match: /return(\(0,\i\.jsx\))(\(\w{1,3},{)(folderNode:\i,setNodeRef:\i\.setNodeRef,draggable:!0,.+},\i\.id\));case/,
                    replace: "var folder=$1$2bfHideServers:!bfPatch,$3;return bfPatch&&bfIndex?[$1($self.Separator,{}),folder]:folder;case"
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
            predicate: () => Settings.plugins.BetterFolders.sidebar,
            replacement: {
                match: /(\(0,\i\.jsx\))\(.{1,3}\..,{className:.{1,3}\(\)\.guilds,themeOverride:\i}\)/,
                replace: "$&,$1($self.FolderSideBar($self),{})"
            }
        },
        {
            find: "(\"guildsnav\")",
            predicate: () => Settings.plugins.BetterFolders.closeAllHomeButton,
            replacement: {
                match: ",onClick:function(){if(!__OVERLAY__){",
                replace: "$&$self.closeFolders();"
            }
        }
    ],

    options: {
        sidebar: {
            type: OptionType.BOOLEAN,
            description: "Display servers from folder on dedicated sidebar",
            default: true,
        },
        sidebarAnim: {
            type: OptionType.BOOLEAN,
            description: "Folder sidebar animation",
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
    },

    start() {
        const GuildFolderStore = findByProps("getSortedGuilds");
        const ExpandedFolderStore = findByProps("getExpandedFolders");
        const { toggleGuildFolderExpand } = findByProps("move", "toggleGuildFolderExpand");
        const getGuildFolderIdx = id => GuildFolderStore.guildFolders.findIndex(e => e.guildIds.indexOf(id) !== -1);
        const getGuildFolder = id => GuildFolderStore.guildFolders[getGuildFolderIdx(id)];

        this.closeFolders = () => {
            const expandedFolders = ExpandedFolderStore.getExpandedFolders();
            for (const id of expandedFolders) toggleGuildFolderExpand(id);
        };

        const { closeAllFolders, closeOthers, forceOpen } = Settings.plugins.BetterFolders;
        if (closeAllFolders || forceOpen) FluxDispatcher.subscribe("CHANNEL_SELECT", this.onSwitch = data => {
            if (this.lastGuildId !== data.guildId) {
                this.lastGuildId = data.guildId;
                const guildFolder = getGuildFolder(data.guildId);
                if (guildFolder?.folderId) {
                    if (forceOpen && !ExpandedFolderStore.isFolderExpanded(guildFolder.folderId))
                        toggleGuildFolderExpand(guildFolder.folderId);
                } else if (closeAllFolders) this.closeFolders();
            }
        });
        if (closeOthers) FluxDispatcher.subscribe("TOGGLE_GUILD_FOLDER_EXPAND", this.onToggleFolder = e => {
            if (!this.dispatching) FluxDispatcher.wait(() => {
                const expandedFolders = ExpandedFolderStore.getExpandedFolders();
                if (expandedFolders.size > 1) {
                    this.dispatching = true;
                    for (const id of expandedFolders) if (id !== e.folderId) toggleGuildFolderExpand(id);
                    this.dispatching = false;
                }
            });
        });
    },
    stop() {
        if (this.onSwitch) FluxDispatcher.unsubscribe("CHANNEL_SELECT", this.onSwitch);
        if (this.onToggleFolder) FluxDispatcher.unsubscribe("TOGGLE_GUILD_FOLDER_EXPAND", this.onToggleFolder);
    },

    FolderSideBar: FolderSideBar,
    getGuildsTree: function (folders, oldTree) {
        if (!this.GuildsTree) this.GuildsTree = find(m => m.prototype?.convertToFolder);
        const tree = new this.GuildsTree;
        tree.root.children = oldTree.root.children.filter(e => folders.includes(e.id));
        tree.nodes = folders.map(id => oldTree.nodes[id]);
        return tree;
    },
});
