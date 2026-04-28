/*
 * Vencord, a Discord client mod
 * HideFolders modal
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BaseText } from "@components/BaseText";
import { Heading } from "@components/Heading";
import { HiddenFoldersStore } from "@equicordplugins/hideFolders/store";
import { classNameFactory } from "@utils/css";
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
import { findCssClassesLazy } from "@webpack";
import { Button, IconUtils, useStateFromStores } from "@webpack/common";

import { SortedGuildStore } from "..";

const cl = classNameFactory("vc-hidefolders-");
const IconClasses = findCssClassesLazy("icon", "acronym", "childWrapper");

function HiddenFoldersModal({ modalProps, close }: { modalProps: ModalProps; close(): void }) {
    const folders = useStateFromStores(
        [HiddenFoldersStore],
        () => HiddenFoldersStore.hiddenFoldersDetail()
    );

    return (
        <ModalRoot {...modalProps} size={ModalSize.LARGE}>
            <ModalHeader>
                <BaseText size="lg" weight="semibold" style={{ flexGrow: 1 }}>
                    Hidden Folders
                </BaseText>
                <ModalCloseButton onClick={close} />
            </ModalHeader>

            <ModalContent>
                <HiddenFoldersMenu folders={folders} />
            </ModalContent>
        </ModalRoot>
    );
}

function GuildRow({ guild }: { guild: Guild }) {
    return (
        <div key={guild.id} className={cl("row")}>
            <div className={cl("guildicon")}>
                {guild.icon ? (
                    <img
                        alt=""
                        height="48"
                        width="48"
                        src={IconUtils.getGuildIconURL({
                            id: guild.id,
                            icon: guild.icon,
                            canAnimate: true,
                            size: 240,
                        })}
                    />
                ) : (
                    <div
                        aria-hidden
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

type FolderDetail = {
    folderId: number;
    folderName: string;
    guilds: Guild[];
};

export function HiddenFoldersMenu({ folders }: { folders: FolderDetail[] }) {
    if (folders.length === 0) {
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
                            onClick={() => HiddenFoldersStore.removeHiddenFolder(String(folder.folderId))}
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

export function openHiddenFoldersModal() {
    const key = openModal(modalProps => (
        <HiddenFoldersModal
            modalProps={modalProps}
            close={() => closeModal(key)}
        />
    ));
}
