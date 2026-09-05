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

import { clearDrag, DragRow, FolderRow } from "./components";
import { getRows, Row, withoutPinnedChannels } from "./model";
import { getDMSection, getPinDmsVersion, getPinnedIds, isDMSectionCollapsed, isPinned } from "./pinDms";
import { settings } from "./settings";
import { currentRows, drop, editFolder, getLayout, getMessages, removeFromFolder, start, stop, syncPinnedChats } from "./state";

migratePluginSettings("FlexibleDMs", "DMFolders");

interface DMList {
    props: {
        privateChannelIds: string[];
        density?: string;
        vcDmfRows?: Row[];
        vcDmfVersion?: string;
        vcDmfSection?: number;
    };
    renderDM(section: number, row: number): React.ReactNode;
}

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
                    replace: "renderRow:(...args)=>this.renderRow(...args),vcDmfVersion:this.props.vcDmfVersion,"
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
                match: /\[\.\.\.\i\(\),\.\.\..+?\](?=,)/,
                replace: "$self.navigationIds($&)"
            }
        },
        {
            find: "=()=>!1,ensureChatIsVisible:",
            replacement: {
                match: /\i\.\i\.getPrivateChannelIds\(\)/,
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
        const pinsKey = JSON.stringify([...pinned]);
        const layout = withoutPinnedChannels(accounts[userId ?? ""] ?? getLayout(), pinned);
        useEffect(syncPinnedChats, [userId, pinsKey]);
        // Reveal in the same render as navigation before native scrolling runs.
        const visibleLayout = reveal ? {
            ...layout,
            folders: layout.folders.map(f => f.channels.includes(selectedId) ? { ...f, expanded: true } : f)
        } : layout;
        useEffect(() => {
            previousNavigation.current = navigation;
            const parent = getLayout().folders.find(f => f.channels.includes(selectedId));
            if (parent && !parent.expanded) editFolder(parent.id, { expanded: true });
        }, [navigation]);
        // Include metadata, not just IDs: rename and color edits must invalidate cached rows.
        const version = JSON.stringify([visibleLayout, keepFoldersOnTop, userId, messagesKey, ids, getPinDmsVersion()]);
        return useMemo(() => {
            const rows = getRows(visibleLayout, ids.filter(id => !pinned.has(id)), getMessages(ids), keepFoldersOnTop);
            return { privateChannelIds: rows.map(r => r.id), vcDmfRows: rows, vcDmfVersion: version, vcDmfSection: getDMSection() };
        }, [version]);
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
        const height = instance.props.density === "compact" ? 40 : instance.props.density === "default" || !instance.props.density ? 44 : 50;
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
        const allowed = new Set(original);
        const pinned = getPinnedIds();
        // Static destinations and PinDMs categories already have their own order.
        const prefix = original.filter(id => pinned.has(id) || id.startsWith("/"));
        return [...prefix, ...currentRows().filter(r => !r.folder && allowed.has(r.id)).map(r => r.id)];
    }
});
