/*
 * Vencord, a Discord client mod
 * HideFolders modal
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BaseText } from "@components/BaseText";
import { Heading } from "@components/Heading";
import { classNameFactory } from "@utils/css";
import { getGuildAcronym } from "@utils/discord";
import { classes } from "@utils/misc";
import {
    ModalCloseButton,
    ModalContent,
    ModalHeader,
    ModalProps,
    ModalRoot,
    ModalSize,
    openModal,
    closeModal,
} from "@utils/modal";
import { Guild } from "@vencord/discord-types";
import { findCssClassesLazy } from "@webpack";
import { Button, IconUtils, useStateFromStores } from "@webpack/common";

import { HiddenFoldersStore } from "./store";

const cl = classNameFactory("vc-hidefolders-");
const IconClasses = findCssClassesLazy("icon", "acronym", "childWrapper");

type FolderDetail = {
    folderId: number;
    folderName: string;
    guilds: Guild[];
};

function restoreFolder(folderId: number) {
    HiddenFoldersStore.removeHiddenFolder(String(folderId));
}

function GuildRow(props: { guild: Guild }) {
    const { guild } = props;
    return (
        <div className={cl("row")}>
            <div className={cl("guildicon")}>
                {guild.icon ? (
                    <img
                        alt=""
                        height={48}
                        width={48}
                        src={IconUtils.getGuildIconURL({
                            id: guild.id,
                            icon: guild.icon,
                            canAnimate: true,
                            size: 240,
                        })}
                    />
                ) : (
                    <div
                        aria-hidden={true}
                        className={classes(IconClasses.childWrapper, IconClasses.acronym)}
                    >
                        {getGuildAcronym(guild)}
                    </div>
                )}
            </div>
            <Heading className={cl("name")}>
                {guild.name}
            </Heading>
        </div>
    );
}

export function HiddenFoldersMenu() {
    const folders = useStateFromStores(
        [HiddenFoldersStore],
        () => HiddenFoldersStore.hiddenFoldersDetail()
    ) as FolderDetail[];

    if (!folders || folders.length === 0) {
        return (
            <div className={cl("list")}>
                <BaseText size="sm" weight="medium">
                    No hidden folders
                </BaseText>
            </div>
        );
    }

    return (
        <div className={cl("list")}>
            {folders.map(folder => (
                <div key={folder.folderId} className={cl("folder")}>
                    <div className={cl("folder-header")}>
                        <BaseText size="sm" weight="medium">
                            {folder.folderName || "Folder"}
                        </BaseText>
                        <Button
                            color={Button.Colors.PRIMARY}
                            onClick={() => restoreFolder(folder.folderId)}
                            size={Button.Sizes.SMALL}
                            className={cl("restore-all")}
                        >
                            Unhide Folder
                        </Button>
                    </div>
                    {folder.guilds.map(guild => (
                        <GuildRow key={guild.id} guild={guild} />
                    ))}
                </div>
            ))}
        </div>
    );
}

function HiddenFoldersModal(props: { modalProps: ModalProps; close: () => void }) {
    const { modalProps, close } = props;

    return (
        <ModalRoot {...modalProps} size={ModalSize.LARGE}>
            <ModalHeader>
                <BaseText size="lg" weight="semibold" style={{ flexGrow: 1 }}>
                    Hidden Folders
                </BaseText>
                <ModalCloseButton onClick={close} />
            </ModalHeader>

            <ModalContent>
                <HiddenFoldersMenu />
            </ModalContent>
        </ModalRoot>
    );
}

export function openHiddenFoldersModal() {
    const key = openModal(modalProps => (
        <HiddenFoldersModal
            modalProps={modalProps}
            close={() => closeModal(key)}
        />
    ));
}
