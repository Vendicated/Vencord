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

import "./style.css";

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { getIntlMessage } from "@utils/discord";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy, findStoreLazy } from "@webpack";
import { FluxDispatcher, React, WindowStore } from "@webpack/common";

import FolderSideBar from "./FolderSideBar";

enum FolderIconDisplay {
    Never,
    Always,
    MoreThanOneFolderExpanded
}

enum FolderOpenBehavior {
    Default,
    Hover
}

export const ExpandedGuildFolderStore = findStoreLazy("ExpandedGuildFolderStore");
export const SortedGuildStore = findStoreLazy("SortedGuildStore");
const FolderUtils = findByPropsLazy("move", "toggleGuildFolderExpand");

let lastGuildId = null as string | null;

let dispatchingFoldersClose = false;
const hoverOpenedFolderIds = new Set<string>();
const hoverPinnedFolderIds = new Set<string>();
const hoverActiveFolderCounts = new Map<string, number>();
const hoverOpenedAt = new Map<string, number>();
const hoverCloseTimers = new Map<string, number>();
let isSidebarHovered = false;

function getGuildFolder(id: string) {
    return SortedGuildStore.getGuildFolders().find(folder => folder.guildIds.includes(id));
}

function closeFolders() {
    for (const id of ExpandedGuildFolderStore.getExpandedFolders())
        FolderUtils.toggleGuildFolderExpand(id);

    for (const timer of hoverCloseTimers.values())
        clearTimeout(timer);
    hoverCloseTimers.clear();
    hoverOpenedFolderIds.clear();
    hoverPinnedFolderIds.clear();
    hoverActiveFolderCounts.clear();
    hoverOpenedAt.clear();
    isSidebarHovered = false;
}

function getHoverCount(folderId: string) {
    return hoverActiveFolderCounts.get(folderId) ?? 0;
}

function incrementHoverCount(folderId: string) {
    hoverActiveFolderCounts.set(folderId, getHoverCount(folderId) + 1);
}

function decrementHoverCount(folderId: string) {
    const next = Math.max(0, getHoverCount(folderId) - 1);
    if (next === 0) {
        hoverActiveFolderCounts.delete(folderId);
        return 0;
    }
    hoverActiveFolderCounts.set(folderId, next);
    return next;
}

function clearHoverCloseTimer(folderId: string) {
    const timer = hoverCloseTimers.get(folderId);
    if (timer != null) {
        clearTimeout(timer);
        hoverCloseTimers.delete(folderId);
    }
}

function scheduleHoverClose(folderId: string) {
    clearHoverCloseTimer(folderId);
    if (getHoverCount(folderId) > 0) return;
    if (hoverPinnedFolderIds.has(folderId)) return;
    if (!hoverOpenedFolderIds.has(folderId)) return;

    const preTimer = window.setTimeout(() => {
        if (getHoverCount(folderId) > 0) return;
        if (isSidebarHovered) return;
        if (hoverPinnedFolderIds.has(folderId)) return;
        if (!hoverOpenedFolderIds.has(folderId)) return;

        const openedAt = hoverOpenedAt.get(folderId) ?? 0;
        const elapsed = Date.now() - openedAt;
        const minOpenMs = 300;
        const baseDelayMs = 200;
        const delay = Math.max(baseDelayMs, minOpenMs - elapsed);

        const timer = window.setTimeout(() => {
            hoverCloseTimers.delete(folderId);
            if (settings.store.folderOpenBehavior !== FolderOpenBehavior.Hover) return;
            if (isSidebarHovered) return;
            if (getHoverCount(folderId) > 0) return;
            if (hoverPinnedFolderIds.has(folderId)) return;
            if (!hoverOpenedFolderIds.has(folderId)) return;
            if (ExpandedGuildFolderStore.isFolderExpanded(folderId)) {
                FolderUtils.toggleGuildFolderExpand(folderId);
            }
            hoverOpenedFolderIds.delete(folderId);
            hoverOpenedAt.delete(folderId);
        }, delay);
        hoverCloseTimers.set(folderId, timer);
    }, 0);

    hoverCloseTimers.set(folderId, preTimer);
}

function onWindowFocusChanged() {
    if (WindowStore.isFocused()) return;

    isSidebarHovered = false;
    hoverActiveFolderCounts.clear();

    for (const id of hoverOpenedFolderIds)
        scheduleHoverClose(id);
}

export function setSidebarHovered(hovered: boolean) {
    isSidebarHovered = hovered;
    if (hovered) {
        for (const id of hoverOpenedFolderIds)
            clearHoverCloseTimer(id);
        return;
    }

    for (const id of hoverOpenedFolderIds)
        scheduleHoverClose(id);
}

// Nuckyz: Unsure if this should be a general utility or not
function filterTreeWithTargetNode(children: any, predicate: (node: any) => boolean) {
    if (children == null) {
        return false;
    }

    if (!Array.isArray(children)) {
        if (predicate(children)) {
            return true;
        }

        return filterTreeWithTargetNode(children.props?.children, predicate);
    }

    let childIsTargetChild = false;
    for (let i = 0; i < children.length; i++) {
        const shouldKeep = filterTreeWithTargetNode(children[i], predicate);
        if (shouldKeep) {
            childIsTargetChild = true;
            continue;
        }

        children.splice(i--, 1);
    }

    return childIsTargetChild;
}

export const settings = definePluginSettings({
    folderOpenBehavior: {
        type: OptionType.SELECT,
        description: "Open folders",
        options: [
            { label: "Click to open", value: FolderOpenBehavior.Default, default: true },
            { label: "Hover to open", value: FolderOpenBehavior.Hover }
        ]
    },
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
        restartNeeded: true,
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

const IS_BETTER_FOLDERS_VAR = "typeof isBetterFolders!=='undefined'?isBetterFolders:arguments[0]?.isBetterFolders";
const BETTER_FOLDERS_EXPANDED_IDS_VAR = "typeof betterFoldersExpandedIds!=='undefined'?betterFoldersExpandedIds:arguments[0]?.betterFoldersExpandedIds";
const GRID_STYLE_NAME = "vc-betterFolders-sidebar-grid";

export default definePlugin({
    name: "BetterFolders",
    description: "Shows server folders on dedicated sidebar and adds folder related improvements",
    authors: [Devs.juby, Devs.AutumnVN, Devs.Nuckyz],
    tags: ["Organisation", "Servers", "Appearance"],
    settings,

    start() {
        WindowStore.addChangeListener(onWindowFocusChanged);
    },

    stop() {
        WindowStore.removeChangeListener(onWindowFocusChanged);
    },

    patches: [
        {
            find: '("guildsnav")',
            predicate: () => settings.store.sidebar,
            replacement: [
                // Create the isBetterFolders and betterFoldersExpandedIds variables in the GuildsBar component
                // Needed because we access this from a non-arrow closure so we can't use arguments[0]
                {
                    match: /let{disableAppDownload:\i=\i\.isPlatformEmbedded,isOverlay:.+?(?=}=\i)/,
                    replace: "$&,isBetterFolders,betterFoldersExpandedIds"
                },
                // Export the isBetterFolders and betterFoldersExpandedIds variable to the Guild List component
                {
                    match: /,{guildDiscoveryButton:\i,/g,
                    replace: "$&isBetterFolders:arguments[0]?.isBetterFolders,betterFoldersExpandedIds:arguments[0]?.betterFoldersExpandedIds,"
                },
                // Wrap the guild node (guild or folder) component in a div with display: none if it's not an expanded folder or a guild in an expanded folder
                {
                    match: /switch\((\i)\.type\){.+?default:return null}/,
                    replace: `return $self.wrapGuildNodeComponent($1,()=>{$&},${IS_BETTER_FOLDERS_VAR},${BETTER_FOLDERS_EXPANDED_IDS_VAR});`
                },
                // Export the isBetterFolders variable to the folder component
                {
                    match: /switch\(\i\.type\){case \i\.\i\.FOLDER:.+?folderNode:\i,/,
                    replace: `$&isBetterFolders:${IS_BETTER_FOLDERS_VAR},`
                },
                // Make the callback for returning the guild node component depend on isBetterFolders and betterFoldersExpandedIds
                {
                    match: /switch\(\i\.type\).+?,\i,\i\.setNodeRef/,
                    replace: "$&,arguments[0]?.isBetterFolders,arguments[0]?.betterFoldersExpandedIds"
                },
                // If we are rendering the Better Folders sidebar, we filter out everything but the guilds and folders from the Guild List children
                {
                    match: /lastTargetNode:\i\[\i\.length-1\].+?}\)(?::null)?\](?=}\))/,
                    replace: "$&.filter($self.makeGuildsBarGuildListFilter(!!arguments[0]?.isBetterFolders))"
                },
                // If we are rendering the Better Folders sidebar, we filter out everything but the Guild List from the Sidebar children
                {
                    match: /reverse:!0,.{0,150}?barClassName:.+?\}\)\]/,
                    replace: "$&.filter($self.makeGuildsBarSidebarFilter(!!arguments[0]?.isBetterFolders))"
                }
            ]
        },
        {
            find: '("guildsnav")',
            predicate: () => !settings.store.sidebar,
            replacement: {
                match: /switch\((\i)\.type\){.+?default:return null}/,
                replace: "return $self.wrapGuildNodeForHover($1,()=>{$&});"
            }
        },
        {
            find: "onExpandCollapse",
            replacement: [
                {
                    match: /toggleGuildFolderExpand\((\i)\)[\s\S]{0,200}?onExpandCollapse:(\i)/,
                    replace: (match, folderId, handler) => match.replace(
                        `onExpandCollapse:${handler}`,
                        `onExpandCollapse:()=>{if($self.handleFolderClick(${folderId}))return;${handler}()}`
                    )
                },
                {
                    match: /(folderNode:(\i)[\s\S]{0,600}?onMouseEnter:)(\i)(,onMouseLeave:)(\i)/,
                    replace: (_match, prefix, folderNode, onEnter, mid, onLeave) =>
                        `${prefix}e=>{${onEnter}(e);$self.handleFolderMouseEnter(${folderNode}.id)}${mid}e=>{${onLeave}(e);$self.handleFolderMouseLeave(${folderNode}.id)}`
                }
            ]
        },
        {
            find: "toggleGuildFolderExpand(",
            replacement: [
                {
                    match: /folderNode:(\i)/,
                    replace: (_match, folderNode) => `folderNode:${folderNode},onMouseEnter:()=>{$self.handleFolderMouseEnter(${folderNode}.id)},onMouseLeave:()=>{$self.handleFolderMouseLeave(${folderNode}.id)}`
                },
                {
                    match: /onClick:\(\)=>\{[^}]*?toggleGuildFolderExpand\((\i)\)[^}]*?\}/,
                    replace: (match, folderId) => {
                        const guarded = match.replace("onClick:()=>{", `onClick:()=>{if($self.handleFolderClick(${folderId}))return;`);
                        return `onMouseEnter:()=>{$self.handleFolderMouseEnter(${folderId})},onMouseLeave:()=>{$self.handleFolderMouseLeave(${folderId})},${guarded}`;
                    }
                }
            ]
        },
        {
            // This is the parent folder component
            find: "toggleGuildFolderExpand(",
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
                    match: /(?<=\(0,\i\.jsxs?\)\(\i,\{folderNode:(\i),expanded:)\i(?=,)/,
                    replace: (isExpandedOrExpandedIds, folderNote) => ""
                        + `typeof ${isExpandedOrExpandedIds}==="boolean"?${isExpandedOrExpandedIds}:${isExpandedOrExpandedIds}.has(${folderNote}.id),`
                        + `betterFoldersExpandedIds:${isExpandedOrExpandedIds} instanceof Set?${isExpandedOrExpandedIds}:void 0`
                }
            ]
        },
        {
            find: ".FOLDER_ITEM_ANIMATION_DURATION),",
            predicate: () => settings.store.sidebar,
            replacement: [
                // We use arguments[0] to access the isBetterFolders variable in this nested folder component (the parent exports all the props so we don't have to patch it)

                // If we are rendering the normal GuildsBar sidebar, we make Discord think the folder is always collapsed to show better icons (the mini guild icons) and avoid transitions
                {
                    predicate: () => settings.store.keepIcons,
                    match: /(?<=let ?(?:\i,)*?{folderNode:\i,setNodeRef:\i,.+?expanded:(\i),.+?;)(?=let)/,
                    replace: (_, isExpanded) => `${isExpanded}=!!arguments[0]?.isBetterFolders&&${isExpanded};`
                },
                // Disable expanding and collapsing folders transition in the normal GuildsBar sidebar
                {
                    predicate: () => !settings.store.keepIcons,
                    match: /(?=,\{from:\{height)/,
                    replace: "&&$self.shouldShowTransition(arguments[0])"
                },
                // If we are rendering the normal GuildsBar sidebar, we avoid rendering guilds from folders that are expanded
                {
                    predicate: () => !settings.store.keepIcons,
                    match: /"--custom-folder-color".+?(?=\i\(\(\i,\i,\i\)=>{let{key:.{0,70}"ul")(?<=selected:\i,expanded:(\i),.+?)/,
                    replace: (m, isExpanded) => `${m}$self.shouldRenderContents(arguments[0],${isExpanded})?null:`
                },
                // Decide if we should render the expanded folder background if we are rendering the Better Folders sidebar
                {
                    predicate: () => settings.store.showFolderIcon !== FolderIconDisplay.Always,
                    match: /"--custom-folder-color".{0,110}?children:\[/,
                    replace: "$&$self.shouldShowFolderIconAndBackground(!!arguments[0]?.isBetterFolders,arguments[0]?.betterFoldersExpandedIds)&&"
                },
                // Decide if we should render the expanded folder icon if we are rendering the Better Folders sidebar
                {
                    predicate: () => settings.store.showFolderIcon !== FolderIconDisplay.Always,
                    match: /"--custom-folder-color".+?className:\i\.\i}\),(?=\i,)/,
                    replace: "$&!$self.shouldShowFolderIconAndBackground(!!arguments[0]?.isBetterFolders,arguments[0]?.betterFoldersExpandedIds)?null:"
                }
            ]
        },
        {
            find: "APPLICATION_LIBRARY,render:",
            predicate: () => settings.store.sidebar,
            group: true,
            replacement: [
                {
                    // Render the Better Folders sidebar
                    // Discord has two different places where they render the sidebar.
                    // One is for visual refresh, one is not,
                    // and each has a bunch of conditions &&ed in front of it.
                    // Add the betterFolders sidebar to both, keeping the conditions Discord uses.
                    match: /(?<=[[,])((?:!?\i&&)+)\(.{0,50}({className:\i\.\i,themeOverride:\i})\)/g,
                    replace: (m, conditions, props) => `${m},${conditions}$self.FolderSideBar(${props})`
                },
                {
                    // Add grid styles to fix aligment with other visual refresh elements
                    match: /(?<=className:)\i\.\i(?=,"data-fullscreen")/,
                    replace: `"${GRID_STYLE_NAME} "+$&`
                }
            ]
        },
        {
            find: "#{intl::DISCODO_DISABLED}",
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
                const targetFolderId = guildFolder?.folderId ?? null;

                if (targetFolderId) {
                    if (settings.store.forceOpen) {
                        if (!ExpandedGuildFolderStore.isFolderExpanded(targetFolderId)) {
                            FolderUtils.toggleGuildFolderExpand(targetFolderId);
                        }

                        if (settings.store.folderOpenBehavior === FolderOpenBehavior.Hover) {
                            hoverOpenedFolderIds.add(targetFolderId);
                            hoverPinnedFolderIds.add(targetFolderId);
                            hoverOpenedAt.set(targetFolderId, Date.now());
                            clearHoverCloseTimer(targetFolderId);
                        }

                        for (const id of Array.from(hoverOpenedFolderIds)) {
                            if (id === targetFolderId) continue;
                            if (ExpandedGuildFolderStore.isFolderExpanded(id)) {
                                FolderUtils.toggleGuildFolderExpand(id);
                            }
                            hoverOpenedFolderIds.delete(id);
                            hoverPinnedFolderIds.delete(id);
                            hoverOpenedAt.delete(id);
                            clearHoverCloseTimer(id);
                        }
                    }
                } else {

                    if (settings.store.closeAllFolders) {
                        closeFolders();
                    } else if (settings.store.folderOpenBehavior === FolderOpenBehavior.Hover) {

                        for (const id of Array.from(hoverOpenedFolderIds)) {
                            if (ExpandedGuildFolderStore.isFolderExpanded(id)) {
                                FolderUtils.toggleGuildFolderExpand(id);
                            }
                            hoverOpenedFolderIds.delete(id);
                            hoverPinnedFolderIds.delete(id);
                            hoverOpenedAt.delete(id);
                            clearHoverCloseTimer(id);
                        }
                    }
                }
            }
        },

        TOGGLE_GUILD_FOLDER_EXPAND(data) {
            if (settings.store.closeOthers && !dispatchingFoldersClose) {
                dispatchingFoldersClose = true;

                FluxDispatcher.wait(() => {
                    const expandedFolders = ExpandedGuildFolderStore.getExpandedFolders();

                    if (expandedFolders.size > 1) {
                        for (const id of expandedFolders) {
                            if (id === data.folderId) continue;
                            if (settings.store.folderOpenBehavior === FolderOpenBehavior.Hover && hoverPinnedFolderIds.has(id)) continue;
                            FolderUtils.toggleGuildFolderExpand(id);
                        }
                    }

                    dispatchingFoldersClose = false;
                });
            }
        },

        LOGOUT() {
            closeFolders();
        }
    },

    FolderSideBar,
    closeFolders,

    handleFolderMouseEnter(folderId: string) {
        if (settings.store.folderOpenBehavior !== FolderOpenBehavior.Hover) return;
        incrementHoverCount(folderId);
        clearHoverCloseTimer(folderId);

        if (!ExpandedGuildFolderStore.isFolderExpanded(folderId)) {
            FolderUtils.toggleGuildFolderExpand(folderId);
            hoverOpenedFolderIds.add(folderId);
            hoverOpenedAt.set(folderId, Date.now());
        }

        setTimeout(() => {
            const expandedFolders = ExpandedGuildFolderStore.getExpandedFolders();
            if (expandedFolders.size <= 1) return;
            for (const id of expandedFolders) {
                if (id === folderId) continue;
                if (hoverPinnedFolderIds.has(id)) continue;
                if (!hoverOpenedFolderIds.has(id)) continue;
                FolderUtils.toggleGuildFolderExpand(id);
                hoverOpenedFolderIds.delete(id);
                hoverPinnedFolderIds.delete(id);
                hoverOpenedAt.delete(id);
                clearHoverCloseTimer(id);
            }
        }, 0);
    },

    handleFolderMouseLeave(folderId: string) {
        if (settings.store.folderOpenBehavior !== FolderOpenBehavior.Hover) return;
        const remaining = decrementHoverCount(folderId);
        if (remaining > 0) return;
        if (hoverPinnedFolderIds.has(folderId)) return;
        if (!hoverOpenedFolderIds.has(folderId)) return;
        if (isSidebarHovered) {
            clearHoverCloseTimer(folderId);
            return;
        }

        scheduleHoverClose(folderId);
    },

    handleFolderClick(folderId: string) {
        if (settings.store.folderOpenBehavior !== FolderOpenBehavior.Hover) return false;
        const isHoverOwned = hoverOpenedFolderIds.has(folderId) || hoverPinnedFolderIds.has(folderId);
        if (!isHoverOwned) return false;

        if (hoverPinnedFolderIds.has(folderId)) {
            hoverPinnedFolderIds.delete(folderId);
            hoverOpenedFolderIds.delete(folderId);
            hoverOpenedAt.delete(folderId);
            clearHoverCloseTimer(folderId);
            if (ExpandedGuildFolderStore.isFolderExpanded(folderId)) {
                FolderUtils.toggleGuildFolderExpand(folderId);
            }
            return true;
        }

        hoverPinnedFolderIds.add(folderId);
        clearHoverCloseTimer(folderId);
        return true;
    },


    wrapGuildNodeComponent(node: any, originalComponent: () => React.ReactNode, isBetterFolders: boolean, expandedFolderIds?: Set<any>) {
        if (!isBetterFolders) {
            return this.wrapGuildNodeForHover(node, originalComponent);
        }

        if (node.type === "folder" && expandedFolderIds?.has(node.id) || node.type === "guild" && expandedFolderIds?.has(node.parentId)) {
            return originalComponent();
        }

        return (
            <div style={{ display: "none" }}>
                {originalComponent()}
            </div>
        );
    },

    wrapGuildNodeForHover(node: any, originalComponent: () => React.ReactNode) {
        if (settings.store.folderOpenBehavior !== FolderOpenBehavior.Hover) {
            return originalComponent();
        }

        if (node.type === "guild" && node.parentId) {
            return this.withHoverHandlers(originalComponent(), node.parentId);
        }

        return originalComponent();
    },

    withHoverHandlers(element: React.ReactNode, folderId: string) {
        const elementProps = React.isValidElement(element) ? element.props as any : null;

        return (
            <div
                style={{ display: "contents" }}
                onMouseEnter={(e: any) => {
                    elementProps?.onMouseEnter?.(e);
                    this.handleFolderMouseEnter(folderId);
                }}
                onMouseLeave={(e: any) => {
                    elementProps?.onMouseLeave?.(e);
                    this.handleFolderMouseLeave(folderId);
                }}
            >
                {element}
            </div>
        );
    },

    makeGuildsBarGuildListFilter(isBetterFolders: boolean) {
        return (child: any) => {
            if (!isBetterFolders) {
                return true;
            }

            try {
                // can cause hang if intl message is not found
                const serversIntlMsg = getIntlMessage("SERVERS");
                if (!serversIntlMsg) {
                    new Logger("BetterFolders").error("Failed to get SERVERS intl message");
                    return true;
                }
                return child?.props?.["aria-label"] === serversIntlMsg;
            } catch (e) {
                console.error(e);
                return true;
            }
        };
    },

    makeGuildsBarSidebarFilter(isBetterFolders: boolean) {
        return (child: any) => {
            if (!isBetterFolders) {
                return true;
            }

            try {
                return filterTreeWithTargetNode(child, child => child?.props?.renderTreeNode != null);
            } catch (e) {
                console.error(e);
                return true;
            }
        };
    },

    shouldShowFolderIconAndBackground(isBetterFolders: boolean, expandedFolderIds?: Set<any>) {
        if (!isBetterFolders) {
            return true;
        }

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

    shouldShowTransition(props: any) {
        // Pending guilds
        if (props?.folderNode?.id === 1) return true;

        return !!props?.isBetterFolders;
    },

    shouldRenderContents(props: any, isExpanded: boolean) {
        // Pending guilds
        if (props?.folderNode?.id === 1) return false;

        return !props?.isBetterFolders && isExpanded;
    }
});
