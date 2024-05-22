/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { ModalCloseButton, ModalContent, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { findByPropsLazy } from "@webpack";
import { Text, Timestamp, useMemo, useState } from "@webpack/common";

const CodeContainerClasses = findByPropsLazy("markup", "codeContainer");
const MiscClasses = findByPropsLazy("messageContent", "markupRtl");
const { default: renderMessageMarkup } = findByPropsLazy("renderAutomodMessageMarkup");

const cl = classNameFactory("vc-ml-modal-");

export function openHistoryModal(message: any) {
    const key = openModal(props =>
        <ErrorBoundary>
            <HistoryModal
                modalProps={props}
                message={message}
            />
        </ErrorBoundary>
    );
}

export function HistoryModal({ modalProps, message }: { modalProps: ModalProps; message: any }) {
    const [selected, selectItem] = useState(message.editHistory.length);
    const timestamps = [message.firstEditTimestamp, ...message.editHistory.map(a => a.timestamp)];
    const contents = useMemo(() => {
        return [...message.editHistory.map(a => a.content), message.content]
            .map(content => renderMessageMarkup({ ...message, content }).content);
    }, []);

    return <ModalRoot {...modalProps} size={ModalSize.LARGE}>
        <ModalHeader className={cl("head")}>
            <Text variant="heading-lg/semibold">Message Edit History</Text>
            <ModalCloseButton onClick={modalProps.onClose} />
            <div className={cl("revisions")}>
                { message.firstEditTimestamp.getTime() !== message.timestamp.getTime() && (
                    <button className={cl("revision-lost")} disabled>
                        <Timestamp
                            className={cl("timestamp")}
                            timestamp={message.timestamp}
                            isEdited={true}
                            isInline={false}
                        />
                    </button>
                ) }
                {...timestamps.map((timestamp, index) =>
                    <button
                        key={timestamp}
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
                <div key={timestamps[index]} className={cl("content", { "content-active": selected === index })}>
                    <div className={`${CodeContainerClasses.markup} ${MiscClasses.messageContent}`}>
                        {content}
                    </div>
                </div>
            )}
        </ModalContent>
    </ModalRoot>;
}
