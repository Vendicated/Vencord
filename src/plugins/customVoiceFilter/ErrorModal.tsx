/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalRoot, ModalSize } from "@utils/modal";
import { Button, Forms, Text } from "@webpack/common";

import { modal } from "./utils";

interface ErrorModalProps {
    message: string;
}

export default modal<ErrorModalProps>(function ErrorModal({ modalProps, close, message }) {
    return (
        <ModalRoot {...modalProps} size={ModalSize.SMALL}>
            <ModalHeader separator={false}>
                <Forms.FormTitle tag="h2" className="modalTitle">
                    Error
                </Forms.FormTitle>
                <ModalCloseButton onClick={close} />
            </ModalHeader>
            <ModalContent className="vc-voice-filters-modal">
                <Text>{message}</Text>
            </ModalContent>
            <ModalFooter>
                <Button onClick={() => close()}>Close</Button>
            </ModalFooter>
        </ModalRoot>
    );
});
