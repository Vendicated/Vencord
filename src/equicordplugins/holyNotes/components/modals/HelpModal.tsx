/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BaseText } from "@components/BaseText";
import { Paragraph } from "@components/Paragraph";
import { noteHandler } from "@equicordplugins/holyNotes/NoteHandler";
import { downloadNotes, uploadNotes } from "@equicordplugins/holyNotes/utils";
import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize } from "@utils/modal";
import { findByProps } from "@webpack";
import { Button } from "@webpack/common";

export default ({ onClose, ...modalProps }: ModalProps & { onClose: () => void; }) => {
    const { statusTagGreen } = findByProps("statusTagGreen");

    return (
        <ModalRoot {...modalProps} className="vc-help-modal" size={ModalSize.MEDIUM}>
            <ModalHeader className="vc-help-modal-header">
                <BaseText tag="h3" style={{ flexGrow: 1 }}>Help Modal</BaseText>
                <ModalCloseButton onClick={onClose} />
            </ModalHeader>
            <ModalContent>
                <div className="vc-help-markdown">
                    <BaseText>Adding Notes</BaseText>
                    <Paragraph>
                        To add a note right click on a message then hover over the "Note Message" item and click the button with the notebook name you would like to note the message to.
                    </Paragraph>
                    <div style={{ marginTop: "12px" }}>
                        <span className={statusTagGreen}>Protip:</span>
                    </div>
                    <Paragraph style={{ marginTop: "8px" }}>
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
                <div className="vc-help-modal-footer">
                    <Button
                        look={Button.Looks.FILLED}
                        color={Button.Colors.GREEN}
                        onClick={() => {
                            noteHandler.refreshAvatars();
                        }}>Refresh Avatars</Button>
                    <Button
                        look={Button.Looks.FILLED}
                        color={Button.Colors.GREEN}
                        onClick={() => {
                            uploadNotes();
                        }}>Import Notes</Button>
                    <Button
                        look={Button.Looks.FILLED}
                        color={Button.Colors.GREEN}
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
