/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { closeModal, ModalCloseButton, ModalContent, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { findByPropsLazy } from "@webpack";
import { Parser, Text, Timestamp, useState } from "@webpack/common";

const CodeContainerClasses = findByPropsLazy("markup", "codeContainer");
const MiscClasses = findByPropsLazy("messageContent", "markupRtl");

const cl = classNameFactory("messagelogger-modal-");

export function showHistory(message: any) {
    const key = openModal(props =>
        <ErrorBoundary>
            <HistoryModal
                modalProps={props}
                close={() => closeModal(key)}
                message={message}
            />
        </ErrorBoundary>
    );
}

export function HistoryModal({ modalProps, close, message }: { modalProps: ModalProps; close(): void; message: any }) {
    const [selected, selectItem] = useState(message.editHistory.length);
    const timestamps = [message.firstEditTimestamp, ...message.editHistory.map(a => a.timestamp)];
    const contents = [...message.editHistory.map(a => a.content), message.content];

    return <ModalRoot {...modalProps} size={ModalSize.LARGE}>
        <ModalHeader className={cl("head")}>
            <Text variant="heading-lg/semibold">Message Edit History</Text>
            <ModalCloseButton onClick={close} />
            <div className={cl("revisions")}>
                { message.firstEditTimestamp.getTime() !== message.timestamp.getTime() ? (
                    <button className={cl("revision-lost")} disabled>
                        <Timestamp
                            className={cl("timestamp")}
                            timestamp={message.timestamp}
                            isEdited={true}
                            isInline={false}
                        />
                    </button>
                ) : null }
                {...timestamps.map((timestamp, index) =>
                    <button
                        className={cl("revision", { "revision-active": selected === index })}
                        onClick={() => selectItem(index)}
                    >
                        <Timestamp
                            className={cl("timestamp")}
                            timestamp={timestamp}
                            isEdited={true}
                            isInline={false}
                        />
                    </button>
                )}
            </div>
        </ModalHeader>
        <ModalContent className={cl("contents")}>
            {...contents.map((content, index) =>
                <div className={cl("content", { "content-active": selected === index })}>
                    <div className={`${CodeContainerClasses.markup} ${MiscClasses.messageContent}`}>
                        {Parser.parse(content)}
                    </div>
                </div>
            )}
        </ModalContent>
    </ModalRoot>;
}
