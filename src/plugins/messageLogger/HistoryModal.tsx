/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import { ModalCloseButton, ModalContent, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { findByPropsLazy } from "@webpack";
import { TabBar, Text, Timestamp, TooltipContainer, useState } from "@webpack/common";

import { parseEditContent } from ".";

const CodeContainerClasses = findByPropsLazy("markup", "codeContainer");
const MiscClasses = findByPropsLazy("messageContent", "markupRtl");

const cl = classNameFactory("vc-ml-modal-");

export function openHistoryModal(message: any) {
    openModal(props =>
        <ErrorBoundary>
            <HistoryModal
                modalProps={props}
                message={message}
            />
        </ErrorBoundary>
    );
}

export function HistoryModal({ modalProps, message }: { modalProps: ModalProps; message: any; }) {
    const [currentTab, setCurrentTab] = useState(message.editHistory.length);
    const timestamps = [message.firstEditTimestamp, ...message.editHistory.map(m => m.timestamp)];
    const contents = [...message.editHistory.map(m => m.content), message.content];

    return (
        <ModalRoot {...modalProps} size={ModalSize.LARGE}>
            <ModalHeader className={cl("head")}>
                <Text variant="heading-lg/semibold" style={{ flexGrow: 1 }}>Message Edit History</Text>
                <ModalCloseButton onClick={modalProps.onClose} />
            </ModalHeader>

            <ModalContent className={cl("contents")}>
                <TabBar
                    type="top"
                    look="brand"
                    className={classes("vc-settings-tab-bar", cl("tab-bar"))}
                    selectedItem={currentTab}
                    onItemSelect={setCurrentTab}
                >
                    {message.firstEditTimestamp.getTime() !== message.timestamp.getTime() && (
                        <TooltipContainer text="This edit state was not logged so it can't be displayed.">
                            <TabBar.Item
                                className="vc-settings-tab-bar-item"
                                id={-1}
                                disabled
                            >
                                <Timestamp
                                    className={cl("timestamp")}
                                    timestamp={message.timestamp}
                                    isEdited={true}
                                    isInline={false}
                                />
                            </TabBar.Item>
                        </TooltipContainer>
                    )}

                    {timestamps.map((timestamp, index) => (
                        <TabBar.Item
                            key={index}
                            className="vc-settings-tab-bar-item"
                            id={index}
                        >
                            <Timestamp
                                className={cl("timestamp")}
                                timestamp={timestamp}
                                isEdited={true}
                                isInline={false}
                            />
                        </TabBar.Item>
                    ))}
                </TabBar>

                <div className={classes(CodeContainerClasses.markup, MiscClasses.messageContent, Margins.top20)}>
                    {parseEditContent(contents[currentTab], message)}
                </div>
            </ModalContent>
        </ModalRoot>
    );
}
