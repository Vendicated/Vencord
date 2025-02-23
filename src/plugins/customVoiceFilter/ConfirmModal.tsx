/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalRoot, ModalSize } from "@utils/modal";
import { Button, Flex, Forms, Text } from "@webpack/common";

import { modal } from "./utils";

interface ConfirmModalProps {
    message: string;
}

export default modal<ConfirmModalProps, "accept" | "cancel">(function ConfirmModal({ modalProps, message, close }) {
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
                    <Button color={Button.Colors.RED} onClick={() => close("accept")}>Accept</Button>
                    <Button color={Button.Colors.PRIMARY} onClick={() => close("cancel")}>Cancel</Button>
                </Flex>
            </ModalFooter>
        </ModalRoot >
    );
});
