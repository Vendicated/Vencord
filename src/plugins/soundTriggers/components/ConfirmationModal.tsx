/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot } from "@utils/modal";
import { Button, Forms, Text } from "@webpack/common";

import { classFactory } from "..";

interface ConfirmationModalProps extends ModalProps {
    message: string;
    onConfirm(): void;
}
export function ConfirmationModal(props: ConfirmationModalProps) {

    return (
        <ModalRoot {...props}>
            <ModalHeader>
                <Forms.FormTitle tag="h4">Confirmation</Forms.FormTitle>
            </ModalHeader>
            <ModalContent>
                <Text style={{ marginTop: "10px" }}>{props.message}</Text>
            </ModalContent>
            <ModalFooter className={classFactory("modal-footer")}>
                <Button
                    color={Button.Colors.GREEN}
                    onClick={() => {
                        props.onConfirm();
                        props.onClose();
                    }}
                >
                    Confirm
                </Button>
                <Button look={Button.Looks.OUTLINED} onClick={props.onClose}>
                    Cancel
                </Button>
            </ModalFooter>

        </ModalRoot>
    );
}
