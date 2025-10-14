/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BaseText } from "@components/BaseText";
import { Paragraph } from "@components/Paragraph";
import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize } from "@utils/modal";
import { findByProps } from "@webpack";
import { Button } from "@webpack/common";

import { noteHandler } from "../../NoteHandler";
import { downloadNotes, uploadNotes } from "../../utils";

export default ({ onClose, ...modalProps }: ModalProps & { onClose: () => void; }) => {
    const { statusTagGreen } = findByProps("statusTagGreen");

    return (
        <ModalRoot {...modalProps} className="vc-help-modal" size={ModalSize.MEDIUM}>
            <ModalHeader className="notebook-header">
                <BaseText tag="h3">Help Modal</BaseText>
                <ModalCloseButton onClick={onClose} />
            </ModalHeader>
            <ModalContent>
                <div className="vc-help-markdown">
                    <BaseText>Adding Notes</BaseText>
                    <Paragraph>
                        To add a note right click on a message then hover over the "Note Message" item and click
                        <br />
                        the button with the notebook name you would like to note the message to.
                        <br />
                        <span style={{ fontWeight: "bold" }} className={statusTagGreen}>
                            Protip:
                        </span>{" "}
                        Clicking the "Note Message" button by itself will note to Main by default!
                    </Paragraph>
                    <hr />
                    <BaseText>Deleting Notes</BaseText>
                    <Paragraph>
                        Note you can either right click the note and hit "Delete Note" or you can hold the
                        'DELETE' key on your keyboard and click on a note; it's like magic!
                    </Paragraph>
                    <hr />
                    <BaseText>Moving Notes</BaseText>
                    <Paragraph>
                        To move a note right click on a note and hover over the "Move Note" item and click on
                        the button corresponding to the notebook you would like to move the note to.
                    </Paragraph>
                    <hr />
                    <BaseText>Jump To Message</BaseText>
                    <Paragraph>
                        To jump to the location that the note was originally located at just right click on the
                        note and hit "Jump to Message".
                    </Paragraph>
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
                        style={{ marginRight: "10px" }}
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
