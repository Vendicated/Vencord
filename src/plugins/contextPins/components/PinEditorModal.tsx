/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import {
    ContextPinsConflictError,
    MAX_NOTE_LENGTH,
    normalizeNote,
    normalizeTags,
    type PinKey,
    type PinSnapshot,
    type StoredPin,
    upsertPin,
} from "@plugins/contextPins/storage";
import type { RenderModalProps } from "@vencord/discord-types";
import { Forms, Modal, Text, TextArea, TextInput, Timestamp, Toasts, useState } from "@webpack/common";

export interface PinEditorTarget {
    key: PinKey;
    snapshot: PinSnapshot;
    note: string;
    tags: string[];
    expectedRevision: number | null;
}

interface Props {
    modalProps: RenderModalProps;
    target: PinEditorTarget;
    onSaved?(pin: StoredPin): void;
}

function SnapshotPreview({ snapshot }: { snapshot: PinSnapshot; }) {
    const indicators = [
        snapshot.attachmentCount && `${snapshot.attachmentCount} attachment${snapshot.attachmentCount === 1 ? "" : "s"}`,
        snapshot.embedCount && `${snapshot.embedCount} embed${snapshot.embedCount === 1 ? "" : "s"}`,
        snapshot.stickerCount && `${snapshot.stickerCount} sticker${snapshot.stickerCount === 1 ? "" : "s"}`,
    ].filter(Boolean);

    return (
        <div className="vc-context-pins-editor-preview">
            <div className="vc-context-pins-editor-author">{snapshot.authorName}</div>
            <div className="vc-context-pins-editor-location">
                {snapshot.guildName ? `${snapshot.guildName} · ` : ""}{snapshot.channelName}
                <span> · </span>
                <Timestamp timestamp={new Date(snapshot.messageTimestamp)} />
            </div>
            <div className="vc-context-pins-editor-content">
                {snapshot.content || <span className="vc-context-pins-muted">No text content</span>}
            </div>
            {indicators.length > 0 && (
                <div className="vc-context-pins-editor-indicators">{indicators.join(" · ")}</div>
            )}
        </div>
    );
}

export default function PinEditorModal({ modalProps, target, onSaved }: Props) {
    const isEdit = target.expectedRevision !== null;
    const [note, setNote] = useState(target.note);
    const [tagsInput, setTagsInput] = useState(target.tags.join(", "));
    const [saving, setSaving] = useState(false);
    const [notice, setNotice] = useState<string>();

    const noteResult = normalizeNote(note);
    const tagsResult = normalizeTags(tagsInput);
    const validationNotice = noteResult.error || tagsResult.error;

    async function save() {
        if (validationNotice || saving) return;

        setSaving(true);
        setNotice(undefined);
        try {
            const pin = await upsertPin({
                key: target.key,
                snapshot: target.snapshot,
                note: noteResult.note,
                tags: tagsResult.tags,
            }, target.expectedRevision);

            onSaved?.(pin);
            Toasts.show({
                message: isEdit ? "Context Pin updated." : "Message saved to Context Pins.",
                type: Toasts.Type.SUCCESS,
                id: Toasts.genId(),
            });
            modalProps.onClose();
        } catch (error) {
            if (error instanceof ContextPinsConflictError) {
                setNotice(error.message);
            } else {
                setNotice("Context Pins could not save this change. Check the console for details.");
            }
        } finally {
            setSaving(false);
        }
    }

    return (
        <Modal
            {...modalProps}
            title={isEdit ? "Edit Context Pin" : "Save to Context Pins"}
            subtitle="This message is stored locally on this Discord installation."
            actions={[
                {
                    text: "Cancel",
                    variant: "secondary",
                    onClick: modalProps.onClose,
                    disabled: saving,
                },
                {
                    text: isEdit ? "Save changes" : "Save",
                    variant: "primary",
                    onClick: () => void save(),
                    disabled: Boolean(validationNotice) || saving,
                    loading: saving,
                },
            ]}
            notice={(notice || validationNotice) ? { message: notice || validationNotice!, type: "critical" } : undefined}
        >
            <div className="vc-context-pins-editor">
                <Forms.FormTitle tag="h5">Message</Forms.FormTitle>
                <SnapshotPreview snapshot={target.snapshot} />

                <Forms.FormTitle tag="h5">Note</Forms.FormTitle>
                <TextArea
                    value={note}
                    onChange={setNote}
                    placeholder="Add a personal note (optional)"
                    maxLength={MAX_NOTE_LENGTH}
                    autosize
                />
                <div className="vc-context-pins-field-hint">{note.length}/{MAX_NOTE_LENGTH}</div>

                <Forms.FormTitle tag="h5">Tags</Forms.FormTitle>
                <TextInput
                    value={tagsInput}
                    onChange={setTagsInput}
                    placeholder="reference, todo, important"
                    aria-label="Context Pin tags"
                />
                <Text variant="text-xs/normal" className="vc-context-pins-field-hint">
                    Separate tags with commas. Up to 20 tags, 32 characters each.
                </Text>
            </div>
        </Modal>
    );
}
