/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import {
    closeModal, ModalCloseButton, ModalContent, ModalHeader, ModalProps, ModalRoot, openModal
} from "@utils/modal";
import { LazyComponent } from "@utils/react";
import { Button, React, RelationshipStore, Select, Text, TextInput, useCallback, useMemo, useReducer, useState } from "@webpack/common";

import { cacheUsers, getNotes, usersCache as usersCache$1 } from "../data";
import NotesDataRow from "./NotesDataRow";

const cl = classNameFactory("vc-notes-searcher-modal-");

const enum SearchStatus {
    ALL,
    FRIENDS,
    BLOCKED,
}

const filterUser = (query: string, userId: string, userNotes: string) => {
    if (query === "" || userId.includes(query)) return true;

    query = query.toLowerCase();

    const user = usersCache$1.get(userId);

    return user && (
        user.globalName?.toLowerCase().includes(query) || user.username.toLowerCase().includes(query)
    ) || userNotes.toLowerCase().includes(query);
};

// looks like a shit but I don't know better way to do it
// P.S. using `getNotes()` as deps for useMemo won't work due to object init outside of component
let RefreshNotesDataEx: () => void | undefined;

export const refreshNotesData = () => {
    if (!RefreshNotesDataEx) return;

    RefreshNotesDataEx();
};

export function NotesDataModal({ modalProps, close }: {
    modalProps: ModalProps;
    close(): void;
}) {
    const [searchValue, setSearchValue] = useState({ query: "", status: SearchStatus.ALL });

    const onSearch = (query: string) => setSearchValue(prev => ({ ...prev, query }));
    const onStatusChange = (status: SearchStatus) => setSearchValue(prev => ({ ...prev, status }));

    const [usersNotesData, refreshNotesData] = useReducer(() => {
        return Object.entries(getNotes())
            .map<[string, string]>(([userId, { note }]) => [userId, note])
            .filter((([_, note]) => note !== ""));
    },
    Object.entries(getNotes())
        .map<[string, string]>(([userId, { note }]) => [userId, note])
        .filter((([_, note]) => note !== ""))
    );

    RefreshNotesDataEx = refreshNotesData;

    const filteredNotes = useMemo(() => {
        const { query, status } = searchValue;

        if (query === "" && status === SearchStatus.ALL) {
            return usersNotesData;
        }

        return usersNotesData
            .filter(([userId, userNotes]) => {
                switch (status) {
                    case SearchStatus.FRIENDS:
                        return RelationshipStore.isFriend(userId) && filterUser(query, userId, userNotes);
                    case SearchStatus.BLOCKED:
                        return RelationshipStore.isBlocked(userId) && filterUser(query, userId, userNotes);
                    default:
                        return filterUser(query, userId, userNotes);
                }
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
                <Text className={cl("header-text")} variant="heading-lg/semibold" style={{ whiteSpace: "nowrap", width: "fit-content", marginRight: "16px" }}>Notes Data</Text>
                <TextInput className={cl("header-input")} value={searchValue.query} onChange={onSearch} placeholder="Filter Notes (ID/Global Name/Username/Notes text)" style={{ width: "100% !important", marginRight: "16px" }} />
                <div className={cl("header-user-type")} style={{ minWidth: "160px", marginRight: "16px" }}>
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
            <div style={{ opacity: modalProps.transitionState === 1 ? "1" : "0", overflow: "hidden", height: "100%" }} className={cl("content-container")}>
                {
                    modalProps.transitionState === 1 &&
                    <ModalContent className={cl("content")}>
                        {
                            !visibleNotes.length ? <NoNotes /> : (
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
        </ModalRoot>
    );
}

// looks like a shit but I don't know better way to do it
// P.S. using `usersCache` as deps for useMemo won't work due to object init outside of component
let RefreshUsersCacheEx: () => void | undefined;

export const refreshUsersCache = () => {
    if (!RefreshUsersCacheEx) return;

    RefreshUsersCacheEx();
};

const NotesDataContent = ({ visibleNotes, canLoadMore, loadMore, refreshNotesData }: {
    visibleNotes: [string, string][];
    canLoadMore: boolean;
    loadMore(): void;
    refreshNotesData(): void;
}) => {
    if (!visibleNotes.length)
        return <NoNotes />;

    const [usersCache, refreshUsersCache] = useReducer(() => {
        return new Map(usersCache$1);
    }, usersCache$1);

    RefreshUsersCacheEx = refreshUsersCache;

    return (
        <div className={cl("content-inner")} style={{ paddingTop: "16px", height: "fit-content" }}>
            {
                visibleNotes
                    .map(([userId, userNotes]) => {
                        return (
                            <NotesDataRow
                                key={userId}
                                userId={userId}
                                userNotes={userNotes}
                                usersCache={usersCache}
                                refreshNotesData={refreshNotesData}
                            />
                        );
                    })
            }
            {
                canLoadMore &&
                <Button
                    className={cl("load-more")}
                    size={Button.Sizes.NONE}
                    style={{ marginTop: "16px", width: "100%", height: "32px" }}
                    onClick={() => loadMore()}
                >
                    Load More
                </Button>
            }
        </div>
    );
};

const NoNotes = LazyComponent(() => React.memo(() => (
    <div className={cl("no-notes")} style={{ textAlign: "center", display: "grid", placeContent: "center", height: "100%" }}>
        <Text variant="text-lg/normal">
            No Notes.
        </Text>
    </div>
)));

let fistTimeOpen = true;

export const openNotesDataModal = async () => {
    if (fistTimeOpen) {
        cacheUsers();
        fistTimeOpen = false;
    }

    const key = openModal(modalProps => (
        <NotesDataModal
            modalProps={modalProps}
            close={() => closeModal(key)}
        />
    ));
};
