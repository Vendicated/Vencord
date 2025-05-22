/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { closeAllModals, ModalContent, ModalFooter, ModalHeader, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { Button, FluxDispatcher, NavigationRouter, React, Text, TextInput } from "@webpack/common";
import { classNameFactory } from "@api/Styles";

import { Bookmark, getAllBookmarks, clearAllBookmarks, removeBookmark as deleteBookmark } from "../utils/bookmarkUtils";
import "./bookmarksModal.css";

export function openBookmarksModal() {
    openModal(modalProps => <BookmarksModal modalProps={modalProps} />);
}

const cl = classNameFactory("bookmarks-modal-");

interface Props {
    modalProps: any;
}

export function BookmarksModal({ modalProps }: Props) {
    const [bookmarks, setBookmarks] = React.useState<Bookmark[]>([]);
    const [query, setQuery] = React.useState("");

    React.useEffect(() => {
        const update = () => {
            getAllBookmarks().then(setBookmarks);
        };

        update();
        FluxDispatcher.subscribe("BOOKMARKS_UPDATED", update);
        return () => FluxDispatcher.unsubscribe("BOOKMARKS_UPDATED", update);
    }, []);

    const handleDelete = async (id: string) => {
        await deleteBookmark(id);
        setBookmarks(await getAllBookmarks());
    };

    const handleClear = async () => {
        await clearAllBookmarks();
        setBookmarks([]);
    };

    return (
        <ModalRoot {...modalProps} size={ModalSize.LARGE} className={cl("root")}>
            <ModalHeader className={cl("header")}>
                <TextInput
                    placeholder="Filter Bookmarks"
                    value={query}
                    onChange={setQuery}
                    style={{ width: "100%" }}
                />
            </ModalHeader>



            <ModalContent className={cl("content")}>
                {bookmarks.length === 0 ? (
                    <Text>No bookmarks yet.</Text>
                ) : (
                    bookmarks
                        .filter(b =>
                            b.content.toLowerCase().includes(query.toLowerCase()) ||
                            b.authorName.toLowerCase().includes(query.toLowerCase())
                        )
                        .map(b => (
                            <div key={b.id} className={cl("entry")}>
                                <img
                                    src={b.authorAvatar}
                                    alt={b.authorName}
                                    className={cl("avatar")}
                                />
                                <div className={cl("contentInner")}>
                                    <div className={cl("entryHeader")}>
                                        <span className={cl("username")}>{b.authorName}</span>
                                        <span className={cl("timestamp")}>{new Date(b.timestamp).toLocaleString()}</span>
                                    </div>
                                    <div className={cl("body")}>{b.content}</div>
                                    <div className={cl("actions")}>
                                        <Button
                                            size={Button.Sizes.SMALL}
                                            onClick={() => {
                                                NavigationRouter.transitionTo(`/channels/${b.guildId ?? "@me"}/${b.channelId}/${b.id}`);
                                                closeAllModals();
                                            }}
                                        >
                                            Jump
                                        </Button>
                                        <Button
                                            size={Button.Sizes.SMALL}
                                            color={Button.Colors.RED}
                                            onClick={() => handleDelete(b.id)}
                                        >
                                            Delete
                                        </Button>
                                    </div>
                                </div>
                            </div>

                        ))
                )}
            </ModalContent>

            {bookmarks.length > 0 && (
                <ModalFooter className={cl("footer")}>
                    <Button color={Button.Colors.RED} onClick={handleClear}>
                        Clear All Bookmarks
                    </Button>
                </ModalFooter>
            )}
        </ModalRoot>
    );
}
