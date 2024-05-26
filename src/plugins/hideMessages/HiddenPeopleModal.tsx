/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Flex } from "@components/Flex";
import {
    Margins,
    ModalCloseButton,
    ModalContent,
    ModalHeader,
    ModalProps,
    ModalRoot,
    useForceUpdater,
} from "@utils/index";
import { Forms, useEffect, UserStore, UserUtils, useState } from "@webpack/common";
import { User } from "discord-types/general";

import { userIds } from "./store";
import { removeIgnore } from "./utils";

interface UserElementProps {
    userId: string;
    onClick: () => void;
}

function UserElement({ userId, onClick }: UserElementProps) {
    const [user, setUser] = useState<User>();

    useEffect(() => {
        const storeUser = UserStore.getUser(userId);
        if (storeUser) setUser(storeUser);
        else
            UserUtils.getUser(userId).then(setUser);
    }, []);

    return (
        <Flex className="vc-hidden-modal-list-item">
            <Flex className="vc-hidden-modal-list-user">
                <img
                    className="avatar__6337f"
                    loading="lazy"
                    src={user ? user.getAvatarURL() : ""}
                />
                <Forms.FormText>{user ? user.tag : `id:${userId}`}</Forms.FormText>
            </Flex>
            <ModalCloseButton onClick={onClick} />
        </Flex>
    );
}

export function HiddenPeopleModal({ rootProps }: { rootProps: ModalProps; }) {
    const forceUpdate = useForceUpdater();


    const Users = userIds.map(id => {
        // Without this variable for some reason 'removeIgnore' is not defined in onClick event
        const removeUser = () => {
            removeIgnore(id);
            forceUpdate();
        };

        return (
            <li key={"hidden_modal" + id} className={Margins.bottom8}>
                <UserElement onClick={removeUser} userId={id} />
            </li>
        );
    });

    return (
        <ModalRoot {...rootProps}>
            <ModalHeader>
                <Forms.FormTitle tag="h2">Hidden users</Forms.FormTitle>
                <ModalCloseButton onClick={rootProps.onClose} />
            </ModalHeader>

            <ModalContent>
                <ul className="vc-hidden-modal-list">{Users}</ul>
            </ModalContent>
        </ModalRoot>
    );
}
