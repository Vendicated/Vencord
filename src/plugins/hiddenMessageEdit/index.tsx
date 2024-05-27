/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import {
    findGroupChildrenByChildId,
    NavContextMenuPatchCallback,
} from "@api/ContextMenu";
import { Devs } from "@utils/constants";
import { ModalCloseButton, ModalContent, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import {
    Button,
    Flex,
    Forms,
    Menu,
    React,
    RestAPI,
    UserStore,
    useToken
} from "@webpack/common";
import type { Channel, Message } from "discord-types/general";

import { HiddenMessageEditIcon } from "./icons";

interface MessageContextProps {
    channel: Channel;
    guildId?: string;
    message: Message;
}

interface HiddenMessageEditFormProps extends ModalProps {
    message: Message;
    onSave: (newContent: string) => void;
}

const HiddenMessageEditForm = ({ message, onSave, transitionState, onClose }: HiddenMessageEditFormProps) => {
    const [newContent, setNewContent] = React.useState(message.content);

    const handleSave = () => {
        onSave(newContent);
        onClose();
    };

    return (
        <ModalRoot size={ModalSize.SMALL} transitionState={transitionState} className="hidden-message-edit-form-container">
            <div className="hidden-message-edit-form">
                <ModalHeader>
                    <Forms.FormTitle className="hidden-message-edit-title">Hidden Message Edit</Forms.FormTitle>
                    <ModalCloseButton onClick={onClose} className="modal-close-button" />
                </ModalHeader>
                <ModalContent>
                    <Forms.FormText type={Forms.FormText.Types.DESCRIPTION} className="hidden-message-edit-description">
                        Use the <span className="magic"><span className="magic-text">CUTEST</span></span> hidden message editing feature
                    </Forms.FormText>
                    <Flex className="inputContainer" align={Flex.Align.CENTER} justify={Flex.Justify.CENTER}>
                        <input
                            type="text"
                            value={newContent}
                            onChange={e => setNewContent(e.target.value)}
                            placeholder="Enter new message content"
                            className="hidden-message-edit-input"
                            style={{ flex: 1, marginRight: "10px" }}
                        />
                        <Button
                            color={Button.Colors.PRIMARY}
                            size={Button.Sizes.SMALL}
                            onClick={handleSave}
                            className="hidden-message-edit-button"
                        >
                            Save
                        </Button>
                    </Flex>
                    <Forms.FormText type={Forms.FormText.Types.DESCRIPTION} style={{ fontSize: "11px", marginTop: "20px" }}>
                        NOTE: If too much time passes, you won't be able to modify the message as it will be sent as a new message.
                    </Forms.FormText>
                </ModalContent>
            </div>
        </ModalRoot>
    );
};

const MessageContextMenuPatch: NavContextMenuPatchCallback = (
    children,
    { channel, message }: MessageContextProps
) => {
    const currentUser = UserStore.getCurrentUser();

    if (!message || !currentUser || message.author.id !== currentUser.id) {
        return;
    }

    let menuGroup = findGroupChildrenByChildId("delete", children);
    if (!menuGroup) {
        menuGroup = findGroupChildrenByChildId("copy-message-link", children);
    }

    const handleEditClick = () => {
        const handleSave = async (newContent: string) => {
            try {
                const token = useToken;
                if (!token) {
                    return;
                }

                try {
                    const response = await RestAPI.post({
                        url: `/channels/${channel.id}/messages`,
                        body: {
                            content: newContent,
                            nonce: message.id,
                            tts: false,
                            flags: 0,
                            authorization: token,
                        },
                    });
                } catch (error) {
                }
            } catch (error) {
            }
        };

        openModal(props => <HiddenMessageEditForm {...props} message={message} onSave={handleSave} />);
    };

    if (!menuGroup) {
        children.push(
            <Menu.MenuItem
                id="vc-hidden-message-edit"
                label="Hidden Message Edit"
                action={handleEditClick}
                icon={HiddenMessageEditIcon}
            />
        );
    } else {
        menuGroup.push(
            <Menu.MenuItem
                id="vc-hidden-message-edit"
                label="Hidden Message Edit"
                action={handleEditClick}
                icon={HiddenMessageEditIcon}
            />
        );
    }
};

export default definePlugin({
    name: "HiddenMessageEdit",
    authors: [Devs.Prism],
    description: "Adds a 'Hidden Message Edit' option to your message context menu.",
    contextMenus: {
        message: MessageContextMenuPatch,
    },
});
