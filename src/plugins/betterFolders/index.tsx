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

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy, findStoreLazy } from "@webpack";
import { FluxDispatcher, i18n } from "@webpack/common";

import FolderSideBar from "./FolderSideBar";

const GuildFolderStore = findStoreLazy("SortedGuildStore");
export const ExpandedGuildFolderStore = findStoreLazy("ExpandedGuildFolderStore");
const FolderUtils = findByPropsLazy("move", "toggleGuildFolderExpand");

let lastGuildId = null as string | null;
let dispatchingFoldersClose = false;

function getGuildFolder(id: string) {
    return GuildFolderStore.getGuildFolders().find(folder => folder.guildIds.includes(id));
}

function closeFolders() {
    for (const id of ExpandedGuildFolderStore.getExpandedFolders())
        FolderUtils.toggleGuildFolderExpand(id);
}

export const settings = definePluginSettings({
    sidebar: {
        type: OptionType.BOOLEAN,
        description: "Display servers from folder on dedicated sidebar",
        restartNeeded: true,
        default: true
    },
    sidebarAnim: {
        type: OptionType.BOOLEAN,
        description: "Animate opening the folder sidebar",
        restartNeeded: true,
        default: true
    },
    closeAllFolders: {
        type: OptionType.BOOLEAN,
        description: "Close all folders when selecting a server not in a folder",
        default: false
    },
    closeAllHomeButton: {
        type: OptionType.BOOLEAN,
        description: "Close all folders when clicking on the home button",
        restartNeeded: true,
        default: false
    },
    closeOthers: {
        type: OptionType.BOOLEAN,
        description: "Close other folders when opening a folder",
        default: false
    },
    forceOpen: {
        type: OptionType.BOOLEAN,
        description: "Force a folder to open when switching to a server of that folder",
        default: false
    },
    keepIcons: {
        type: OptionType.BOOLEAN,
        description: "Keep showing guild icons in the primary guild bar folder when it's open in the BetterFolders sidebar",
        restartNeeded: true,
        default: false
    }
});

export default definePlugin({
    name: "BetterFolders",
    description: "Shows server folders on dedicated sidebar and adds folder related improvements",
    authors: [Devs.juby, Devs.AutumnVN, Devs.Nuckyz],

    settings,

    patches: [
        {
            find: '("guildsnav")',
            predicate: () => settings.store.sidebar,
            replacement: [
                // Create the isBetterFolders variable in the GuildsBar component
                {
                    match: /(?<=let{disableAppDownload:\i=\i\.isPlatformEmbedded,isOverlay:.+?)(?=}=\i,)/,
                    replace: ",isBetterFolders"
                },
                // If we are rendering the Better Folders sidebar, we filter out everything but the servers and folders from the GuildsBar Guild List children
                {
                    match: /lastTargetNode:\i\[\i\.length-1\].+?Fragment.+?\]}\)\]/,
                    replace: '$&.filter($self.makeGuildsBarGuildListFilter(typeof isBetterFolders!=="undefined"?isBetterFolders:false))'
                },
                // If we are rendering the Better Folders sidebar, we filter out everything but the scroller for the guild list from the GuildsBar Tree children
                {
                    match: /unreadMentionsIndicatorBottom,barClassName.+?}\)\]/,
                    replace: '$&.filter($self.makeGuildsBarTreeFilter(typeof isBetterFolders!=="undefined"?isBetterFolders:false))'
                },
                // Export the isBetterFolders variable to the folders component
                {
                    match: /(?<=\.Messages\.SERVERS.+?switch\((\i)\.type\){case \i\.\i\.FOLDER:.+?folderNode:\i,)/,
                    replace: 'isBetterFolders:typeof isBetterFolders!=="undefined"?isBetterFolders:false,'
                },
                // Avoid rendering servers that are not in folders in the Better Folders sidebar
                {
                    match: /(?<=\.Messages\.SERVERS.+?switch\((\i)\.type\){case \i\.\i\.FOLDER:.+?GUILD:)/,
                    replace: 'if((typeof isBetterFolders!=="undefined"?isBetterFolders:false)&&$1.parentId==null)return null;'
                }
            ]
        },
        {
            find: ".FOLDER_ITEM_GUILD_ICON_MARGIN);",
            predicate: () => settings.store.sidebar,
            replacement: [
                // Create the isBetterFolders variable in the nested folders component (the parent exports all the props so we don't have to patch it)
                {
                    match: /(?<=let{folderNode:\i,setNodeRef:\i,)/,
                    replace: "isBetterFolders,"
                },
                // If we are rendering the normal GuildsBar sidebar, we make Discord think the folder is always collapsed to show better icons (the mini guild icons) and avoid transitions
                {
                    predicate: () => settings.store.keepIcons,
                    match: /(?<=let{folderNode:\i,setNodeRef:\i,.+?expanded:(\i).+?;)(?=let)/,
                    replace: '$1=(typeof isBetterFolders!=="undefined"?isBetterFolders:false)?$1:false;'
                },
                // If we are rendering the Better Folders sidebar, we filter out folders that are not expanded
                {
                    match: /(?=return\(0,\i.\i\)\("div")(?<=selected:\i,expanded:(\i),.+?)/,
                    replace: (_, expanded) => `if((typeof isBetterFolders!=="undefined"?isBetterFolders:false)&&!${expanded})return null;`
                },
                // Disable expanding and collapsing folders transition in the normal GuildsBar sidebar
                {
                    predicate: () => !settings.store.keepIcons,
                    match: /(?<=\.Messages\.SERVER_FOLDER_PLACEHOLDER.+?useTransition\)\()/,
                    replace: '(typeof isBetterFolders!=="undefined"?isBetterFolders:false)&&'
                },
                // If we are rendering the normal GuildsBar sidebar, we avoid rendering guilds from folders that are expanded
                {
                    predicate: () => !settings.store.keepIcons,
                    match: /expandedFolderBackground,.+?,(?=\i\(\(\i,\i,\i\)=>{let{key.{0,45}ul)(?<=selected:\i,expanded:(\i),.+?)/,
                    replace: (m, expanded) => `${m}((typeof isBetterFolders!=="undefined"?isBetterFolders:false)||!${expanded})&&`
                }
            ]
        },
        {
            find: "APPLICATION_LIBRARY,render",
            predicate: () => settings.store.sidebar,
            replacement: {
                // Render the Better Folders sidebar
                match: /(?<=({className:\i\.guilds,themeOverride:\i})\))/,
                replace: ",$self.FolderSideBar($1)"
            }
        },
        {
            find: ".Messages.DISCODO_DISABLED",
            predicate: () => settings.store.closeAllHomeButton,
            replacement: {
                // Close all folders when clicking the home button
                match: /(?<=onClick:\(\)=>{)(?=.{0,200}"discodo")/,
                replace: "$self.closeFolders();"
            }
        }
    ],

    flux: {
        CHANNEL_SELECT(data) {
            if (!settings.store.closeAllFolders && !settings.store.forceOpen)
                return;

            if (lastGuildId !== data.guildId) {
                lastGuildId = data.guildId;
                const guildFolder = getGuildFolder(data.guildId);

                if (guildFolder?.folderId) {
                    if (settings.store.forceOpen && !ExpandedGuildFolderStore.isFolderExpanded(guildFolder.folderId)) {
                        FolderUtils.toggleGuildFolderExpand(guildFolder.folderId);
                    }
                } else if (settings.store.closeAllFolders) {
                    closeFolders();
                }
            }
        },

        TOGGLE_GUILD_FOLDER_EXPAND(data) {
            if (settings.store.closeOthers && !dispatchingFoldersClose) {
                dispatchingFoldersClose = true;

                FluxDispatcher.wait(() => {
                    const expandedFolders = ExpandedGuildFolderStore.getExpandedFolders();

                    if (expandedFolders.size > 1) {
                        for (const id of expandedFolders) if (id !== data.folderId)
                            FolderUtils.toggleGuildFolderExpand(id);
                    }

                    dispatchingFoldersClose = false;
                });
            }
        }
    },

    makeGuildsBarGuildListFilter(isBetterFolders: boolean) {
        return child => {
            if (isBetterFolders) {
                return child?.props?.["aria-label"] === i18n.Messages.SERVERS;
            }
            return true;
        };
    },

    makeGuildsBarTreeFilter(isBetterFolders: boolean) {
        return child => {
            if (isBetterFolders) {
                return "onScroll" in child.props;
            }
            return true;
        };
    },

    FolderSideBar: guildsBarProps => <FolderSideBar {...guildsBarProps} />,

    closeFolders
});
