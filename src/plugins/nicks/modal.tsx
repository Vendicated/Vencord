/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
*/

import {
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalProps,
    ModalRoot,
    openModal,
} from "@utils/modal";
import { Button, Forms, React, TextInput, useState } from "@webpack/common";

import { setUsername } from "./index";

function Modal({ user, props: modalProps }: { user: any, props: ModalProps; }) {
    const [nickname, setNickname] = useState(user.customNick || "");

    return (
        <ModalRoot {...modalProps}>
            <ModalHeader>
                <Forms.FormTitle tag="h4">
                    {user.customNick ? "Change" : "Add"} Custom Nickname
                </Forms.FormTitle>
            </ModalHeader>

            <ModalContent>
                <Forms.FormTitle>Nickname</Forms.FormTitle>
                <TextInput
                    style={{ marginBottom: "10px" }}
                    value={nickname}
                    placeholder={user.globalName}
                    onChange={(e: string) => {
                        setNickname(e);
                    }}
                />
                <Button
                    color={Button.Colors.LINK}
                    size={Button.Sizes.NONE}
                    look={Button.Looks.LINK}
                    style={{ padding: "0px" }}
                    onClick={() => {
                        setNickname("");
                    }}>
                    Reset Nickname
                </Button>
            </ModalContent>

            <ModalFooter>
                <Button
                    color={Button.Colors.BLACK}
                    onClick={async () => {
                        setUsername(nickname.length > 0 ? nickname : user.globalName, user.id);
                        modalProps.onClose();
                    }}
                >
                    Save
                </Button>
                <Button
                    color={Button.Colors.TRANSPARENT}
                    look={Button.Looks.LINK}
                    onClick={modalProps.onClose}
                >
                    Cancel
                </Button>
            </ModalFooter>
        </ModalRoot>
    );
}

export function buildModal(user: any): void {
    openModal((props: ModalProps) => <Modal user={user} props={props} />);
}
