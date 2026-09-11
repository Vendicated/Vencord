/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize } from "@utils/modal";
import { findByProps } from "@webpack";
import { Button, Forms, Text } from "@webpack/common";

import noteHandler from "../../NoteHandler";
import { downloadNotes, uploadNotes } from "../../utils";

export default ({ onClose, ...modalProps }: ModalProps & { onClose: () => void; }) => {
    const { colorStatusGreen } = findByProps("colorStatusGreen");

    return (
        <ModalRoot {...modalProps} className="vc-help-modal" size={ModalSize.MEDIUM}>
            <ModalHeader className="notebook-header">
                <Text tag="h3">Help Modal</Text>
                <ModalCloseButton onClick={onClose} />
            </ModalHeader>
            <ModalContent>
                <div className="vc-help-markdown">
                    <Text>Adding Notes</Text>
                    <Forms.FormText>
                        To add a note right click on a message then hover over the "Note Message" item and click
                        <br />
                        the button with the notebook name you would like to note the message to.
                        <br />
                        <span style={{ fontWeight: "bold" }} className={colorStatusGreen}>
                            Protip:
                        </span>{" "}
                        Clicking the "Note Message" button by itself will note to Main by default!
                    </Forms.FormText>
                    <hr />
                    <Text>Deleting Notes</Text>
                    <Forms.FormText>
                        Note you can either right click the note and hit "Delete Note" or you can hold the
                        'DELETE' key on your keyboard and click on a note; it's like magic!
                    </Forms.FormText>
                    <hr />
                    <Text>Moving Notes</Text>
                    <Forms.FormText>
                        To move a note right click on a note and hover over the "Move Note" item and click on
                        the button corresponding to the notebook you would like to move the note to.
                    </Forms.FormText>
                    <hr />
                    <Text>Jump To Message</Text>
                    <Forms.FormText>
                        To jump to the location that the note was originally located at just right click on the
                        note and hit "Jump to Message".
                    </Forms.FormText>
                </div>
            </ModalContent>
            <ModalFooter>
                <div className="vc-notebook-display-left">
                    <Button
                        look={Button.Looks.FILLED}
                        color={Button.Colors.GREEN}
                        style={{ marginRight: "10px" }}
                        onClick={() => {
                            noteHandler.refreshAvatars();
                        }}>Refresh Avatars</Button>
                    <Button
                        look={Button.Looks.FILLED}
                        color={Button.Colors.GREEN}
                        style={{ marginRight: "10px" }}
                        onClick={() => {
                            uploadNotes();
                        }}>Import Notes</Button>
                    <Button
                        look={Button.Looks.FILLED}
                        color={Button.Colors.GREEN}
                        style={{ marginRight: "70px" }}
                        onClick={() => {
                            downloadNotes();
                        }}>Export Notes</Button>
                    <Button
                        look={Button.Looks.FILLED}
                        color={Button.Colors.RED}
                        onClick={() => {
                            noteHandler.deleteEverything();
                        }}>Delete All Notes</Button>
                </div>
            </ModalFooter>
        </ModalRoot>
    );
};
