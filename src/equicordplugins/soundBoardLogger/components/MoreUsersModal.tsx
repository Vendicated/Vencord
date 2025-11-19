/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BaseText } from "@components/BaseText";
import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { HeadingPrimary } from "@components/Heading";
import { cl, getEmojiUrl, SoundLogEntry, User } from "@equicordplugins/soundBoardLogger/utils";
import { closeModal, ModalContent, ModalRoot, openModal } from "@utils/modal";
import { Clickable } from "@webpack/common";

export function openMoreUsersModal(item: SoundLogEntry, users: User[], onClickUser: Function) {
    const key = openModal(props => (
        <ErrorBoundary>
            <ModalRoot {...props}>
                <MoreUsersModal item={item} users={users} onClickUser={onClickUser} closeModal={() => closeModal(key)} />
            </ModalRoot>
        </ErrorBoundary>
    ));
}

export default function MoreUsersModal({ item, users, onClickUser, closeModal }: { item: SoundLogEntry, users: User[], onClickUser: Function, closeModal: Function; }) {
    return (
        <ModalContent className={cl("more")}>
            <div className={cl("more-header")}>
                <img
                    className={cl("more-emoji")}
                    src={getEmojiUrl(item.emoji)}
                    alt=""
                />
                <HeadingPrimary className={cl("more-soundId")}>{item.soundId}</HeadingPrimary>
            </div>
            <div className={cl("more-users")}>
                {users.map(user => {
                    const currentUser = item.users.find(({ id }) => id === user.id) ?? { id: "", plays: [0] };
                    return (
                        <Clickable onClick={() => {
                            closeModal();
                            onClickUser(item, user);
                        }} key={user.id}>
                            <div className={cl("more-user")} style={{ cursor: "pointer" }}>
                                <Flex flexDirection="row" className={cl("more-user-profile")}>
                                    <img
                                        className={cl("user-avatar")}
                                        src={user.getAvatarURL(void 0, 512, true)}
                                        alt=""
                                        style={{ cursor: "pointer" }}
                                    />
                                    <BaseText size="xs" weight="medium" style={{ cursor: "pointer" }}>{user.username}</BaseText>
                                </Flex>
                                <BaseText size="xs" weight="medium" style={{ cursor: "pointer" }}>Played {currentUser.plays.length} {currentUser.plays.length === 1 ? "time" : "times"}</BaseText>
                            </div>
                        </Clickable>
                    );
                })}
            </div>
        </ModalContent>
    );
}
