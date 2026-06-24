/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { RenderModalProps } from "@vencord/discord-types";
import { Modal, openModal, React, TextInput, useState } from "@webpack/common";
import type { FC, KeyboardEvent } from "react";

import { addCategory } from "./data";

interface CreateCategoryModalProps {
    modalProps: RenderModalProps;
    onCreated: () => void;
}

const CreateCategoryModal: FC<CreateCategoryModalProps> = ({ modalProps, onCreated }) => {
    const [name, setName] = useState("");

    async function submit() {
        const trimmed = name.trim();

        if (!trimmed) {
            return;
        }

        await addCategory(trimmed);
        onCreated();
        modalProps.onClose();
    }

    return (
        <Modal
            {...modalProps}
            title="New Category"
            actions={[
                { text: "Cancel", variant: "secondary", onClick: modalProps.onClose },
                { text: "Create", variant: "primary", onClick: submit, disabled: !name.trim() }
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
    openModal(props => <CreateCategoryModal modalProps={props} onCreated={onCreated} />);
}
