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

import { NotesMap, usersCache } from "../data";
import CachePopout from "./CachePopout";
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

    const user = usersCache.get(userId);

    return user && (
        user.globalName?.toLowerCase().includes(query) || user.username.toLowerCase().includes(query)
    ) || userNotes.toLowerCase().includes(query);
};

// looks like a shit but I didn't know better way to do it
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
        return Array.from(NotesMap);
    }, Array.from(NotesMap));

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
                <Text className={cl("header-text")} variant="heading-lg/semibold">Notes Data</Text>
                <TextInput className={cl("header-input")} value={searchValue.query} onChange={onSearch} placeholder="Filter Notes (ID/Notes and Global/Username if cached)" />
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
                <CachePopout />
                <ModalCloseButton onClick={close} />
            </ModalHeader>
            {
                <div style={{ opacity: modalProps.transitionState === 1 ? "1" : "0" }} className={cl("content-container")}>
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
            }
        </ModalRoot>
    );
}

const NotesDataContent = LazyComponent(() => React.memo(({ visibleNotes, canLoadMore, loadMore, refreshNotesData }: {
    visibleNotes: [string, string][];
    canLoadMore: boolean;
    loadMore(): void;
    refreshNotesData(): void;
}) => {
    if (!visibleNotes.length)
        return <NoNotes />;

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
}));

const NoNotes = LazyComponent(() => React.memo(() => (
    <div className={cl("no-notes")} style={{ textAlign: "center" }}>
        <Text variant="text-lg/normal">
            No Notes.
        </Text>
    </div>
)));

export const openNotesDataModal = async () => {
    const key = openModal(modalProps => (
        <NotesDataModal
            modalProps={modalProps}
            close={() => closeModal(key)}
        />
    ));
};
