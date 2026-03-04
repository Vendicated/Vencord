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
import definePlugin, { OptionType } from "@utils/types";
import type { GuildFolder } from "@vencord/discord-types";
import { findByPropsLazy, findComponentByCodeLazy, findStoreLazy } from "@webpack";
import { ChannelStore, FluxDispatcher, ReadStateStore } from "@webpack/common";
import { ReactNode } from "react";

import FolderSideBar from "./FolderSideBar";

enum FolderIconDisplay {
    Never,
    Always,
    MoreThanOneFolderExpanded
}

type GuildTreeNode = {
    id: string | number;
    type?: string;
    parentId?: string | number | null;
    name?: string;
    children?: GuildTreeNode[];
    isBetterFoldersNested?: boolean;
    [key: string]: unknown;
};

type FolderRenderProps = {
    isBetterFolders?: boolean;
    folderNode?: GuildTreeNode;
};

type FolderDragItem = {
    type?: string;
    nodeId: string | number;
};

type FolderMentionProps = {
    mentionCount?: number;
    folderNode?: GuildTreeNode;
};

export const ExpandedGuildFolderStore = findStoreLazy("ExpandedGuildFolderStore");
export const SortedGuildStore = findStoreLazy("SortedGuildStore");
const FolderUtils = findByPropsLazy("move", "toggleGuildFolderExpand");
const FolderItem = findComponentByCodeLazy("FolderItem", "onExpandCollapse", "folderButtonSize");

const MAX_TREE_FILTER_DEPTH = 1000;
let lastGuildId = null as string | null;
let dispatchingFoldersClose = false;

function getGuildFolder(id: string) {
    return SortedGuildStore.getGuildFolders().find((folder: GuildFolder) => folder.guildIds.includes(id));
}

function closeFolders() {
    for (const id of ExpandedGuildFolderStore.getExpandedFolders())
        FolderUtils.toggleGuildFolderExpand(id);
}

// Nuckyz: Unsure if this should be a general utility or not
function filterTreeWithTargetNode(children: any, predicate: (node: any) => boolean, visited = new WeakSet<object>(), depth = 0) {
    if (children == null) {
        return false;
    }

    if (depth > MAX_TREE_FILTER_DEPTH) {
        return false;
    }

    if (typeof children === "object") {
        if (visited.has(children)) return false;
        visited.add(children);
    }

    if (!Array.isArray(children)) {
        if (predicate(children)) {
            return true;
        }

        return filterTreeWithTargetNode(children.props?.children, predicate, visited, depth + 1);
    }

    let childIsTargetChild = false;
    for (let i = 0; i < children.length; i++) {
        const shouldKeep = filterTreeWithTargetNode(children[i], predicate, visited, depth + 1);
        if (shouldKeep) {
            childIsTargetChild = true;
            continue;
        }

        children.splice(i--, 1);
    }

    return childIsTargetChild;
}

function getNestedFolderMap(): Record<string, string> {
    return settings.store.nestedFolders ?? {};
}

function saveNestedFolderMap(map: Record<string, string>) {
    settings.store.nestedFolders = map;
}

export function getParentFolderId(childId: string | number): string | undefined {
    return getNestedFolderMap()[childId.toString()];
}

export function getChildFolderIds(parentId: string | number): string[] {
    const map = getNestedFolderMap();
    return Object.entries(map)
        .filter(([, pid]) => pid === String(parentId))
        .map(([cid]) => cid);
}

function getDescendantFolderIds(parentId: string | number): string[] {
    const descendants: string[] = [];
    const queue = [...getChildFolderIds(parentId)];

    while (queue.length) {
        const current = queue.shift();
        if (!current) continue;
        descendants.push(current);
        queue.push(...getChildFolderIds(current));
    }

    return descendants;
}

function nestFolder(childId: string, parentId: string) {
    if (childId === parentId) return;
    if (hasParentInChain(parentId, childId)) return;

    const map = { ...getNestedFolderMap() };

    delete map[childId];

    map[childId] = parentId;
    saveNestedFolderMap(map);
}

function unnestFolder(childId: string) {
    const map = { ...getNestedFolderMap() };
    if (map[childId] == null) return;
    delete map[childId];
    saveNestedFolderMap(map);
}

function hasParentInChain(childId: string, parentId: string): boolean {
    const seen = new Set<string>();
    let current = getParentFolderId(childId);

    while (current != null && !seen.has(current)) {
        if (current === parentId) return true;
        seen.add(current);
        current = getParentFolderId(current);
    }

    return false;
}

function areNestedRelated(firstId: string, secondId: string): boolean {
    return hasParentInChain(firstId, secondId) || hasParentInChain(secondId, firstId);
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
    closeServerFolder: {
        type: OptionType.BOOLEAN,
        description: "Close folder when selecting a server in that folder",
        default: false,
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
    },
}).withPrivateSettings<{
    nestedFolders: Record<string, string>;
}>();

const IS_BETTER_FOLDERS_VAR = "typeof isBetterFolders!=='undefined'?isBetterFolders:arguments[0]?.isBetterFolders";
const BETTER_FOLDERS_EXPANDED_IDS_VAR = "typeof betterFoldersExpandedIds!=='undefined'?betterFoldersExpandedIds:arguments[0]?.betterFoldersExpandedIds";
const GRID_STYLE_NAME = "vc-betterFolders-sidebar-grid";

export default definePlugin({
    name: "BetterFolders",
    description: "Shows server folders on dedicated sidebar and adds folder related improvements",
    authors: [Devs.juby, Devs.AutumnVN, Devs.Nuckyz],
    isModified: true,

    settings,
    start() {
        settings.store.nestedFolders ??= {};
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
                match: /switch\((\i)\.type\){case \i\.\i\.FOLDER:.{0,800}?case \i\.\i\.GUILD:.{0,800}?default:return null}/,
                replace: "return $self.wrapGuildNodeComponent($1,()=>{$&},false,void 0);"
            }
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
            find: ".FOLDER_ITEM_ANIMATION_DURATION),",
            replacement: [
                {
                    match: /mentionCount:(\i),isMentionLowImportance:(\i)/,
                    replace: "mentionCount:$self.getFolderMentionCountWithNested(arguments[0]),isMentionLowImportance:$self.getFolderIsMentionLowImportanceWithNested(arguments[0],$2)"
                },
                {
                    match: /(\{id:\i,name:\i,children:\i\})=(\i),/,
                    replace: "$1=$self.getFolderNodeForRender($2),"
                },
                {
                    match: /(?<=gap:"xs",className:)(\i\.\i)/,
                    replace: "$self.getFolderGuildsListClassName(arguments[0],$1)"
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
                    // Add grid styles to fix alignment with other visual refresh elements
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
        },
        {
            find: "[GuildDropTarget]",
            all: true,
            replacement: [
                {
                    match: /(\i)=!(\i)&&null==(\i)\.parentId/,
                    replace: "$1=$self.shouldShowCombineTarget($2,$3)"
                },
                {
                    match: /canDrop:\i=>\i\.nodeId.{0,100}==\i\.parentId\)/,
                    replace: "canDrop:e=>$self.canDropOnFolder(e,arguments[1],arguments[3])"
                },
                {
                    match: /drop\(\i\)\{(?=.{0,25}!==\i\.\i\.FOLDER)/,
                    replace: "$&if($self.handleFolderDrop(arguments[0],arguments[1],arguments[2],arguments[3]))return;"
                },
                {
                    match: /\[\i\.\i\.GUILD\](?=.{0,250}#{intl::DND_DROP_COMBINE})/,
                    replace: "[...$self.getFolderAcceptTypes(arguments[0]?.targetNode)]"
                }
            ]
        },
        {
            find: ".hasFetchedRequestToJoinGuilds)",
            replacement: {
                match: /return \i\.type!==\i\.\i\.GUILD/,
                replace: "return $self.renderFolderChild(arguments[0],arguments[1],arguments[2])"
            }
        }
    ],

    flux: {
        CHANNEL_SELECT(data) {
            if (!settings.store.closeAllFolders && !settings.store.forceOpen && !settings.store.closeServerFolder)
                return;

            if (lastGuildId !== data.guildId) {
                lastGuildId = data.guildId;
                const guildFolder = getGuildFolder(data.guildId);

                if (guildFolder?.folderId) {
                    if (settings.store.forceOpen && !ExpandedGuildFolderStore.isFolderExpanded(guildFolder.folderId)) {
                        FolderUtils.toggleGuildFolderExpand(guildFolder.folderId);
                    }
                    if (settings.store.closeServerFolder && ExpandedGuildFolderStore.isFolderExpanded(guildFolder.folderId)) {
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
                    const expandedId = data.folderId?.toString();

                    if (expandedFolders.size > 1) {
                        for (const id of expandedFolders) {
                            const folderId = id?.toString();
                            if (folderId === expandedId || areNestedRelated(folderId, expandedId)) continue;
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
    getGuildMentionCount(guildId: string): number {
        const mentionChannelIds = ReadStateStore.getMentionChannelIds() ?? [];
        let count = 0;

        for (const channelId of mentionChannelIds) {
            const channel = ChannelStore.getChannel(channelId);
            if (channel?.guild_id !== guildId) continue;
            count += ReadStateStore.getMentionCount(channelId);
        }

        return count;
    },
    getFolderMentionMetaWithNested(props: FolderMentionProps | undefined): { mentionCount: number, hasNestedMention: boolean; } {
        const folderNode = props?.folderNode;
        const baseMentionCount = props?.mentionCount ?? 0;
        if (folderNode?.id == null) {
            return {
                mentionCount: baseMentionCount,
                hasNestedMention: false
            };
        }

        const descendantIds = getDescendantFolderIds(folderNode.id);
        if (descendantIds.length === 0) {
            return {
                mentionCount: baseMentionCount,
                hasNestedMention: false
            };
        }

        const tree = SortedGuildStore.getGuildsTree();
        if (typeof tree?.getNode !== "function") {
            return {
                mentionCount: baseMentionCount,
                hasNestedMention: false
            };
        }

        const nestedGuildIds = new Set<string>();
        for (const childFolderId of descendantIds) {
            const stack = [...(tree.getNode(childFolderId)?.children ?? [])];
            while (stack.length) {
                const node = stack.pop();
                if (!node) continue;
                if (node.type === "guild") {
                    nestedGuildIds.add(node.id?.toString());
                    continue;
                }
                if (node.type === "folder" && Array.isArray(node.children)) {
                    stack.push(...node.children);
                }
            }
        }

        if (nestedGuildIds.size === 0) {
            return {
                mentionCount: baseMentionCount,
                hasNestedMention: false
            };
        }

        let nestedMentionCount = 0;
        for (const guildId of nestedGuildIds) nestedMentionCount += this.getGuildMentionCount(guildId);
        return {
            mentionCount: baseMentionCount + nestedMentionCount,
            hasNestedMention: nestedMentionCount > 0
        };
    },
    getFolderMentionCountWithNested(props: FolderMentionProps | undefined): number {
        return this.getFolderMentionMetaWithNested(props).mentionCount;
    },
    getFolderIsMentionLowImportanceWithNested(props: FolderMentionProps | undefined, originalFlag: boolean): boolean {
        return this.getFolderMentionMetaWithNested(props).hasNestedMention ? false : originalFlag;
    },
    augmentFolderChildren(folderNode: GuildTreeNode, originalChildren: GuildTreeNode[]): GuildTreeNode[] {
        const childIds = getChildFolderIds(folderNode.id);
        if (childIds.length === 0) return originalChildren;

        try {
            const tree = SortedGuildStore.getGuildsTree();
            if (typeof tree?.getNode !== "function") {
                return originalChildren;
            }
            const existingIds = new Set(originalChildren.map(child => child?.id?.toString()));
            const childFolderNodes: GuildTreeNode[] = [];

            for (const id of childIds) {
                if (existingIds.has(id?.toString())) continue;
                const node = tree.getNode(id);
                if (node) {
                    childFolderNodes.push({
                        ...node,
                        parentId: folderNode.id,
                        isBetterFoldersNested: true
                    });
                }
            }

            if (childFolderNodes.length === 0) return originalChildren;

            return [...childFolderNodes, ...originalChildren];
        } catch {
            return originalChildren;
        }
    },

    getFolderNodeForRender(folderNode: GuildTreeNode): GuildTreeNode {
        const children = this.augmentFolderChildren(folderNode, folderNode.children ?? []);
        if (children === folderNode.children) return folderNode;
        return {
            ...folderNode,
            children
        };
    },

    getFolderGuildsListClassName(
        props: FolderRenderProps | undefined,
        baseClassName: string
    ): string {
        if (props?.isBetterFolders) return baseClassName;

        const folderNode = props?.folderNode;
        if (folderNode == null) return baseClassName;

        const children = this.getFolderNodeForRender(folderNode)?.children;
        if (!Array.isArray(children)) return baseClassName;

        return children.some(child => child?.type === "folder")
            ? `${baseClassName} vc-betterFolders-nested-parent-list`
            : baseClassName;
    },

    renderFolderChild(node: GuildTreeNode, posInSet: number, setSize: number): ReactNode | null {
        if (node?.type !== "folder") return null;

        try {
            if (!FolderItem) return null;
            return (
                <FolderItem
                    folderNode={node}
                    aria-setsize={setSize}
                    aria-posinset={posInSet}
                />
            );
        } catch {
            return null;
        }
    },

    handleFolderDrop(dragItem: FolderDragItem, targetNode: GuildTreeNode, _moveToBelow: boolean, isCombine: boolean): boolean {
        if (dragItem.type !== "folder") return false;

        if (!isCombine) {
            unnestFolder(dragItem.nodeId?.toString());
            return false;
        }

        if (targetNode.type !== "folder") return false;

        const childId = dragItem.nodeId?.toString();
        const parentId = targetNode.id?.toString();

        try {
            nestFolder(childId, parentId);
            FluxDispatcher.dispatch({ type: "BETTER_FOLDERS_NESTED_UPDATE" });
            return true;
        } catch {
            return false;
        }
    },

    shouldShowCombineTarget(noCombine: boolean, targetNode: GuildTreeNode): boolean {
        if (noCombine) return false;
        return targetNode.parentId == null || targetNode.type === "folder";
    },

    getFolderAcceptTypes(targetNode: GuildTreeNode): string[] {
        const GUILD = "guild";
        const FOLDER = "folder";
        if (targetNode?.type === FOLDER) return [GUILD, FOLDER];
        return [GUILD];
    },

    canDropOnFolder(dragItem: FolderDragItem, targetNode: GuildTreeNode, isCombine: boolean): boolean {
        if (dragItem.nodeId === targetNode.id) return false;

        if (dragItem.type === "folder" && targetNode.type === "folder") {
            if (isCombine) return !hasParentInChain(targetNode.id?.toString(), dragItem.nodeId?.toString());
            return targetNode.parentId == null;
        }

        if (isCombine && dragItem.type === "folder") return false;
        if (dragItem.type === "folder" && targetNode.parentId != null) return false;

        return true;
    },

    wrapGuildNodeComponent(node: GuildTreeNode, originalComponent: () => ReactNode, isBetterFolders: boolean, expandedFolderIds?: Set<string | number>) {
        if (node.type === "folder") {
            const mappedParentId = getParentFolderId(node.id);
            if (mappedParentId != null && (node.parentId?.toString() !== mappedParentId || node.isBetterFoldersNested !== true)) {
                return (
                    <div style={{ display: "none" }}>
                        {originalComponent()}
                    </div>
                );
            }
        }

        if (
            !isBetterFolders ||
            node.type === "folder" && expandedFolderIds?.has(node.id) ||
            node.type === "guild" && node.parentId != null && expandedFolderIds?.has(node.parentId)
        ) {
            return originalComponent();
        }

        return (
            <div style={{ display: "none" }}>
                {originalComponent()}
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
                    return true;
                }
                return child?.props?.["aria-label"] === serversIntlMsg;
            } catch {
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
            } catch {
                return true;
            }
        };
    },

    shouldShowFolderIconAndBackground(isBetterFolders: boolean, expandedFolderIds?: Set<string | number>) {
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
