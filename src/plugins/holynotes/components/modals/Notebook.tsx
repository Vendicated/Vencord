/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Flex } from "@components/Flex";
import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalRoot, openModal } from "@utils/modal";
import { React, TabBar, Text, TextInput } from "@webpack/common";
import noteHandler from "plugins/holynotes/noteHandler";
import HelpIcon from "../icons/HelpIcon";
import ErrorBoundary from "@components/ErrorBoundary";



export const NoteModal = async (props) => {
    const [sortType, setSortType] = React.useState(true);
    const [searchInput, setSearch] = React.useState("");
    const [sortDirection, setSortDirection] = React.useState(true);
    const [currentNotebook, setCurrentNotebook] = React.useState("Main");

    const forceUpdate = React.useReducer(() => ({}), {})[1] as () => void;
    const notes = noteHandler.getNotes(currentNotebook);

    if (!notes) return <></>;

    return (
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
                            {Object.keys(await noteHandler.getAllNotes()).map(notebook => (
                                <TabBar.Item key={notebook} id={notebook} className="notebook-tabbar-barItem notebook-tabbar-item">
                                    {notebook}
                                </TabBar.Item>
                            ))}
                        </TabBar>
                    </div>
                </div>
                <ModalContent style={{ marginTop:"20px" }}>
                    <ErrorBoundary>
                        {}
                    </ErrorBoundary>
                </ModalContent>
            </Flex>
            <ModalFooter>

            </ModalFooter>
        </ModalRoot>
    );
};
