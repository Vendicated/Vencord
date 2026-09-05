/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { FolderIcon } from "@components/Icons";
import { classes } from "@utils/misc";
import { RenderModalProps } from "@vencord/discord-types";
import { ChannelStore, ContextMenuApi, FluxDispatcher, IconUtils, Menu, Modal, openModal, React, ReadStateStore, SelectedChannelStore, TextInput, UserStore, useState, useStateFromStores } from "@webpack/common";

import { Folder, Placement, Row } from "./model";
import { accountId, closeAll, dissolveFolder, drop, editFolder, PrivateChannelSortStore } from "./state";

const DRAG_TYPE = "application/x-vencord-dm-folder";
let dragging: { id: string; userId: string | undefined; folder: boolean; } | undefined;

export function clearDrag() {
    dragging = undefined;
}

const DEFAULT_COLOR = 0x5865f2;
const SWATCHES = [
    1752220, 3066993, 3447003, 10181046, 15277667, 15844367, 15105570, 15158332, 9807270, 6323595,
    1146986, 2067276, 2123412, 7419530, 11342935, 12745742, 11027200, 10038562, 9936031, 5533306
];

function FolderColorPicker({ color, onChange }: { color: number; onChange(color: number): void; }) {
    const hex = `#${color.toString(16).padStart(6, "0")}`;
    const check = (
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path d="m5 12 4 4L19 6" fill="none" stroke="currentColor" strokeWidth="3" />
        </svg>
    );
    return (
        <div className="vc-dmf-colors" role="group" aria-label="Folder Color">
            <div className="vc-dmf-color-buttons">
                <button
                    type="button"
                    className="vc-dmf-color-large"
                    style={{ backgroundColor: "#5865f2" }}
                    aria-label="Default color"
                    aria-pressed={color === DEFAULT_COLOR}
                    onClick={() => onChange(DEFAULT_COLOR)}
                >
                    {color === DEFAULT_COLOR && check}
                </button>
                <label className="vc-dmf-color-large vc-dmf-custom-color" style={{ backgroundColor: hex }} title="Custom color">
                    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="m4 16 12-12 4 4L8 20H4Zm10-10 4 4" fill="none" stroke="currentColor" strokeWidth="2" />
                    </svg>
                    <input type="color" value={hex} onChange={e => onChange(parseInt(e.target.value.slice(1), 16))} aria-label="Custom folder color" />
                </label>
            </div>
            <div className="vc-dmf-swatches">
                {SWATCHES.map(value => (
                    <button
                        key={value}
                        type="button"
                        className="vc-dmf-swatch"
                        style={{ backgroundColor: `#${value.toString(16).padStart(6, "0")}` }}
                        aria-label={`Color #${value.toString(16).padStart(6, "0")}`}
                        aria-pressed={color === value}
                        onClick={() => onChange(value)}
                    >
                        {color === value && check}
                    </button>
                ))}
            </div>
        </div>
    );
}

function FolderSettings({ folder, modalProps, userId }: { folder: Folder; modalProps: RenderModalProps; userId: string | undefined; }) {
    const [name, setName] = useState(folder.name);
    const [color, setColor] = useState(parseInt(folder.color.slice(1), 16));
    const save = () => {
        if (!name.trim()) return;
        editFolder(folder.id, { name: name.trim(), color: `#${color.toString(16).padStart(6, "0")}` }, userId);
        modalProps.onClose();
    };
    return (
        <Modal
            {...modalProps}
            title="Folder Settings"
            actions={[
                { text: "Done", variant: "primary", disabled: !name.trim(), onClick: save }
            ]}
        >
            <form className="vc-dmf-settings" onSubmit={e => { e.preventDefault(); save(); }}>
                <label htmlFor="vc-dmf-name">Folder Name</label>
                <TextInput id="vc-dmf-name" value={name} onChange={setName} maxLength={100} autoFocus />
                <span>Folder Color</span>
                <FolderColorPicker color={color} onChange={setColor} />
            </form>
        </Modal>
    );
}

export function openFolderSettings(folder: Folder) {
    const userId = accountId();
    openModal(modalProps => (
        <ErrorBoundary message="FlexibleDMs could not open Folder Settings">
            <FolderSettings folder={folder} modalProps={modalProps} userId={userId} />
        </ErrorBoundary>
    ));
}

function markFolderRead(folder: Folder) {
    const active = new Set(PrivateChannelSortStore.getPrivateChannelIds());
    const channels = folder.channels.filter(id => active.has(id) && ReadStateStore.hasUnread(id)).map(channelId => ({
        channelId,
        messageId: ReadStateStore.lastMessageId(channelId),
        readStateType: 0
    })).filter(c => c.messageId);
    if (channels.length) FluxDispatcher.dispatch({ type: "BULK_ACK", context: "APP", channels });
}

function folderMenu(event: React.MouseEvent, folder: Folder) {
    ContextMenuApi.openContextMenu(event, () => (
        <Menu.Menu navId="vc-dmf-folder" aria-label="DM Folder" onClose={ContextMenuApi.closeContextMenu}>
            <Menu.MenuItem id="vc-dmf-read" label="Mark Folder As Read" action={() => markFolderRead(folder)} />
            <Menu.MenuSeparator />
            <Menu.MenuItem id="vc-dmf-settings" label="Folder Settings" action={() => openFolderSettings(folder)} />
            <Menu.MenuItem id="vc-dmf-close-all" label="Close All Folders" action={closeAll} />
            <Menu.MenuSeparator />
            <Menu.MenuItem id="vc-dmf-dissolve" label="Ungroup Folder" action={() => dissolveFolder(folder.id)} />
        </Menu.Menu>
    ));
}

function avatar(id: string) {
    const channel = ChannelStore.getChannel(id);
    if (!channel) return;
    const recipient = channel.getRecipientId();
    if (channel.isDM()) return recipient ? UserStore.getUser(recipient)?.getAvatarURL(undefined, 32, false) : undefined;
    return IconUtils.getChannelIconURL({ id, icon: channel.icon, size: 32 });
}

export function FolderRow({ folder }: { folder: Folder; }) {
    const active = new Set(PrivateChannelSortStore.getPrivateChannelIds());
    const ids = folder.channels.filter(id => active.has(id));
    const unread = useStateFromStores([ReadStateStore], () => ids.some(id => ReadStateStore.hasUnread(id)));
    const mentions = useStateFromStores([ReadStateStore], () => ids.reduce((sum, id) => sum + ReadStateStore.getMentionCount(id), 0));
    const selected = useStateFromStores([SelectedChannelStore], () => ids.includes(SelectedChannelStore.getChannelId()));
    useStateFromStores([UserStore, ChannelStore], () => ids.map(id => avatar(id)).join("|"));
    return (
        <button
            type="button"
            className={classes("vc-dmf-folder", unread && "vc-dmf-unread", selected && "vc-dmf-selected")}
            aria-expanded={folder.expanded}
            aria-label={`${folder.name}, ${ids.length} chats${unread ? ", unread" : ""}${mentions ? `, ${mentions} mentions` : ""}`}
            title={folder.name}
            onClick={() => editFolder(folder.id, { expanded: !folder.expanded })}
            onKeyDown={e => {
                if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                    e.preventDefault();
                    editFolder(folder.id, { expanded: e.key === "ArrowRight" });
                }
            }}
            onContextMenu={e => folderMenu(e, folder)}
        >
            <span className="vc-dmf-icon" style={{ "--vc-dmf-color": folder.color } as React.CSSProperties} aria-hidden="true">
                {folder.expanded ? <FolderIcon width={20} height={20} /> : (
                    <span className="vc-dmf-mosaic">
                        {ids.slice(0, 4).map(id => {
                            const src = avatar(id);
                            return src ? <img key={id} src={src} alt="" draggable={false} /> : <span key={id} className="vc-dmf-avatar-fallback">#</span>;
                        })}
                    </span>
                )}
            </span>
            <span className="vc-dmf-nameplate">
                <span className="vc-dmf-name">{folder.name}</span>
                <span className="vc-dmf-description">{ids.length} {ids.length === 1 ? "chat" : "chats"}</span>
            </span>
            {mentions > 0 && <span className="vc-dmf-badge" aria-hidden="true">{mentions > 99 ? "99+" : mentions}</span>}
            <svg className={classes("vc-dmf-chevron", folder.expanded && "vc-dmf-chevron-open")} width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                <path d="m9 5 7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
        </button>
    );
}

export function DragRow({ row, height, children }: React.PropsWithChildren<{ row: Row; height: number; }>) {
    const [over, setOver] = useState<Placement | null>(null);
    const getPlacement = (event: React.DragEvent<HTMLDivElement>): Placement | null => {
        if (!dragging || dragging.id === row.id || dragging.userId !== accountId() || !event.dataTransfer.types.includes(DRAG_TYPE)) return null;
        if (dragging.folder && row.parent) return null;
        const rect = event.currentTarget.getBoundingClientRect();
        const ratio = (event.clientY - rect.top) / rect.height;
        const placement = ratio < 0.25 ? "before" : ratio > 0.75 ? "after" : "inside";
        if (dragging.folder && placement === "inside") return ratio < 0.5 ? "before" : "after";
        return placement;
    };
    return (
        <div
            className={classes("vc-dmf-row", row.parent && "vc-dmf-child", row.folder?.expanded && "vc-dmf-expanded")}
            style={{ height, "--vc-dmf-color": (row.parent ?? row.folder)?.color } as React.CSSProperties}
            data-dmf-drop={over ?? undefined}
            draggable
            onDragStartCapture={e => {
                if ((e.target as HTMLElement).closest("button[aria-label*=Close],input")) {
                    e.preventDefault();
                    return;
                }
                dragging = { id: row.id, userId: accountId(), folder: !!row.folder };
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData(DRAG_TYPE, row.id);
                e.dataTransfer.setData("text/plain", row.folder?.name ?? row.id);
                e.dataTransfer.setDragImage(e.currentTarget, 24, height / 2);
                // Override native link/image dragging inside Discord's channel row.
                e.stopPropagation();
            }}
            onDragEnd={() => { clearDrag(); setOver(null); }}
            onDragOver={e => {
                const placement = getPlacement(e);
                setOver(placement);
                if (!placement) return;
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = "move";
            }}
            onDragLeave={e => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(null);
            }}
            onDrop={e => {
                const placement = getPlacement(e);
                const source = dragging;
                clearDrag();
                setOver(null);
                if (!placement || !source) return;
                e.preventDefault();
                e.stopPropagation();
                drop(source.id, row.id, placement);
            }}
        >
            {children}
        </div>
    );
}
