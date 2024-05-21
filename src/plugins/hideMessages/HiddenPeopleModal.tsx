/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Flex } from "@components/Flex";
import { Margins, ModalCloseButton, ModalContent, ModalHeader, ModalProps, ModalRoot } from "@utils/index";
import { Forms, UserStore, useState } from "@webpack/common";

import { userIds } from "./store";
import { removeIgnore } from "./utils";

export function HiddenPeopleModal({ rootProps }: { rootProps: ModalProps; }) {
    const [, forceUpdate] = useState(false);

    const Users = userIds.map(id => {
        const user = UserStore.getUser(id);
        // Without this variable for some reason 'removeIgnore' is not defined in onClick event
        // And I don't know any better way to force-update react component :p
        const removeUser = () => { removeIgnore(id); forceUpdate(p => !p); };

        return (
            <li key={"hidden_modal" + user.id} className={Margins.bottom8}>
                <Flex className="vc-hidden-modal-list-item">
                    <Flex className="vc-hidden-modal-list-user">
                        <img className="avatar__6337f" loading="lazy" src={user.getAvatarURL()} />
                        <Forms.FormText>{user.tag}</Forms.FormText>
                    </Flex>
                    <ModalCloseButton onClick={removeUser} />
                </Flex>
            </li>
        );
    });

    return (
        <ModalRoot {...rootProps}>
            <ModalHeader >
                <Forms.FormTitle tag="h2">
                    Hidden users
                </Forms.FormTitle>
                <ModalCloseButton onClick={rootProps.onClose} />
            </ModalHeader>

            <ModalContent >
                <ul className="vc-hidden-modal-list">
                    {Users}
                </ul>
            </ModalContent>
        </ModalRoot>
    );
}
