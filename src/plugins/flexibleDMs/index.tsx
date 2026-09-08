/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { migratePluginSettings, useSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Channel } from "@vencord/discord-types";
import { Menu, React, ReadStateStore, SelectedChannelStore, useEffect, useMemo, useRef, UserStore, useStateFromStores } from "@webpack/common";

import { markFolderOpening } from "./animation";
import { clearDrag, DragRow, FolderRow } from "./components";
import { getRows, Row, withoutPinnedChannels } from "./model";
import { getDMSection, getPinDmsState, getPinnedIds, isDMSectionCollapsed, isPinned } from "./pinDms";
import { settings } from "./settings";
import { drop, editFolder, getLayout, getMessages, getNativePinnedIds, PrivateChannelSortStore, removeFromFolder, start, stop, syncPinnedChats } from "./state";

migratePluginSettings("FlexibleDMs", "DMFolders");

interface DMList {
    props: {
        privateChannelIds: string[];
        density?: string;
        vcDmfRows?: Row[];
        vcDmfVersion?: string;
        vcDmfSection?: number;
    };
    renderRow(args: { section: number; row: number; }): React.ReactNode;
    getRowHeight(section: number, row: number): number;
    renderDM(section: number, row: number): React.ReactNode;
}

const renderers = new WeakMap<DMList, { version: string | undefined; density: string | undefined; render: DMList["renderRow"]; }>();

const contextMenu: NavContextMenuPatchCallback = (children, { channel }: { channel?: Channel; }) => {
    if (!channel || ![1, 3].includes(channel.type) || isPinned(channel.id)) return;
    const group = findGroupChildrenByChildId(["close-dm", "leave-channel"], children);
    if (!group) return;
    const layout = getLayout();
    if (!layout.folders.length) return;
    const parent = layout.folders.find(f => f.channels.includes(channel.id));
    group.push(
        <Menu.MenuItem key="vc-dmf-move" id="vc-dmf-move" label="FlexibleDMs">
            {parent && <Menu.MenuItem id="vc-dmf-remove" label="Remove from Folder" action={() => removeFromFolder(channel.id)} />}
            {layout.folders.filter(f => f.id !== parent?.id).map(folder => (
                <Menu.MenuItem
                    key={folder.id}
                    id={`vc-dmf-${folder.id}`}
                    label={`Move to ${folder.name}`}
                    action={() => drop(channel.id, folder.id, "inside")}
                />
            ))}
        </Menu.MenuItem>
    );
};

export default definePlugin({
    name: "FlexibleDMs",
    description: "Rearrange DMs and group chats and organize them into collapsible folders.",
    authors: [Devs.frisk],
    tags: ["Friends", "Organisation"],
    searchTerms: ["folders", "reorder", "dm"],
    settings,
    patches: [
        {
            // Folder IDs belong to this list, not ChannelStore.
            find: '"dm-quick-launcher"===',
            group: true,
            replacement: [
                {
                    // Leave the original prop in place so PinDMs can still patch its filter.
                    match: /(?<=channels:\i,)privateChannelIds:(\i)[^,]*,listRef:\i,/,
                    replace: "$&...$self.useRows($1),"
                },
                {
                    match: /renderRow(?:",|=)(\i)=>{/,
                    replace: "$&const vcDmfRow=$self.renderRow(this,$1);if(vcDmfRow!==undefined)return vcDmfRow;"
                },
                {
                    // The scroller caches rows separately from the outer DM list.
                    match: /renderRow:this\.renderRow,/,
                    replace: "vcDmfVersion:this.props.vcDmfVersion,renderRow:$self.cachedRenderRow(this),"
                },
                {
                    match: /(reportAnalytics=.{0,300}?let\{privateChannelIds:)(\i)(,channels:\i\}=this.props;)/,
                    replace: "$1$2$3$2=$2.filter(id=>!id.startsWith('dm-folder:'));"
                },
                {
                    match: /scrollToChannel\((\i)\){/,
                    replace: "$&$1=$self.scrollTarget($1,this.props.vcDmfRows);"
                }
            ]
        },
        {
            // Keep Alt+Up/Down consistent with manually ordered chat rows.
            find: ".APPLICATION_STORE&&",
            replacement: {
                // PinDMs may expand the second spread; its plugin lookup brackets are not followed by a comma.
                match: /(?<=\i=__OVERLAY__\?\i:)\[\.\.\.\i\(\),\.\.\..+?\](?=,)/,
                replace: "$self.navigationIds($&)"
            }
        },
        {
            find: "=()=>!1,ensureChatIsVisible:",
            replacement: {
                match: /(?<=\i===\i\.ME\?(?:Vencord\.Plugins\.plugins(?:\.PinDMs|\["PinDMs"\])\.getAllUncollapsedChannels\(\)\.concat\()?)\i\.\i\.getPrivateChannelIds\(\)/,
                replace: "$self.navigationIds($&)"
            }
        }
    ],
    contextMenus: {
        "user-context": contextMenu,
        "gdm-context": contextMenu
    },
    start,
    stop() {
        stop();
        clearDrag();
    },
    flux: {
        LOGOUT: clearDrag,
        CONNECTION_OPEN() {
            clearDrag();
            syncPinnedChats();
        }
    },

    useRows(ids: string[]) {
        useSettings(["plugins.PinDMs.*"]);
        const { accounts, keepFoldersOnTop } = settings.use(["accounts", "keepFoldersOnTop"]);
        const userId = useStateFromStores([UserStore], () => UserStore.getCurrentUser()?.id);
        const selectedId = useStateFromStores([SelectedChannelStore], () => SelectedChannelStore.getChannelId());
        const messagesKey = useStateFromStores([ReadStateStore], () => ids.map(id => ReadStateStore.lastMessageId(id) ?? "0").join(","), [ids]);
        const navigation = `${userId}:${selectedId}`;
        const previousNavigation = useRef<string | undefined>(undefined);
        const reveal = previousNavigation.current !== navigation;
        const pinned = getPinnedIds();
        const nativePinned = getNativePinnedIds().filter(id => ids.includes(id) && !pinned.has(id));
        const allPinned = new Set([...pinned, ...nativePinned]);
        const pinsKey = JSON.stringify([...allPinned]);
        const layout = withoutPinnedChannels(accounts[userId ?? ""] ?? getLayout(), allPinned);
        useEffect(syncPinnedChats, [userId, pinsKey]);
        const selectedParent = layout.folders.find(f => f.channels.includes(selectedId));
        if (reveal && selectedParent && !selectedParent.expanded) markFolderOpening(selectedParent.id);
        // Reveal in the same render as navigation before native scrolling runs.
        const visibleLayout = reveal ? {
            ...layout,
            folders: layout.folders.map(f => f.channels.includes(selectedId) ? { ...f, expanded: true } : f)
        } : layout;
        useEffect(() => {
            previousNavigation.current = navigation;
            const parent = getLayout().folders.find(f => f.channels.includes(selectedId));
            if (parent && !parent.expanded) {
                editFolder(parent.id, { expanded: true });
            }
        }, [navigation]);
        // Include metadata, not just IDs: rename and color edits must invalidate cached rows.
        const version = JSON.stringify([visibleLayout, keepFoldersOnTop, userId, selectedId, messagesKey, ids, getPinDmsState()]);
        return useMemo(() => {
            const rows = getRows(visibleLayout, ids.filter(id => !allPinned.has(id)), getMessages(ids), keepFoldersOnTop);
            const allRows = [...nativePinned.map(id => ({ id })), ...rows];
            return { privateChannelIds: allRows.map(r => r.id), vcDmfRows: allRows, vcDmfVersion: version, vcDmfSection: getDMSection() };
        }, [version]);
    },

    cachedRenderRow(instance: DMList) {
        let cached = renderers.get(instance);
        if (!cached || cached.version !== instance.props.vcDmfVersion || cached.density !== instance.props.density) {
            cached = { version: instance.props.vcDmfVersion, density: instance.props.density, render: args => instance.renderRow(args) };
            renderers.set(instance, cached);
        }
        return cached.render;
    },

    renderRow(instance: DMList, { section, row }: { section: number; row: number; }) {
        if (section !== instance.props.vcDmfSection) return;
        if (isDMSectionCollapsed()) return null;
        const id = instance.props.privateChannelIds[row];
        if (!id) return;
        // Use the same snapshot as the list IDs, including navigation's reveal.
        const data = instance.props.vcDmfRows?.[row];
        if (!data || data.id !== id) return;
        const { folder } = data;
        const height = instance.getRowHeight(section, row);
        return (
            <ErrorBoundary key={id} message="FlexibleDMs could not render this row">
                <DragRow row={data} height={height}>
                    {folder ? <FolderRow folder={folder} /> : instance.renderDM(section, row)}
                </DragRow>
            </ErrorBoundary>
        );
    },

    scrollTarget(id: string | null, rows?: Row[]) {
        if (!id) return id;
        if (rows?.some(r => r.id === id)) return id;
        return rows?.find(r => r.folder?.channels.includes(id))?.id ?? id;
    },

    navigationIds(original: string[]) {
        // Reorder only known chat slots. Preserve static, guild and unknown IDs in place.
        // Include collapsed children: navigating to one reveals its folder in useRows.
        const layout = getLayout();
        const pinned = new Set([...getPinnedIds(), ...getNativePinnedIds()]);
        const rows = getRows({ ...layout, folders: layout.folders.map(f => ({ ...f, expanded: true })) },
            PrivateChannelSortStore.getPrivateChannelIds().filter(id => !pinned.has(id)),
            getMessages(original), settings.store.keepFoldersOnTop);
        const counts = new Map<string, number>();
        for (const id of original) counts.set(id, (counts.get(id) ?? 0) + 1);
        const ordered = rows.filter(r => !r.folder && counts.has(r.id)).flatMap(r => Array<string>(counts.get(r.id)!).fill(r.id));
        const known = new Set(ordered);
        let index = 0;
        return original.map(id => known.has(id) ? ordered[index++] : id);
    }
});
