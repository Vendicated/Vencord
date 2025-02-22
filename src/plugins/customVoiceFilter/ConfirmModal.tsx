/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { closeModal, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { Button, Flex, Forms, Text } from "@webpack/common";
import { JSX } from "react";

// Open Confirm Modal
export function openConfirmModal(message: string, accept: (key: string) => void): string {
    const key = openModal(modalProps => (
        <ConfirmModal
            modalProps={modalProps}
            message={message}
            accept={() => accept(key)}
            close={() => closeModal(key)}
        />
    ));
    return key;
}

interface ConfirmModalProps {
    modalProps: ModalProps;
    message: string;
    accept: () => void;
    close: () => void;
}

function ConfirmModal({ modalProps, message, accept, close }: ConfirmModalProps): JSX.Element {
    return (
        <ModalRoot {...modalProps} size={ModalSize.SMALL}>
            <ModalHeader separator={false}>
                <Forms.FormTitle tag="h2" className="modalTitle">
                    Confirm
                </Forms.FormTitle>
                <ModalCloseButton onClick={close} />
            </ModalHeader>
            <ModalContent className="vc-voice-filters-modal">
                <Text>{message}</Text>
            </ModalContent>
            <ModalFooter>
                <Flex style={{ gap: "10px" }}>
                    <Button color={Button.Colors.RED} onClick={() => { accept(); close(); }}>Accept</Button>
                    <Button color={Button.Colors.PRIMARY} onClick={close}>Cancel</Button>
                </Flex>
            </ModalFooter>
        </ModalRoot >
    );
}
