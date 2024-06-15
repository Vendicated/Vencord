/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import { openPrivateChannel, openUserProfile } from "@utils/discord";
import { copyWithToast } from "@utils/misc";
import {
    closeModal, ModalCloseButton, ModalContent, ModalHeader, ModalProps, ModalRoot, openModal
} from "@utils/modal";
import { LazyComponent, useAwaiter } from "@utils/react";
import { filters, find } from "@webpack";
import { Alerts, Avatar, Button, ContextMenuApi, Menu, React, RelationshipStore, Select, Text, TextArea, TextInput, useCallback, useMemo, useReducer, UserStore, UserUtils, useState } from "@webpack/common";

import { deleteUserNotes, saveUserNotes, usersNotes as usersNotesMap } from "../data";
import settings from "../settings";
import { DeleteIcon, PopupIcon, RefreshIcon, SaveIcon } from "./Icons";
import { openUserNotesModal } from "./UserNotesModal";

const cl = classNameFactory("vc-user-notes-data-modal-");

const enum SearchStatus {
    ALL,
    FRIENDS,
    BLOCKED,
}

export function NotesDataModal({ modalProps, close }: {
    modalProps: ModalProps;
    close(): void;
}) {
    const [searchValue, setSearchValue] = React.useState({ query: "", status: SearchStatus.ALL });

    const onSearch = (query: string) => setSearchValue(prev => ({ ...prev, query }));
    const onStatusChange = (status: SearchStatus) => setSearchValue(prev => ({ ...prev, status }));

    const [usersNotesData, refreshNotesData] = useReducer(() => {
        return Array.from(usersNotesMap);
    }, Array.from(usersNotesMap));

    const filteredNotes = useMemo(() => {
        const { query, status } = searchValue;

        if (query === "" && status === SearchStatus.ALL) {
            return usersNotesData;
        }

        return usersNotesData
            .filter(([userId, userNotes]) => {
                return (
                    status === SearchStatus.FRIENDS ?
                        RelationshipStore.isFriend(userId) &&
                        (
                            query === "" ||
                            (
                                userId.includes(query) ||
                                userNotes.toLowerCase().includes(query.toLowerCase())
                            )
                        )
                        :
                        status === SearchStatus.BLOCKED ?
                            RelationshipStore.isBlocked(userId) &&
                            (
                                query === "" ||
                                (
                                    userId.includes(query) ||
                                    userNotes.toLowerCase().includes(query.toLowerCase())
                                )
                            )
                            :
                            query === "" ||
                            (
                                userId.includes(query) ||
                                userNotes.toLowerCase().includes(query.toLowerCase())
                            )
                );
            });
    }, [usersNotesData, searchValue]);

    const [visibleNotesNum, setVisibleNotesNum] = useState(10);

    const loadMore = useCallback(() => {
        setVisibleNotesNum(prevNum => prevNum + 10);
    }, []);

    const visibleNotes = filteredNotes.slice(0, visibleNotesNum);

    const canLoadMore = visibleNotesNum < filteredNotes.length;

    return (
        <ModalRoot className={cl("root")} {...modalProps}>
            <ModalHeader className={cl("header")}>
                <Text className={cl("header-text")} variant="heading-lg/semibold">Notes Data</Text>
                <TextInput className={cl("header-input")} value={searchValue.query} onChange={onSearch} placeholder="Filter Notes (ID/Notes)" />
                <div className={cl("header-user-type")}>
                    <Select
                        options={[
                            { label: "Show All", value: SearchStatus.ALL, default: true },
                            { label: "Show Friends", value: SearchStatus.FRIENDS },
                            { label: "Show Blocked", value: SearchStatus.BLOCKED },
                        ]}
                        serialize={String}
                        select={onStatusChange}
                        isSelected={v => v === searchValue.status}
                        closeOnSelect={true}
                    />
                </div>
                <ModalCloseButton onClick={close} />
            </ModalHeader>
            {
                <div style={{ opacity: modalProps.transitionState === 1 ? "1" : "0" }} className={cl("content-container")}>
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
    globalName: string;
    username: string;
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
            globalName: (user as any).globalName ?? user.username,
            username: user.username,
            avatar: user.getAvatarURL(void 0, void 0, false),
        } as UserInfo;
    });

    let userInfo = awaitedResult[0];
    const pending = awaitedResult[2];

    userInfo ??= {
        id: userId,
        globalName: pending ? "Loading..." : "Unable to load",
        username: pending ? "Loading..." : "Unable to load",
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
                            id={cl("open-user-profile")}
                            label="Open User Profile"
                            action={() => openUserProfile(userId)}
                        />
                        <Menu.MenuItem
                            id={cl("open-user-chat")}
                            label="Open User Chat"
                            action={() => openPrivateChannel(userId)}
                        />
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
                                        id={cl("copy-user-globalname")}
                                        label="Copy Global Name"
                                        action={() => copyWithToast(userInfo!.globalName)}
                                    />
                                    <Menu.MenuItem
                                        id={cl("copy-user-username")}
                                        label="Copy Username"
                                        action={() => copyWithToast(userInfo!.username)}
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
                <Text className={cl("user-info-globalname")} variant="text-lg/bold">{userInfo.globalName}</Text>
                <Text className={cl("user-info-username")} variant="text-md/normal">{userInfo.username}</Text>
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
                        className={cl("user-actions-save")}
                        size={Button.Sizes.NONE}
                        data={"Save"}
                        color={Button.Colors.GREEN}
                        onClick={() => {
                            saveUserNotes(userId, userNotes);
                            refreshNotesData();
                        }}
                    >
                        <SaveIcon />
                    </Button>
                    <Button
                        className={cl("user-actions-delete")}
                        size={Button.Sizes.NONE}
                        data={"Delete"}
                        color={Button.Colors.RED}
                        onClick={() => {
                            Alerts.show({
                                title: "Delete Notes",
                                body: `Are you sure you want to delete notes for ${pending ? userId : `${userInfo!.globalName} (${userId})`}?`,
                                confirmColor: Button.Colors.RED,
                                confirmText: "Delete",
                                cancelText: "Cancel",
                                onConfirm: () => {
                                    deleteUserNotes(userId);
                                    refreshNotesData();
                                },
                            });
                        }}
                    >
                        <DeleteIcon />
                    </Button>
                    <Button
                        className={cl("user-actions-refresh")}
                        size={Button.Sizes.NONE}
                        data={"Refresh"}
                        color={Button.Colors.LINK}
                        onClick={() => setUserNotes(userNotesArg)}
                    >
                        <RefreshIcon />
                    </Button>
                    <Button
                        className={cl("user-actions-popup")}
                        size={Button.Sizes.NONE}
                        data={"Open Full View"}
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
