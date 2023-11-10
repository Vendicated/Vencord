/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { ModalContent, ModalRoot, ModalSize, closeModal, openModal } from "@utils/modal";
import { Forms, Clickable } from "@webpack/common";
import { Flex } from "@components/Flex";
import { cl, getEmojiUrl } from "../utils";
import ErrorBoundary from "@components/ErrorBoundary";
import { SoundLogEntry, User } from "../utils";

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
                    const currentUser = item.users.find(({ id }) => id === user.id) ?? { id: '', plays: [0] };
                    return (
                        <Clickable onClick={() => {
                            closeModal();
                            onClickUser(item, user);
                        }}>
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
                                <Forms.FormText variant="text-xs/medium" style={{ cursor: "pointer" }}>Played {currentUser.plays.length} {currentUser.plays.length === 1 ? 'time' : 'times'}</Forms.FormText>
                            </div>
                        </Clickable>
                    );
                })}
            </div>
        </ModalContent>
    );
}