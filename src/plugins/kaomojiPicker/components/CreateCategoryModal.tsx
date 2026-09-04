/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { getCategories } from "@plugins/kaomojiPicker/data/kaomoji";
import { RenderModalProps } from "@vencord/discord-types";
import { Modal, openModal, TextInput, useState } from "@webpack/common";

export function openCreateCategoryModal(onConfirm: (name: string) => void) {
    openModal(modalProps => (
        <CreateCategoryModal modalProps={modalProps} onConfirm={onConfirm} />
    ));
}

function CreateCategoryModal({ modalProps, onConfirm }: { modalProps: RenderModalProps; onConfirm: (name: string) => void; }) {
    const [name, setName] = useState("");

    const trimmed = name.trim();
    const isDuplicate = getCategories().some(c => c.toLowerCase() === trimmed.toLowerCase());
    const canSubmit = Boolean(trimmed && !isDuplicate);

    function handleConfirm() {
        if (!canSubmit) return;
        onConfirm(trimmed);
        modalProps.onClose();
    }

    return (
        <Modal
            {...modalProps}
            title="Create new Category"
            actions={[
                {
                    text: "Cancel",
                    variant: "secondary",
                    onClick: modalProps.onClose
                },
                {
                    text: "Create",
                    variant: "primary",
                    disabled: !canSubmit,
                    onClick: handleConfirm
                }
            ]}
        >
            <form
                onSubmit={e => {
                    e.preventDefault();
                    handleConfirm();
                }}
            >
                <TextInput
                    value={name}
                    onChange={setName}
                    placeholder="Cats"
                    autoFocus
                    error={isDuplicate ? "This category already exists" : undefined}
                />
            </form>
        </Modal>
    );
}
