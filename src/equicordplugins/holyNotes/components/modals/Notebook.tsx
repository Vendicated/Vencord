/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BaseText } from "@components/BaseText";
import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import HelpIcon from "@equicordplugins/holyNotes/components/icons/HelpIcon";
import { noteHandler } from "@equicordplugins/holyNotes/NoteHandler";
import { HolyNotes } from "@equicordplugins/holyNotes/types";
import { classes } from "@utils/misc";
import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { findByProps } from "@webpack";
import { ContextMenuApi, FluxDispatcher, Menu, React, TextInput } from "@webpack/common";

import Errors from "./Error";
import HelpModal from "./HelpModal";
import ManageNotebookButton from "./ManageNotebookButton";
import { CreateTabBar } from "./NoteBookTab";
import { RenderMessage } from "./RenderMessage";

const renderNotebook = ({
    notes, notebook, updateParent, sortDirection, sortType, searchInput, closeModal
}: {
    notes: Record<string, HolyNotes.Note>;
    notebook: string;
    updateParent: () => void;
    sortDirection: boolean;
    sortType: boolean;
    searchInput: string;
    closeModal: () => void;
}) => {
    let notesArray = Object.values(notes);

    if (searchInput) {
        const searchLower = searchInput.toLowerCase();
        notesArray = notesArray.filter(note =>
            note.content?.toLowerCase().includes(searchLower)
        );
    }

    if (!notesArray.length) return <Errors />;

    if (sortType) {
        notesArray.sort((a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
    }

    if (sortDirection) notesArray.reverse();

    return notesArray.map(note => (
        <RenderMessage
            key={note.id || notebook}
            note={note}
            notebook={notebook}
            updateParent={updateParent}
            fromDeleteModal={false}
            closeModal={closeModal}
        />
    ));
};

export const NoteModal = (props: ModalProps & { onClose: () => void; }) => {
    const [sortType, setSortType] = React.useState(true);
    const [searchInput, setSearch] = React.useState("");
    const [sortDirection, setSortDirection] = React.useState(true);
    const [currentNotebook, setCurrentNotebook] = React.useState("Main");

    const { quickSelect, quickSelectLabel, quickSelectQuick, quickSelectValue, quickSelectArrow } = findByProps("quickSelect") || {};

    const forceUpdate = React.useReducer(() => ({}), {})[1] as () => void;

    const notes = noteHandler.getNotes(currentNotebook);
    if (!notes) return <></>;

    const { TabBar, selectedTab } = CreateTabBar({ tabs: noteHandler.getAllNotes(), firstSelectedTab: currentNotebook, onChangeTab: setCurrentNotebook });

    return (
        <ErrorBoundary>
            <ModalRoot {...props} className={classes("vc-notebook")} size={ModalSize.LARGE}>
                <Flex className={classes("vc-notebook-flex")} flexDirection="column" style={{ width: "100%" }}>
                    <div className={classes("vc-notebook-top-section")}>
                        <ModalHeader className={classes("vc-notebook-header-main")}>
                            <BaseText
                                size="lg"
                                weight="semibold"
                                style={{ flexGrow: 1 }}
                                className={classes("vc-notebook-heading")}>
                                NOTEBOOK
                            </BaseText>
                            <div className={classes("vc-notebook-flex", "vc-help-icon")} onClick={() => openModal(HelpModal)}>
                                <HelpIcon />
                            </div>
                            <div style={{ marginBottom: "10px" }} className={classes("vc-notebook-search")}>
                                <TextInput
                                    autoFocus={false}
                                    placeholder="Search for a message..."
                                    onChange={e => setSearch(e)}
                                />
                            </div>
                            <ModalCloseButton onClick={props.onClose} />
                        </ModalHeader>
                        <div className={classes("vc-notebook-tabbar-container")}>
                            {TabBar}
                        </div>
                    </div>
                    <ModalContent style={{ marginTop: "20px" }}>
                        <ErrorBoundary>
                            {renderNotebook({
                                notes,
                                notebook: currentNotebook,
                                updateParent: () => forceUpdate(),
                                sortDirection: sortDirection,
                                sortType: sortType,
                                searchInput: searchInput,
                                closeModal: props.onClose,
                            })}
                        </ErrorBoundary>
                    </ModalContent>
                </Flex>
                <ModalFooter>
                    <ManageNotebookButton notebook={currentNotebook} setNotebook={setCurrentNotebook} />
                    <div className={classes("sort-button-container", "vc-notebook-display-left")}>
                        <Flex
                            alignItems="center"
                            className={quickSelect}
                            onClick={(event: React.MouseEvent<HTMLDivElement>) => {
                                ContextMenuApi.openContextMenu(event, () => (
                                    <Menu.Menu
                                        navId="sort-menu"
                                        onClose={() => FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" })}
                                        aria-label="Sort Menu"
                                    >
                                        <Menu.MenuItem
                                            label="Ascending / Date Added"
                                            id="ada"
                                            action={() => {
                                                setSortDirection(true);
                                                setSortType(true);
                                            }} /><Menu.MenuItem
                                            label="Ascending / Message Date"
                                            id="amd"
                                            action={() => {
                                                setSortDirection(true);
                                                setSortType(false);
                                            }} /><Menu.MenuItem
                                            label="Descending / Date Added"
                                            id="dda"
                                            action={() => {
                                                setSortDirection(false);
                                                setSortType(true);
                                            }} /><Menu.MenuItem
                                            label="Descending / Message Date"
                                            id="dmd"
                                            action={() => {
                                                setSortDirection(false);
                                                setSortType(false);
                                            }} />
                                    </Menu.Menu>

                                ));
                            }}
                        >
                            <BaseText className={quickSelectLabel}>Change Sorting:</BaseText>
                            <Flex style={{ flexGrow: 0 }} alignItems="center" className={quickSelectQuick}>
                                <BaseText className={quickSelectValue}>
                                    {sortDirection ? "Ascending" : "Descending"} /{" "}
                                    {sortType ? "Date Added" : "Message Date"}
                                </BaseText>
                                <div className={quickSelectArrow} />
                            </Flex>
                        </Flex>
                    </div>
                </ModalFooter>
            </ModalRoot>
        </ErrorBoundary>
    );
};
