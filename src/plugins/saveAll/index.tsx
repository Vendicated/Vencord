/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { BaseText } from "@components/BaseText";
import { Button } from "@components/Button";
import { Flex } from "@components/Flex";
import { Devs } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { ChannelStore, Checkbox, Menu, React, useState } from "@webpack/common";
import { Zippable, zipSync } from "fflate";

const cl = classNameFactory("vc-saveall-");

const SaveIcon = () => (
    <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2a1 1 0 0 1 1 1v10.586l3.293-3.293a1 1 0 1 1 1.414 1.414l-5 5a1 1 0 0 1-1.414 0l-5-5a1 1 0 1 1 1.414-1.414L11 13.586V3a1 1 0 0 1 1-1Z" />
        <path d="M3 20a1 1 0 1 0 0 2h18a1 1 0 1 0 0-2H3Z" />
    </svg>
);

const FileIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" opacity={0.5}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" />
    </svg>
);

interface DownloadModalProps extends ModalProps {
    attachments: any[];
}

// Idk why, but fetch breaks on large files so we use good old XHR
// the downside that there is no streaming/progress, but stability matters more here
async function fetchAsBytes(url: string): Promise<Uint8Array> {
    const safeUrl = url + (url.includes("?") ? "&" : "?") + "_vctype=bin";

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("GET", safeUrl, true);
        xhr.responseType = "arraybuffer";
        xhr.onload = () => {
            if (xhr.status === 200 || xhr.status === 206) {
                resolve(new Uint8Array(xhr.response));
            } else {
                reject(new Error(`HTTP ${xhr.status}`));
            }
        };
        xhr.onerror = () => reject(new Error("XHR network error"));
        xhr.send();
    });
}

// Turn bytes into a blob and trigger a native save dialog
// always using a blob URL so the download attribute works cross-origin
// could probably be cleaner, but this is the most consistent method across browsers and Electron that i've found
function triggerSave(data: Uint8Array, filename: string, mimeType = "application/octet-stream"): void {
    const blob = new Blob([data as BlobPart], { type: mimeType });
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
}

async function saveSingle(url: string, filename: string): Promise<void> {
    const data = await fetchAsBytes(url);
    triggerSave(data, filename);
}

async function saveMultiple(attachments: any[], indices: number[]): Promise<void> {
    const files: Zippable = {};
    const usedNames = new Set<string>();

    // Loads everything into memory before zipping, cuz fflate doesn't support streaming, so whatever
    for (const idx of indices) {
        const att = attachments[idx];
        const data = await fetchAsBytes(att.url);

        // Duped filenames would overwrite each other inside the zip so handle that
        let name = att.filename ?? `attachment_${idx}`;
        if (usedNames.has(name)) {
            const dot = name.lastIndexOf(".");
            const base = dot !== -1 ? name.slice(0, dot) : name;
            const ext = dot !== -1 ? name.slice(dot) : "";
            name = `${base}_${idx}${ext}`;
        }

        usedNames.add(name);
        files[name] = data;
    }

    if (!Object.keys(files).length) return;

    // todo: Maybe make this streaming someday xd
    const zipdta = zipSync(files);
    triggerSave(zipdta, "Attachments.zip", "application/zip");
}

// No idea if these sizes are right, but looks fine to me
function getModalConfig(count: number): { size: ModalSize; gridSize: number; columns: number; } {
    if (count <= 3) return { size: ModalSize.SMALL, gridSize: 80, columns: 2 };
    if (count <= 5) return { size: ModalSize.MEDIUM, gridSize: 90, columns: 3 };
    if (count <= 7) return { size: ModalSize.LARGE, gridSize: 100, columns: 4 };
    if (count <= 9) return { size: ModalSize.LARGE, gridSize: 110, columns: 5 };
    return { size: ModalSize.DYNAMIC, gridSize: 120, columns: 99 };
}

function Thumb({ att, selected, onToggle }: { att: any; selected: boolean; onToggle(): void; }) {
    const isImage = att.content_type?.startsWith("image/") ||
        /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(att.url);

    return (
        <div
            role="checkbox"
            aria-checked={selected}
            onClick={onToggle}
            className={cl("thumb", selected ? "thumb-selected" : "thumb-unselected")}
        >
            {isImage ? (
                <img
                    src={att.url}
                    alt={att.filename}
                    className={cl("thumb-img")}
                />
            ) : (
                <div className={cl("thumb-file")}>
                    <FileIcon />
                    {att.filename?.slice(0, 18) ?? "file"}
                </div>
            )}

            <div className={cl("thumb-checkbox")}>
                {selected && (
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                )}
            </div>
        </div>
    );
}

function DownloadModal({ attachments, ...props }: DownloadModalProps) {
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [saving, setSaving] = useState(false);

    const modalConfig = getModalConfig(attachments.length);
    const { size, gridSize, columns } = modalConfig;

    const allSelected = selected.size === attachments.length;
    const count = selected.size;

    const toggle = (i: number) => {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(i) ? next.delete(i) : next.add(i);
            return next;
        });
    };

    const selectAll = () => {
        setSelected(allSelected ? new Set() : new Set(attachments.map((_, i) => i)));
    };

    const save = async () => {
        if (!count || saving) return;
        setSaving(true);
        try {
            const indices = [...selected];
            if (indices.length === 1) {
                const att = attachments[indices[0]];
                await saveSingle(att.url, att.filename ?? "attachment");
            } else {
                await saveMultiple(attachments, indices);
            }
        } finally {
            setSaving(false);
            props.onClose();
        }
    };

    let saveLabel = "Save";
    if (saving) saveLabel = "Saving...";
    else if (count > 1) saveLabel = `Save ${count} as zip`;
    else if (count === 1) saveLabel = "Save file";

    return (
        <ModalRoot {...props} size={size}>
            <ModalHeader separator>
                <BaseText size="lg" weight="semibold" style={{ flexGrow: 1 }}>Save Attachments</BaseText>
                <ModalCloseButton onClick={props.onClose} />
            </ModalHeader>

            <ModalContent>
                <div className={cl("content")}>
                    <div
                        className={cl("grid")}
                        style={{
                            gridTemplateColumns: `repeat(${columns === 99 ? "auto-fill" : `min(${columns}, ${attachments.length})`}, minmax(${gridSize}px, 1fr))`,
                        }}
                    >
                        {attachments.map((att, i) => (
                            <Thumb
                                key={i}
                                att={att}
                                selected={selected.has(i)}
                                onToggle={() => toggle(i)}
                            />
                        ))}
                    </div>
                    <Checkbox
                        value={allSelected}
                        onChange={selectAll}
                    >
                        <BaseText size="sm">Select all ({attachments.length})</BaseText>
                    </Checkbox>
                </div>
            </ModalContent>

            <ModalFooter>
                <Flex gap={8}>
                    <Button variant="secondary" onClick={props.onClose}>Cancel</Button>
                    <Button onClick={save} disabled={!count || saving}>{saveLabel}</Button>
                </Flex>
            </ModalFooter>
        </ModalRoot>
    );
}

function openDownloadModal(attachments: any[]) {
    openModal(props => <DownloadModal {...props} attachments={attachments} />);
}

const messageContextMenuPatch: NavContextMenuPatchCallback = (children, { message }) => {
    if (!message?.attachments?.length) return;

    children.push(
        <Menu.MenuItem
            id="vencord-save-all"
            label="Save Attachments"
            action={() => {
                if (message.attachments.length === 1) {
                    const att = message.attachments[0];
                    saveSingle(att.url, att.filename ?? "attachment");
                } else {
                    openDownloadModal(message.attachments);
                }
            }}
            icon={SaveIcon}
        />
    );
};

export default definePlugin({
    name: "SaveAll",
    description: "Save multiple message attachments at once",
    authors: [Devs.omar, Devs.paige],
    tags: ["Utility", "Media"],
    contextMenus: {
        "message": messageContextMenuPatch,
    },

    // 1 attachment = instant save, no modal -- 2+ = selection modal
    messagePopoverButton: {
        icon: SaveIcon,
        render(message) {
            if (!message?.attachments?.length) return null;

            return {
                label: "Save Attachments",
                icon: SaveIcon,
                message,
                channel: ChannelStore.getChannel(message.channel_id),
                onClick: () => {
                    if (message.attachments.length === 1) {
                        const att = message.attachments[0];
                        saveSingle(att.url, att.filename ?? "attachment");
                    } else {
                        openDownloadModal(message.attachments);
                    }
                },
            };
        }
    }
});
