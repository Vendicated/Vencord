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
import { findByPropsLazy, findLazy, findStoreLazy } from "@webpack";
import { FluxDispatcher, i18n, useMemo } from "@webpack/common";

import FolderSideBar from "./FolderSideBar";

enum FolderIconDisplay {
    Never,
    Always,
    MoreThanOneFolderExpanded
}

const GuildsTree = findLazy(m => m.prototype?.moveNextTo);
const SortedGuildStore = findStoreLazy("SortedGuildStore");
export const ExpandedGuildFolderStore = findStoreLazy("ExpandedGuildFolderStore");
const FolderUtils = findByPropsLazy("move", "toggleGuildFolderExpand");

let lastGuildId = null as string | null;
let dispatchingFoldersClose = false;

function getGuildFolder(id: string) {
    return SortedGuildStore.getGuildFolders().find(folder => folder.guildIds.includes(id));
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
    },
    showFolderIcon: {
        type: OptionType.SELECT,
        description: "Show the folder icon above the folder guilds in the BetterFolders sidebar",
        options: [
            { label: "Never", value: FolderIconDisplay.Never },
            { label: "Always", value: FolderIconDisplay.Always, default: true },
            { label: "When more than one folder is expanded", value: FolderIconDisplay.MoreThanOneFolderExpanded }
        ],
        restartNeeded: true
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
                    match: /let{disableAppDownload:\i=\i\.isPlatformEmbedded,isOverlay:.+?(?=}=\i,)/,
                    replace: "$&,isBetterFolders"
                },
                // If we are rendering the Better Folders sidebar, we filter out guilds that are not in folders and unexpanded folders
                {
                    match: /\[(\i)\]=(\(0,\i\.\i\).{0,40}getGuildsTree\(\).+?}\))(?=,)/,
                    replace: (_, originalTreeVar, rest) => `[betterFoldersOriginalTree]=${rest},${originalTreeVar}=$self.getGuildTree(!!arguments[0].isBetterFolders,betterFoldersOriginalTree,arguments[0].betterFoldersExpandedIds)`
                },
                // If we are rendering the Better Folders sidebar, we filter out everything but the servers and folders from the GuildsBar Guild List children
                {
                    match: /lastTargetNode:\i\[\i\.length-1\].+?Fragment.+?\]}\)\]/,
                    replace: "$&.filter($self.makeGuildsBarGuildListFilter(!!arguments[0].isBetterFolders))"
                },
                // If we are rendering the Better Folders sidebar, we filter out everything but the scroller for the guild list from the GuildsBar Tree children
                {
                    match: /unreadMentionsIndicatorBottom,.+?}\)\]/,
                    replace: "$&.filter($self.makeGuildsBarTreeFilter(!!arguments[0].isBetterFolders))"
                },
                // Export the isBetterFolders variable to the folders component
                {
                    match: /switch\(\i\.type\){case \i\.\i\.FOLDER:.+?folderNode:\i,/,
                    replace: '$&isBetterFolders:typeof isBetterFolders!=="undefined"?isBetterFolders:false,'
                }
            ]
        },
        {
            // This is the parent folder component
            find: ".toggleGuildFolderExpand(",
            predicate: () => settings.store.sidebar && settings.store.showFolderIcon !== FolderIconDisplay.Always,
            replacement: [
                {
                    // Modify the expanded state to instead return the list of expanded folders
                    match: /(\],\(\)=>)(\i\.\i)\.isFolderExpanded\(\i\)\)/,
                    replace: (_, rest, ExpandedGuildFolderStore) => `${rest}${ExpandedGuildFolderStore}.getExpandedFolders())`,
                },
                {
                    // Modify the expanded prop to use the boolean if the above patch fails, or check if the folder is expanded from the list if it succeeds
                    // Also export the list of expanded folders to the child folder component if the patch above succeeds, else export undefined
                    match: /(?<=folderNode:(\i),expanded:)\i(?=,)/,
                    replace: (isExpandedOrExpandedIds, folderNote) => ""
                        + `typeof ${isExpandedOrExpandedIds}==="boolean"?${isExpandedOrExpandedIds}:${isExpandedOrExpandedIds}.has(${folderNote}.id),`
                        + `betterFoldersExpandedIds:${isExpandedOrExpandedIds} instanceof Set?${isExpandedOrExpandedIds}:void 0`
                }
            ]
        },
        {
            find: ".FOLDER_ITEM_GUILD_ICON_MARGIN);",
            predicate: () => settings.store.sidebar,
            replacement: [
                // We use arguments[0] to access the isBetterFolders variable in this nested folder component (the parent exports all the props so we don't have to patch it)

                // If we are rendering the normal GuildsBar sidebar, we make Discord think the folder is always collapsed to show better icons (the mini guild icons) and avoid transitions
                {
                    predicate: () => settings.store.keepIcons,
                    match: /(?<=let{folderNode:\i,setNodeRef:\i,.+?expanded:(\i),.+?;)(?=let)/,
                    replace: (_, isExpanded) => `${isExpanded}=!!arguments[0].isBetterFolders&&${isExpanded};`
                },
                // Disable expanding and collapsing folders transition in the normal GuildsBar sidebar
                {
                    predicate: () => !settings.store.keepIcons,
                    match: /(?<=\.Messages\.SERVER_FOLDER_PLACEHOLDER.+?useTransition\)\()/,
                    replace: "!!arguments[0].isBetterFolders&&"
                },
                // If we are rendering the normal GuildsBar sidebar, we avoid rendering guilds from folders that are expanded
                {
                    predicate: () => !settings.store.keepIcons,
                    match: /expandedFolderBackground,.+?,(?=\i\(\(\i,\i,\i\)=>{let{key.{0,45}ul)(?<=selected:\i,expanded:(\i),.+?)/,
                    replace: (m, isExpanded) => `${m}!arguments[0].isBetterFolders&&${isExpanded}?null:`
                },
                {
                    // Decide if we should render the expanded folder background if we are rendering the Better Folders sidebar
                    predicate: () => settings.store.showFolderIcon !== FolderIconDisplay.Always,
                    match: /(?<=\.wrapper,children:\[)/,
                    replace: "$self.shouldShowFolderIconAndBackground(!!arguments[0].isBetterFolders,arguments[0].betterFoldersExpandedIds)&&"
                },
                {
                    // Decide if we should render the expanded folder icon if we are rendering the Better Folders sidebar
                    predicate: () => settings.store.showFolderIcon !== FolderIconDisplay.Always,
                    match: /(?<=\.expandedFolderBackground.+?}\),)(?=\i,)/,
                    replace: "!$self.shouldShowFolderIconAndBackground(!!arguments[0].isBetterFolders,arguments[0].betterFoldersExpandedIds)?null:"
                }
            ]
        },
        {
            find: "APPLICATION_LIBRARY,render:",
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
                match: /(?<=onClick:\(\)=>{)(?=.{0,300}"discodo")/,
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
        },

        LOGOUT() {
            closeFolders();
        }
    },

    getGuildTree(isBetterFolders: boolean, originalTree: any, expandedFolderIds?: Set<any>) {
        return useMemo(() => {
            if (!isBetterFolders || expandedFolderIds == null) return originalTree;

            const newTree = new GuildsTree();
            // Children is every folder and guild which is not in a folder, this filters out only the expanded folders
            newTree.root.children = originalTree.root.children.filter(guildOrFolder => expandedFolderIds.has(guildOrFolder.id));
            // Nodes is every folder and guild, even if it's in a folder, this filters out only the expanded folders and guilds inside them
            newTree.nodes = Object.fromEntries(
                Object.entries(originalTree.nodes)
                    .filter(([_, guildOrFolder]: any[]) => expandedFolderIds.has(guildOrFolder.id) || expandedFolderIds.has(guildOrFolder.parentId))
            );

            return newTree;
        }, [isBetterFolders, originalTree, expandedFolderIds]);
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
                return child?.props?.onScroll != null;
            }
            return true;
        };
    },

    shouldShowFolderIconAndBackground(isBetterFolders: boolean, expandedFolderIds?: Set<any>) {
        if (!isBetterFolders) return true;

        switch (settings.store.showFolderIcon) {
            case FolderIconDisplay.Never:
                return false;
            case FolderIconDisplay.Always:
                return true;
            case FolderIconDisplay.MoreThanOneFolderExpanded:
                return (expandedFolderIds?.size ?? 0) > 1;
            default:
                return true;
        }
    },

    FolderSideBar: guildsBarProps => <FolderSideBar {...guildsBarProps} />,

    closeFolders
});
