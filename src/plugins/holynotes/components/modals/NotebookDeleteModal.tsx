/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalRoot, ModalSize } from "@utils/modal";
import { Button, React, Text } from "@webpack/common";
import noteHandler from "plugins/holynotes/noteHandler";

import Error from "./Error";
import { RenderMessage } from "./RenderMessage";

export default ({ onClose, notebook, ...props }: { onClose: () => void; notebook: string; }) => {
    const [notes, setNotes] = React.useState({});

    React.useEffect(() => {
        const update = async () => {
            const notes = await noteHandler.getNotes(notebook);
            setNotes(notes);
        };
        update();
    }, []);

    if (!notes) return <></>;

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
                    {Object.keys(notes).length === 0 || !notes ? (
                        <Error />
                    ) : (
                        Object.values(notes).map(note => (
                            <RenderMessage
                                note={note}
                                notebook={notebook}
                                fromDeleteModal={true} />
                        ))
                    )}
                </ErrorBoundary>
            </ModalContent>
            <ModalFooter>
                <Button
                    color={Button.Colors.RED}
                    onClick={() => {
                        noteHandler.deleteNotebook(notebook);
                        onClose();
                    }}
                >
                    DELETE
                </Button>
            </ModalFooter>
        </ModalRoot>
    );
};
