/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Flex } from "@components/Flex";
import { CopyIcon } from "@components/Icons";
import { openUserProfile } from "@utils/discord";
import { Margins } from "@utils/margins";
import { classes, copyWithToast } from "@utils/misc";
import { closeModal, ModalContent, ModalRoot, openModal } from "@utils/modal";
import { Clickable, Forms, Text, Timestamp } from "@webpack/common";
import moment from "moment";

import { AvatarStyles, cl, downloadAudio, getEmojiUrl, playSound, SoundLogEntry, User, UserSummaryItem } from "../utils";
import { DownloadIcon, IconWithTooltip, PlayIcon } from "./Icons";

export function openUserModal(item, user, sounds) {
    const key = openModal(props =>
        <ModalRoot {...props}>
            <UserModal item={item} user={user} sounds={sounds} closeModal={() => closeModal(key)} />
        </ModalRoot>
    );
}

export default function UserModal({ item, user, sounds, closeModal }: { item: SoundLogEntry, user: User, sounds: SoundLogEntry[], closeModal: Function; }) {
    const currentUser = item.users.find(({ id }) => id === user.id) ?? { id: "", plays: [0] };
    const soundsDoneByCurrentUser = sounds.filter(sound => sound.users.some(itemUser => itemUser.id === user.id) && sound.soundId !== item.soundId);

    return (
        <ModalContent className={cl("user")}>
            <Clickable onClick={() => {
                closeModal();
                openUserProfile(user.id);
            }}>
                <div className={cl("user-header")}>
                    <img
                        className={cl("user-avatar")}
                        src={user.getAvatarURL(void 0, 512, true)}
                        alt=""
                        style={{ cursor: "pointer" }}
                    />
                    <Forms.FormTitle tag="h2" className={cl("user-name")} style={{ textTransform: "none", cursor: "pointer" }}>{user.username}</Forms.FormTitle>
                </div>
            </Clickable>
            <Flex flexDirection="row" style={{ gap: "10px" }}>
                <img
                    className={cl("user-sound-emoji")}
                    src={getEmojiUrl(item.emoji)}
                    alt=""
                />
                <Flex flexDirection="column" style={{ gap: "7px", height: "68px", justifyContent: "space-between" }}>
                    <Text variant="text-md/bold" style={{ height: "20px" }}>{item.soundId}</Text>
                    <Text variant="text-md/normal">Played {currentUser.plays.length} {currentUser.plays.length === 1 ? "time" : "times"}.</Text>
                    <Text variant="text-md/normal">Last played: <Timestamp timestamp={new Date(moment(currentUser.plays.at(-1)).toDate())} /></Text>
                </Flex>
            </Flex>
            <Text variant="heading-lg/semibold" tag="h2" className={classes(Margins.top16, Margins.bottom8)}>
                {soundsDoneByCurrentUser.length ? "Also played:" : " "}
            </Text>
            <Flex style={{ justifyContent: "space-between" }}>
                <UserSummaryItem
                    users={soundsDoneByCurrentUser}
                    count={soundsDoneByCurrentUser.length}
                    guildId={undefined}
                    renderIcon={false}
                    max={10}
                    showDefaultAvatarsForNullUsers
                    showUserPopout
                    renderMoreUsers={() =>
                        <div className={AvatarStyles.emptyUser}>
                            <div className={AvatarStyles.moreUsers}>
                                ...
                            </div>
                        </div>
                    }
                    className={cl("user-sounds")}
                    renderUser={({ soundId, emoji }) => (
                        <Clickable
                            className={AvatarStyles.clickableAvatar}
                            onClick={() => {
                                closeModal();
                                openUserModal(sounds.find(sound => sound.soundId === soundId), user, sounds);
                            }}
                        >
                            <img
                                className={AvatarStyles.avatar}
                                src={getEmojiUrl(emoji)}
                                alt={soundId}
                                title={soundId}
                            />
                        </Clickable>
                    )}
                />
                <div className={cl("user-buttons")}>
                    <IconWithTooltip text="Download" icon={<DownloadIcon />} onClick={() => downloadAudio(item.soundId)} />
                    <IconWithTooltip text="Copy ID" icon={<CopyIcon />} onClick={() => copyWithToast(item.soundId, "ID copied to clipboard!")} />
                    <IconWithTooltip text="Play Sound" icon={<PlayIcon />} onClick={() => playSound(item.soundId)} />
                </div>
            </Flex>
        </ModalContent>
    );
}
