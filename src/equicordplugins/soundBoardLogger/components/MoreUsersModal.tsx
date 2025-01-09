/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { closeModal, ModalContent, ModalRoot, openModal } from "@utils/modal";
import { Clickable, Forms } from "@webpack/common";

import { cl, getEmojiUrl, SoundLogEntry, User } from "../utils";

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
                <Forms.FormTitle tag="h2" className={cl("more-soundId")}>{item.soundId}</Forms.FormTitle>
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
                                    <Forms.FormText variant="text-xs/medium" style={{ cursor: "pointer" }}>{user.username}</Forms.FormText>
                                </Flex>
                                <Forms.FormText variant="text-xs/medium" style={{ cursor: "pointer" }}>Played {currentUser.plays.length} {currentUser.plays.length === 1 ? "time" : "times"}</Forms.FormText>
                            </div>
                        </Clickable>
                    );
                })}
            </div>
        </ModalContent>
    );
}
