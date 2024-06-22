/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize } from "@utils/modal";
import { Button, React, Text, TextInput } from "@webpack/common";

import noteHandler from "../../NoteHandler";

export default (props: ModalProps & { onClose: () => void; }) => {
    const [notebookName, setNotebookName] = React.useState("");

    const handleCreateNotebook = React.useCallback(() => {
        if (notebookName !== "") noteHandler.newNoteBook(notebookName);
        props.onClose();
    }, [notebookName]);

    return (
        <div>
            <ModalRoot className="vc-create-notebook" size={ModalSize.SMALL} {...props}>
                <ModalHeader className="vc-notebook-header">
                    <Text tag="h3">Create Notebook</Text>
                    <ModalCloseButton onClick={props.onClose} />
                </ModalHeader>
                <ModalContent>
                    <TextInput
                        value={notebookName}
                        placeholder="Notebook Name"
                        onChange={value => setNotebookName(value)}
                        style={{ marginBottom: "10px" }} />
                </ModalContent>
                <ModalFooter>
                    <Button onClick={handleCreateNotebook} color={Button.Colors.GREEN}>Create Notebook</Button>
                </ModalFooter>
            </ModalRoot>
        </div>
    );
};
