/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { SettingsStore } from "@api/Settings";
import { findStoreLazy } from "@webpack";
import { ReadStateStore, UserStore } from "@webpack/common";

import { emptyLayout, Folder, getRows, Layout, move, Placement, resetLayoutOrder, withoutPinnedChannels } from "./model";
import { getPinnedIds, isPinned } from "./pinDms";
import { settings } from "./settings";

export const PrivateChannelSortStore = findStoreLazy("PrivateChannelSortStore") as { getPrivateChannelIds(): string[]; };
export const accountId = () => UserStore.getCurrentUser()?.id;
export const getLayout = (): Layout => settings.store.accounts[accountId() ?? ""] ?? emptyLayout();
export const getMessages = (ids: string[]) => Object.fromEntries(ids.map(id => [id, ReadStateStore.lastMessageId(id) ?? "0"]));

export function currentRows() {
    const pinned = getPinnedIds();
    const ids = PrivateChannelSortStore.getPrivateChannelIds().filter(id => !pinned.has(id));
    return getRows(getLayout(), ids, getMessages(ids), settings.store.keepFoldersOnTop);
}

export function save(layout: Layout, userId = accountId()) {
    if (!userId || userId !== accountId()) return;
    settings.store.accounts = JSON.parse(JSON.stringify({ ...settings.store.accounts, [userId]: layout }));
}

export function editFolder(id: string, update: Partial<Pick<Folder, "name" | "color" | "expanded">>, userId = accountId()) {
    const layout = getLayout();
    save({ ...layout, folders: layout.folders.map(f => f.id === id ? { ...f, ...update } : f) }, userId);
}

export function closeAll() {
    const layout = getLayout();
    save({ ...layout, folders: layout.folders.map(f => ({ ...f, expanded: false })) });
}

export function drop(source: string, target: string, placement: Placement) {
    if (isPinned(source) || isPinned(target)) return;
    const rows = currentRows();
    if (!rows.some(r => r.id === target)) {
        const folder = getLayout().folders.find(f => f.id === target);
        if (folder) rows.push({ id: target, folder });
    }
    if (!rows.some(r => r.id === source)) {
        const parent = getLayout().folders.find(f => f.channels.includes(source));
        if (parent && PrivateChannelSortStore.getPrivateChannelIds().includes(source)) rows.push({ id: source, parent });
    }
    const layout = move(getLayout(), rows, source, target, placement, `dm-folder:${crypto.randomUUID()}`);
    layout.seen = getMessages(PrivateChannelSortStore.getPrivateChannelIds());
    save(layout);
}

export function removeFromFolder(channelId: string) {
    const rows = currentRows();
    const parent = rows.find(r => r.id === channelId)?.parent ?? getLayout().folders.find(f => f.channels.includes(channelId));
    if (!parent) return;
    // A collapsed child is not in rows, so expose it only to the move operation.
    if (!rows.some(r => r.id === channelId)) rows.push({ id: channelId, parent });
    const layout = move(getLayout(), rows, channelId, parent.id, "after", "");
    layout.seen = getMessages(PrivateChannelSortStore.getPrivateChannelIds());
    save(layout);
}

export function dissolveFolder(id: string) {
    const layout = getLayout();
    const folder = layout.folders.find(f => f.id === id);
    if (!folder) return;
    const order = currentRows().filter(r => !r.parent).flatMap(r => r.id === id ? folder.channels : [r.id]);
    save({ ...layout, folders: layout.folders.filter(f => f.id !== id), order, seen: getMessages(PrivateChannelSortStore.getPrivateChannelIds()) });
}

export function syncPinnedChats() {
    const layout = getLayout();
    const next = withoutPinnedChannels(layout, getPinnedIds());
    if (next !== layout) save(next);
}

export function resetOrder() {
    save(resetLayoutOrder(getLayout()));
}

export function start() {
    if (!settings.store.persistence) {
        // Reset every account, including ones that are not logged in yet.
        settings.store.accounts = JSON.parse(JSON.stringify(Object.fromEntries(
            Object.entries(settings.store.accounts).map(([id, layout]) => [id, resetLayoutOrder(layout)])
        )));
    }
    SettingsStore.addChangeListener("plugins.PinDMs.userBasedCategoryList", syncPinnedChats);
    syncPinnedChats();
}

export function stop() {
    SettingsStore.removeChangeListener("plugins.PinDMs.userBasedCategoryList", syncPinnedChats);
}
