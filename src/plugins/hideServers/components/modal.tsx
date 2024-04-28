/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import { classes } from "@utils/misc";
import {
    closeModal,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalProps,
    ModalRoot,
    ModalSize,
    openModal,
} from "@utils/modal";
import { findByPropsLazy } from "@webpack";
import { Button, Forms, IconUtils, Text, useState } from "@webpack/common";
import { Guild } from "discord-types/general";

import { removeHidden } from "../settings";

const cl = classNameFactory("vc-hideservers-");
const IconClasses = findByPropsLazy("icon", "acronym", "childWrapper");

function HiddenServersModal({
    servers,
    modalProps,
    close,
}: {
    servers: Guild[];
    modalProps: ModalProps;
    close(): void;
}) {
    const [serverList, setServerList] = useState(servers);
    function removeServer(id: string) {
        removeHidden(id);
        setServerList(serverList.filter(x => x.id !== id));
    }

    return (
        <ModalRoot {...modalProps} size={ModalSize.LARGE}>
            <ModalHeader>
                <Text variant="heading-lg/semibold" style={{ flexGrow: 1 }}>
                    Hidden Servers
                </Text>
                <ModalCloseButton onClick={close} />
            </ModalHeader>

            <ModalContent>
                <div className={cl("list")}>
                    {serverList.length > 0 ? (
                        serverList.map(server => (
                            <div key={server.id} className={cl("row")}>
                                <div className={cl("guildicon")}>
                                    {server.icon
                                        ? <img height="48" width="48"
                                            src={IconUtils.getGuildIconURL({
                                                id: server.id,
                                                icon: server.icon,
                                                canAnimate: true,
                                                size: 240,
                                            })} />
                                        : <div
                                            aria-hidden
                                            className={classes(
                                                IconClasses.childWrapper,
                                                IconClasses.acronym
                                            )}>
                                            {server.acronym}
                                        </div>
                                    }
                                </div>
                                <Forms.FormTitle className={cl("name")}>
                                    {server.name}
                                </Forms.FormTitle>
                                <Button
                                    className={"row-button"}
                                    color={Button.Colors.PRIMARY}
                                    onClick={() => removeServer(server.id)}
                                >
                                    Remove
                                </Button>
                            </div>
                        ))
                    ) : (
                        <Text variant="heading-sm/medium">
                            No hidden servers
                        </Text>
                    )}
                </div>
            </ModalContent>

            <ModalFooter></ModalFooter>
        </ModalRoot>
    );
}

export default function openHiddenServersModal({ servers }) {
    const key = openModal(modalProps => {
        return (
            <HiddenServersModal
                modalProps={modalProps}
                servers={servers}
                close={() => closeModal(key)}
            />
        );
    });
}
