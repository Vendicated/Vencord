/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import { copyWithToast } from "@utils/misc";
import {
    closeModal, ModalCloseButton, ModalContent, ModalHeader, ModalProps, ModalRoot, openModal
} from "@utils/modal";
import { LazyComponent, useAwaiter } from "@utils/react";
import { filters, find } from "@webpack";
import { Avatar, Button, ContextMenuApi, Menu, React, Text, TextArea, TextInput, useCallback, useMemo, useReducer, useRef, UserStore, UserUtils, useState } from "@webpack/common";

import { deleteUserNotes, saveUserNotes, usersNotes as usersNotesMap } from "../data";
import settings from "../settings";
import { DeleteIcon, PopupIcon, RefreshIcon, SaveIcon } from "./Icons";
import { openUserNotesModal } from "./UserNotesModal";

const cl = classNameFactory("vc-user-notes-data-modal-");

export function NotesDataModal({ modalProps, close }: {
    modalProps: ModalProps;
    close(): void;
}) {
    const [searchQuery, setSearchQuery] = useState("");
    const [visibleNotesNum, setVisibleNotesNum] = useState(10);
    const contentRef = useRef<HTMLDivElement | null>(null);

    const loadMore = useCallback(() => {
        setVisibleNotesNum(prevNum => prevNum + 10);
    }, []);

    const [usersNotesData, refreshNotesData] = useReducer(() => {
        return Array.from(usersNotesMap);
    }, Array.from(usersNotesMap));

    const filteredNotes = useMemo(() => {
        if (searchQuery === "") {
            return usersNotesData;
        }

        return usersNotesData
            .filter(([userId, userNotes]) =>
                userId.includes(searchQuery) ||
                userNotes.toLowerCase().includes(searchQuery.toLowerCase())
            );
    }, [usersNotesData, searchQuery]);

    const visibleNotes = filteredNotes.slice(0, visibleNotesNum);

    const canLoadMore = visibleNotesNum < filteredNotes.length;

    return (
        <ModalRoot className={cl("root")} {...modalProps}>
            <ModalHeader className={cl("header")}>
                <Text className={cl("header-text")} variant="heading-lg/semibold">Notes Data</Text>
                <TextInput className={cl("header-input")} value={searchQuery} onChange={e => setSearchQuery(e)} placeholder="Filter Notes (ID/Notes)" />
                <ModalCloseButton onClick={close} />
            </ModalHeader>
            {
                <div style={{ opacity: modalProps.transitionState === 1 ? "1" : "0" }} className={cl("content-container")} ref={contentRef}>
                    {
                        modalProps.transitionState === 1 &&
                        <ModalContent className={cl("content")}>
                            {
                                !visibleNotes.length ? NoNotes() : (
                                    <NotesDataContent
                                        visibleNotes={visibleNotes}
                                        canLoadMore={canLoadMore}
                                        loadMore={loadMore}
                                        refreshNotesData={refreshNotesData}
                                    />
                                )
                            }
                        </ModalContent>
                    }
                </div>
            }
        </ModalRoot>
    );
}

function NotesDataContentFactory({ visibleNotes, canLoadMore, loadMore, refreshNotesData }: {
    visibleNotes: [string, string][];
    canLoadMore: boolean;
    loadMore(): void;
    refreshNotesData(): void;
}) {
    if (!visibleNotes.length)
        return NoNotes();

    return (
        <div className={cl("content-inner")}>
            {
                visibleNotes
                    .map(([userId, userNotes]) => (
                        <NotesDataRow
                            key={userId}
                            userId={userId}
                            userNotes={userNotes}
                            refreshNotesData={refreshNotesData}
                        />
                    ))
            }
            {
                canLoadMore &&
                <Button
                    className={cl("load-more")}
                    size={Button.Sizes.NONE}
                    onClick={() => loadMore()}
                >
                    Load More
                </Button>
            }
        </div>
    );
}

const NotesDataContent = LazyComponent(() => React.memo(NotesDataContentFactory));

function NoNotes() {
    return (
        <div className={cl("no-notes")} style={{ textAlign: "center" }}>
            <Text variant="text-lg/normal">
                No Notes.
            </Text>
        </div>
    );
}

const IconButton = LazyComponent(() => {
    const filter = filters.byCode(".HEADER_BAR_BADGE");
    return find(m => m.Icon && filter(m.Icon)).Icon;
});

type UserInfo = {
    id: string;
    name: string;
    avatar: string;
};

function NotesDataRow({ userId, userNotes: userNotesArg, refreshNotesData }: {
    userId: string;
    userNotes: string;
    refreshNotesData(): void;
}) {
    const awaitedResult = useAwaiter(async () => {
        const user = await UserUtils.getUser(userId);

        return {
            id: userId,
            name: user.username,
            avatar: user.getAvatarURL(void 0, void 0, false),
        } as UserInfo;
    });

    let userInfo = awaitedResult[0];
    const pending = awaitedResult[2];

    userInfo ??= {
        id: userId,
        name: pending ? "Loading..." : "Unable to load",
        avatar: "https://discord.com/assets/0048cbfdd0b3ef186d22.png",
    } as const;

    const [userNotes, setUserNotes] = useState(userNotesArg);

    return (
        <div
            className={cl("user")}
            onContextMenu={event => {
                ContextMenuApi.openContextMenu(event, () =>
                    <Menu.Menu
                        navId={cl("user-context-menu")}
                        onClose={ContextMenuApi.closeContextMenu}
                        aria-label="User Notes Data"
                    >
                        <Menu.MenuItem
                            id={cl("copy-user-id")}
                            label="Copy ID"
                            action={() => copyWithToast(userInfo!.id)}
                        />
                        {
                            !pending &&
                            (
                                <>
                                    <Menu.MenuItem
                                        id={cl("copy-user-name")}
                                        label="Copy UserName"
                                        action={() => copyWithToast(userInfo!.name)}
                                    />
                                    <Menu.MenuItem
                                        id={cl("copy-user-avatar")}
                                        label="Copy Avatar URL"
                                        action={() => copyWithToast(userInfo!.avatar)}
                                    />
                                </>
                            )
                        }
                        <Menu.MenuItem
                            id={cl("copy-user-notes")}
                            label="Copy Notes"
                            action={() => copyWithToast(userNotes)}
                        />
                    </Menu.Menu>
                );
            }}
        >
            {
                pending ? <LoaderSpinner /> :
                    <Avatar
                        className={cl("user-avatar")}
                        size="SIZE_56"
                        src={userInfo.avatar}
                    />
            }
            <div className={cl("user-info")}>
                <Text className={cl("user-info-name")} variant="text-lg/bold">{userInfo.name}</Text>
                <Text className={cl("user-info-id")} variant="text-md/normal">{userInfo.id}</Text>
            </div>
            <div className={cl("user-notes-container")}>
                <TextArea
                    className={cl("user-text-area")}
                    placeholder="Click to add a note"
                    value={userNotes}
                    onChange={setUserNotes}
                    spellCheck={!settings.store.disableSpellCheck}
                />
                <div className={cl("user-actions")}>
                    <Button
                        size={Button.Sizes.NONE}
                        color={Button.Colors.GREEN}
                        onClick={() => {
                            saveUserNotes(userId, userNotes);
                            refreshNotesData();
                        }}
                    >
                        <SaveIcon />
                    </Button>
                    <Button
                        size={Button.Sizes.NONE}
                        color={Button.Colors.RED}
                        onClick={() => {
                            deleteUserNotes(userId);
                            refreshNotesData();
                        }}
                    >
                        <DeleteIcon />
                    </Button>
                    <Button
                        size={Button.Sizes.NONE}
                        color={Button.Colors.LINK}
                        onClick={() => setUserNotes(userNotesArg)}
                    >
                        <RefreshIcon />
                    </Button>
                    <Button
                        size={Button.Sizes.NONE}
                        color={Button.Colors.PRIMARY}
                        disabled={pending}
                        onClick={async () => {
                            const user = UserStore.getUser(userId);

                            openUserNotesModal(user ?? userId, refreshNotesData);
                        }}
                    >
                        <PopupIcon />
                    </Button>
                </div>
            </div>
        </div>
    );
}

function LoaderSpinnerFactory() {
    return (
        <div className={cl("loading-container")}>
            <span className={cl("loading")} />
        </div>
    );
}

const LoaderSpinner = LazyComponent(() => React.memo(LoaderSpinnerFactory));

export const openNotesDataModal = async () => {
    const key = openModal(modalProps => (
        <NotesDataModal
            modalProps={modalProps}
            close={() => closeModal(key)}
        />
    ));
};
