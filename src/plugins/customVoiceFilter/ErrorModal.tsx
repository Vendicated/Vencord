/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { closeModal, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { Button, Forms, Text } from "@webpack/common";
import { JSX } from "react";


// Open Error Modal
export function openErrorModal(message: string): string {
    const key = openModal(modalProps => (
        <ErrorModal
            modalProps={modalProps}
            message={message}
            close={() => closeModal(key)}
        />
    ));
    return key;
}

interface ErrorModalProps {
    modalProps: ModalProps;
    message: string;
    close: () => void;
}

function ErrorModal({ modalProps, close, message }: ErrorModalProps): JSX.Element {
    return (
        <ModalRoot {...modalProps} size={ModalSize.SMALL}>
            <ModalHeader separator={false}>
                <Forms.FormTitle tag="h2" className="modalTitle">
                    Error
                </Forms.FormTitle>
                <ModalCloseButton onClick={close} />
            </ModalHeader>
            <ModalContent style={{ paddingBlock: "0.5rem" }}>
                <Text>{message}</Text>
            </ModalContent>
            <ModalFooter>
                <Button onClick={close}>Close</Button>
            </ModalFooter>
        </ModalRoot>
    );
}
