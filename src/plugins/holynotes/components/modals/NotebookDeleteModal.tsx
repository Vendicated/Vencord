/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize } from "@utils/modal";
import { Button, React, Text } from "@webpack/common";
import noteHandler from "plugins/holynotes/noteHandler";

import Error from "./Error";
import { RenderMessage } from "./RenderMessage";

export default ({ onClose, notebook, ...props }: ModalProps & { onClose: () => void; notebook: string; }) => {
    const notes = noteHandler.getNotes(notebook);

    const handleDelete = () => {
        onClose();
        noteHandler.deleteNotebook(notebook);
    };

    return (
        <ModalRoot
            {...props}
            className="vc-delete-notebook"
            size={ModalSize.LARGE}>
            <ModalHeader>
                <Text tag="h3">Confirm Deletion</Text>
                <ModalCloseButton onClick={onClose} />
            </ModalHeader>
            <ModalContent>
                <ErrorBoundary>
                    {notes && Object.keys(notes).length > 0 ? (
                        Object.values(notes).map(note => (
                            <RenderMessage
                                note={note}
                                notebook={notebook}
                                fromDeleteModal={true} />
                        ))
                    ) : (
                        <Error />
                    )}
                </ErrorBoundary>
            </ModalContent>
            <ModalFooter>
                <Button
                    color={Button.Colors.RED}
                    onClick={handleDelete}
                >
                    DELETE
                </Button>
            </ModalFooter>
        </ModalRoot>
    );
};
