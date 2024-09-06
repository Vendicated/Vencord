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
    ModalHeader,
    ModalProps,
    ModalRoot,
    ModalSize,
    openModal,
} from "@utils/modal";
import { findByPropsLazy } from "@webpack";
import { Button, Forms, IconUtils, Text, useState, useStateFromStores } from "@webpack/common";
import { Guild } from "discord-types/general";

import { HiddenServersStore } from "../HiddenServersStore";

const cl = classNameFactory("vc-hideservers-");
const IconClasses = findByPropsLazy("icon", "acronym", "childWrapper");

function HiddenServersModal({
    modalProps,
    close,
}: {
    modalProps: ModalProps;
    close(): void;
}) {
    const servers = useStateFromStores([HiddenServersStore], () => HiddenServersStore.hiddenGuildsDetail());
    return (
        <ModalRoot {...modalProps} size={ModalSize.LARGE}>
            <ModalHeader>
                <Text variant="heading-lg/semibold" style={{ flexGrow: 1 }}>
                    Hidden Servers
                </Text>
                <ModalCloseButton onClick={close} />
            </ModalHeader>

            <ModalContent>
                <HiddenServersMenu servers={servers} />
            </ModalContent>
        </ModalRoot>
    );
}

export function HiddenServersMenu({ servers }: { servers: Guild[]; }) {
    return <div className={cl("list")}>
        {servers.length > 0 ? (
            servers.map(server => (
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
                        onClick={() => HiddenServersStore.removeHidden(server.id)}
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
    </div>;
};

export function openHiddenServersModal() {
    const key = openModal(modalProps => {
        return (
            <HiddenServersModal
                modalProps={modalProps}
                close={() => closeModal(key)}
            />
        );
    });
}
