/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ModalCloseButton, ModalContent, ModalHeader, ModalRoot, openModal } from "@utils/modal";
import { Forms } from "@webpack/common";

import { Auth } from "../auth";

// TODO
function Modal() {
    const blocks = Auth?.user?.blockedUsers;
    if (!blocks) return <Forms.FormText>You are not authorized!</Forms.FormText>;
    if (!blocks.length) return <Forms.FormText>No users blocked.</Forms.FormText>;

    const elements = blocks.map(b => {
        return b;
    });

    return <>{elements}</>;
}

export function openBlockModal() {
    openModal(modalProps => (
        <ModalRoot {...modalProps}>
            <ModalHeader>
                <Forms.FormTitle>Blocked Users</Forms.FormTitle>
                <ModalCloseButton onClick={modalProps.onClose} />
            </ModalHeader>
            <ModalContent>
                <Modal />
            </ModalContent>
        </ModalRoot>
    ));
}
