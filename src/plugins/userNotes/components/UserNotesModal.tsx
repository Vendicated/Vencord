/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import {
    closeModal, ModalCloseButton, ModalFooter, ModalHeader, ModalProps, ModalRoot, openModal
} from "@utils/modal";
import { Button, Text, TextArea, useState } from "@webpack/common";
import { User } from "discord-types/general";

import { getUserNotes, saveUserNotes } from "../data";
import settings from "../settings";

const cl = classNameFactory("vc-user-notes-modal-");

export function UserNotesModal({ modalProps, close, user, userNotes }: {
	modalProps: ModalProps;
	close(): void;
	user: User;
	userNotes: string;
}) {
    const [value, setValue] = useState(userNotes);

    return (
        <ModalRoot className={cl("root")} {...modalProps}>
            <ModalHeader className={cl("header")}>
                <Text variant="heading-lg/semibold" style={{ flexGrow: 1 }}>Notes: {user.username}</Text>
                <ModalCloseButton onClick={close} />
            </ModalHeader>
            <div className={cl("content")}>
                <TextArea
                    className={cl("text-area")}
                    placeholder="Click to add a note"
                    value={value}
                    onChange={setValue}
                    spellCheck={!settings.store.disableSpellCheck}
                />
            </div>
            <ModalFooter className={cl("footer")}>
                <Button
                    color={Button.Colors.GREEN}
                    onClick={() => {
                        saveUserNotes(user.id, value);
                        close();
                    }}
                >
					Save
                </Button>
            </ModalFooter>
        </ModalRoot>
    );
}

export const openUserNotesModal = async (user: User) => {
    const key = openModal(modalProps => (
        <UserNotesModal
            modalProps={modalProps}
            close={() => closeModal(key)}
            user={user}
            userNotes={getUserNotes(user.id) ?? ""}
        />
    ));
};
