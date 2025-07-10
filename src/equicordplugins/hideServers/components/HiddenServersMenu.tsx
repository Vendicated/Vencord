/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import { getGuildAcronym } from "@utils/discord";
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
import { Guild } from "@vencord/discord-types";
import { findByPropsLazy } from "@webpack";
import { Button, Forms, IconUtils, Text, useStateFromStores } from "@webpack/common";

import { HiddenServersStore } from "../HiddenServersStore";

const cl = classNameFactory("vc-hideservers-");
const IconClasses = findByPropsLazy("icon", "acronym", "childWrapper");

function HiddenServersModal({ modalProps, close }: { modalProps: ModalProps; close(): void; }) {
    const guilds = useStateFromStores([HiddenServersStore], () => HiddenServersStore.hiddenGuildsDetail());
    return (
        <ModalRoot {...modalProps} size={ModalSize.LARGE}>
            <ModalHeader>
                <Text variant="heading-lg/semibold" style={{ flexGrow: 1 }}>
                    Hidden Servers
                </Text>
                <ModalCloseButton onClick={close} />
            </ModalHeader>

            <ModalContent>
                <HiddenServersMenu guilds={guilds} />
            </ModalContent>
        </ModalRoot>
    );
}

export function HiddenServersMenu({ guilds }: { guilds: Guild[]; }) {
    return <div className={cl("list")}>
        {guilds.length > 0 ? (
            guilds.map(guild => (
                <div key={guild.id} className={cl("row")}>
                    <div className={cl("guildicon")}>
                        {guild.icon
                            ? <img
                                alt=""
                                height="48"
                                width="48"
                                src={IconUtils.getGuildIconURL({
                                    id: guild.id,
                                    icon: guild.icon,
                                    canAnimate: true,
                                    size: 240,
                                })} />
                            : <div
                                aria-hidden
                                className={classes(
                                    IconClasses.childWrapper,
                                    IconClasses.acronym
                                )}>
                                {getGuildAcronym(guild)}
                            </div>
                        }
                    </div>
                    <Forms.FormTitle className={cl("name")}>
                        {guild.name}
                    </Forms.FormTitle>
                    <Button
                        className={"row-button"}
                        color={Button.Colors.PRIMARY}
                        onClick={() => HiddenServersStore.removeHidden(guild.id)}
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
}

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
