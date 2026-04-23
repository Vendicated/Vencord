/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BaseText } from "@components/BaseText";
import { Button } from "@components/Button";
import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { BookmarkIcon } from "@components/Icons";
import { CircleQuestionIcon, cl } from "@equicordplugins/holyNotes";
import { noteHandler } from "@equicordplugins/holyNotes/NoteHandler";
import { Note, Notebook } from "@equicordplugins/holyNotes/types";
import { CloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { Clickable, React, Select, TextInput, Tooltip, useState } from "@webpack/common";

import Errors from "./Error";
import HelpModal from "./HelpModal";
import NotebookCreateModal from "./NotebookCreateModal";
import NotebookDeleteModal from "./NotebookDeleteModal";
import { RenderMessage } from "./RenderMessage";

const enum SortOption {
    NewestAdded,
    OldestAdded,
    NewestMessage,
    OldestMessage
}

function NotebookTabs({ notebooks, selected, onSelect }: {
    notebooks: string[];
    selected: string;
    onSelect: (tab: string) => void;
}) {
    const sorted = [...notebooks].sort((a, b) =>
        a === "Main" ? -1 : b === "Main" ? 1 : a.localeCompare(b)
    );

    return (
        <div className={cl("tabs")}>
            {sorted.map(name => (
                <Clickable
                    key={name}
                    className={cl("tab", selected === name && "tab-selected")}
                    onClick={() => onSelect(name)}
                >
                    {name}
                </Clickable>
            ))}
        </div>
    );
}

function sortNotes(notes: Note[], sort: SortOption): Note[] {
    const sorted = [...notes];
    switch (sort) {
        case SortOption.NewestAdded:
            return sorted;
        case SortOption.OldestAdded:
            return sorted.reverse();
        case SortOption.NewestMessage:
            return sorted.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        case SortOption.OldestMessage:
            return sorted.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }
}

function filterNotes(notes: Notebook, search: string): Note[] {
    const arr = Object.values(notes);
    if (!search) return arr;
    const q = search.toLowerCase();
    return arr.filter(n => n.content?.toLowerCase().includes(q));
}

export function NoteModal({ onClose, transitionState }: ModalProps) {
    const [sort, setSort] = useState(SortOption.NewestAdded);
    const [search, setSearch] = useState("");
    const [notebook, setNotebook] = useState("Main");
    const [, forceUpdate] = React.useReducer(x => x + 1, 0);

    const notes = noteHandler.getNotes(notebook);
    if (!notes) return null;

    const filtered = filterNotes(notes, search);
    const sorted = sortNotes(filtered, sort);
    const total = Object.keys(notes).length;
    const isMain = notebook === "Main";

    return (
        <ModalRoot transitionState={transitionState} size={ModalSize.LARGE}>
            <ModalHeader separator={false} className={cl("header")}>
                <div className={cl("header-content")}>
                    <Flex alignItems="center" style={{ gap: "12px" }}>
                        <BookmarkIcon width="24" height="24" />
                        <BaseText tag="h2" size="lg" weight="semibold" className={cl("title")}>
                            Notebook
                        </BaseText>
                    </Flex>
                    <BaseText size="sm" className={cl("description")}>
                        {search ? `${filtered.length} of ${total}` : total} {total === 1 ? "note" : "notes"}
                    </BaseText>
                </div>
                <div className={cl("header-trailing")}>
                    <CloseButton onClick={onClose} />
                </div>
            </ModalHeader>

            <div className={cl("controls")}>
                <TextInput
                    placeholder="Search notes..."
                    value={search}
                    onChange={setSearch}
                />
                <Select
                    options={[
                        { label: "Newest First", value: SortOption.NewestAdded, default: true },
                        { label: "Oldest First", value: SortOption.OldestAdded },
                        { label: "Newest Msg", value: SortOption.NewestMessage },
                        { label: "Oldest Msg", value: SortOption.OldestMessage },
                    ]}
                    serialize={String}
                    select={setSort}
                    isSelected={v => v === sort}
                    closeOnSelect
                />
            </div>

            <NotebookTabs
                notebooks={Object.keys(noteHandler.getAllNotes())}
                selected={notebook}
                onSelect={setNotebook}
            />

            <ModalContent className={cl("content")}>
                <ErrorBoundary>
                    {sorted.length ? sorted.map(note => (
                        <RenderMessage
                            key={note.id}
                            note={note}
                            notebook={notebook}
                            updateParent={forceUpdate}
                            fromDeleteModal={false}
                            closeModal={onClose}
                        />
                    )) : <Errors />}
                </ErrorBoundary>
            </ModalContent>

            <ModalFooter>
                <Flex style={{ justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                    <Tooltip text="Help">
                        {({ onMouseEnter, onMouseLeave }) => (
                            <Clickable
                                className={cl("icon-button")}
                                onClick={() => openModal(props => <HelpModal {...props} />)}
                                onMouseEnter={onMouseEnter}
                                onMouseLeave={onMouseLeave}
                            >
                                <CircleQuestionIcon size="sm" />
                            </Clickable>
                        )}
                    </Tooltip>
                    <Button
                        variant={isMain ? "primary" : "dangerPrimary"}
                        onClick={() => isMain
                            ? openModal(props => <NotebookCreateModal {...props} />)
                            : openModal(props => <NotebookDeleteModal {...props} notebook={notebook} onChangeTab={setNotebook} />)
                        }
                    >
                        {isMain ? "Create Notebook" : "Delete Notebook"}
                    </Button>
                </Flex>
            </ModalFooter>
        </ModalRoot>
    );
}
