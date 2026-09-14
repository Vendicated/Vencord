/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { RenderModalProps } from "@vencord/discord-types";
import { Modal, openModal, TextInput, useState } from "@webpack/common";
import type { FC, KeyboardEvent } from "react";

import { addCategory, type GifCategory, renameCategory } from "./data";

interface CreateCategoryModalProps {
    modalProps: RenderModalProps;
    category?: GifCategory;
    onSubmitted: () => void;
}

const CreateCategoryModal: FC<CreateCategoryModalProps> = ({ modalProps, category, onSubmitted }) => {
    const [name, setName] = useState(category?.name ?? "");
    const isEdit = category != null;

    async function submit() {
        const trimmed = name.trim();

        if (!trimmed) {
            return;
        }

        if (isEdit) {
            await renameCategory(category.id, trimmed);
        } else {
            await addCategory(trimmed);
        }

        onSubmitted();
        modalProps.onClose();
    }

    return (
        <Modal
            {...modalProps}
            title={isEdit ? "Rename Category" : "New Category"}
            actions={[
                { text: "Cancel", variant: "secondary", onClick: modalProps.onClose },
                { text: isEdit ? "Save" : "Create", variant: "primary", onClick: submit, disabled: !name.trim() }
            ]}
        >
            <TextInput
                value={name}
                onChange={setName}
                placeholder="e.g. Reactions"
                autoFocus
                maxLength={25}
                onKeyDown={(e: KeyboardEvent) => { if (e.key === "Enter") submit(); }}
            />
        </Modal>
    );
};

export function openCreateCategoryModal(onCreated: () => void): void {
    openModal(props => <CreateCategoryModal modalProps={props} onSubmitted={onCreated} />);
}

export function openRenameCategoryModal(category: GifCategory, onRenamed: () => void): void {
    openModal(props => <CreateCategoryModal modalProps={props} category={category} onSubmitted={onRenamed} />);
}
