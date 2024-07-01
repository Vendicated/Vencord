/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Flex } from "@components/Flex";
import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalRoot, openModal } from "@utils/modal";
import { Button, Text } from "@webpack/common";
import { User } from "discord-types/general";

function EditModal({ user }: { user: User; }) {
    // TODO trolley
    return null;
}

export function openUserEditModal(user) {
    openModal(props => (
        <ModalRoot {...props}>
            <ModalHeader>
                <Text variant="heading-lg/semibold" style={{ flexGrow: 1 }}>Notification Log</Text>
                <ModalCloseButton onClick={props.onClose} />
            </ModalHeader>

            <ModalContent>
                <EditModal user={user} />
            </ModalContent>

            <ModalFooter>
                <Flex>
                    <Button
                        color={Button.Colors.RED}
                    >
                        Reset Settings
                    </Button>
                    <Button>
                        Save
                    </Button>
                </Flex>
            </ModalFooter>
        </ModalRoot>
    ));
}
