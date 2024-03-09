/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalRoot, openModal } from "@utils/modal";
import { React, TabBar, Text, TextInput } from "@webpack/common";
import noteHandler from "plugins/holynotes/noteHandler";
import { HolyNotes } from "plugins/holynotes/types";

import HelpIcon from "../icons/HelpIcon";
import Errors from "./Error";
import RenderMessage from "./RenderMessage";

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
    const messageArray = Object.values(notes).map((note) => {
        <RenderMessage
            note={note}
            notebook={notebook}
            updateParent={updateParent}
            fromDeleteModal={false}
            closeModal={closeModal}
        />;
    });

    if (sortType)
        messageArray.sort(
            (a, b) =>
                new Date(b.props.note?.timestamp)?.getTime() - new Date(a.props.note?.timestamp)?.getTime(),
        );

    if (sortDirection) messageArray.reverse();
            console.log(messageArray);
    const filteredMessages = messageArray.filter((message) =>
        message.props.note.content.toLowerCase().includes(searchInput.toLowerCase()),
    );

    return filteredMessages;
};



export const NoteModal = (props) => {
    const [sortType, setSortType] = React.useState(true);
    const [searchInput, setSearch] = React.useState("");
    const [sortDirection, setSortDirection] = React.useState(true);
    const [currentNotebook, setCurrentNotebook] = React.useState("Main");
    const [notes, setNotes] = React.useState({});
    const [notebooks, setNotebooks] = React.useState([]);

    const forceUpdate = React.useReducer(() => ({}), {})[1] as () => void;

    React.useEffect(() => {
        const update = async () => {
            const notes = await noteHandler.getNotes(currentNotebook);
            setNotes(notes);
        };
        update();
    }, [currentNotebook]);

    React.useEffect(() => {
        async function fetchNotebooks() {
            console.log(await noteHandler.getNotebooks());
            const notebooks = await noteHandler.getNotebooks();
            setNotebooks(notebooks);
        }

        fetchNotebooks();
    }, []);


    if (!notes) return <></>;

    return (
        <ErrorBoundary>
            <ModalRoot {...props} className="notebook" size="large" style={{ borderRadius: "8px" }}>
                <Flex className="notebook-flex" style={{ width: "100%" }}>
                    <div className="notebook-topSection">
                        <ModalHeader className="notebook-header-main">
                            <Text
                                variant="heading-lg/semibold"
                                style={{ flexGrow: 1 }}
                                className="notebook-heading">
                                NOTEBOOK
                            </Text>
                            <div className="notebook-flex help-icon" onClick={() => openModal()}>
                                <HelpIcon />
                            </div>
                            <div style={{ marginBottom: "10px" }} className="notebook-search">
                                <TextInput
                                    autoFocus={false}
                                    placeholder="Search for a message..."
                                    onChange={(e) => setSearch(e)}
                                />
                            </div>
                            <ModalCloseButton onClick={props.onClose} />
                        </ModalHeader>
                        <div className="notebook-tabbar-Container">
                            <TabBar
                                type="top"
                                look="brand"
                                className="notebook-tabbar-Bar notebook-tabbar"
                                selectedItem={currentNotebook}
                                onItemSelect={setCurrentNotebook}>
                                {notebooks.map(notebook => (
                                    <TabBar.Item key={notebook} id={notebook} className="notebook-tabbar-barItem notebook-tabbar-item">
                                        {notebook}
                                    </TabBar.Item>
                                ))}
                            </TabBar>
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

                </ModalFooter>
            </ModalRoot>
        </ErrorBoundary>
    );
};
