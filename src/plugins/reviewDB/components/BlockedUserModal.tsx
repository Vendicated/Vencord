/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Paragraph } from "@components/Paragraph";
import { Auth } from "@plugins/reviewDB/auth";
import { ReviewDBUser } from "@plugins/reviewDB/entities";
import { fetchBlocks, unblockUser } from "@plugins/reviewDB/reviewDbApi";
import { cl } from "@plugins/reviewDB/utils";
import { Logger } from "@utils/Logger";
import { ModalCloseButton, ModalContent, ModalHeader, ModalRoot, openModal } from "@utils/modal";
import { useAwaiter } from "@utils/react";
import { Forms, Tooltip, useState } from "@webpack/common";

function UnblockButton(props: { onClick?(): void; }) {
    return (
        <Tooltip text="Unblock user">
            {tooltipProps => (
                <div
                    {...tooltipProps}
                    role="button"
                    onClick={props.onClick}
                    className={cl("block-modal-unblock")}
                >
                    <svg height="20" viewBox="0 -960 960 960" width="20" fill="var(--status-danger)">
                        <path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q54 0 104-17.5t92-50.5L228-676q-33 42-50.5 92T160-480q0 134 93 227t227 93Zm252-124q33-42 50.5-92T800-480q0-134-93-227t-227-93q-54 0-104 17.5T284-732l448 448Z" />
                    </svg>
                </div>
            )}
        </Tooltip>
    );
}

function BlockedUser({ user, isBusy, setIsBusy }: { user: ReviewDBUser; isBusy: boolean; setIsBusy(v: boolean): void; }) {
    const [gone, setGone] = useState(false);
    if (gone) return null;

    return (
        <div className={cl("block-modal-row")}>
            <img className={cl("block-modal-avatar")} src={user.profilePhoto} alt="" />
            <Paragraph className={cl("block-modal-username")}>{user.username}</Paragraph>
            <UnblockButton
                onClick={isBusy ? undefined : async () => {
                    setIsBusy(true);
                    try {
                        await unblockUser(user.discordID);
                        setGone(true);
                    } finally {
                        setIsBusy(false);
                    }
                }}
            />
        </div>
    );
}

function Modal() {
    const [isBusy, setIsBusy] = useState(false);
    const [blocks, error, pending] = useAwaiter(fetchBlocks, {
        onError: e => new Logger("ReviewDB").error("Failed to fetch blocks", e),
        fallbackValue: [],
    });

    if (pending)
        return null;
    if (error)
        return <Paragraph>Failed to fetch blocks: ${String(error)}</Paragraph>;
    if (!blocks.length)
        return <Paragraph>No blocked users.</Paragraph>;

    return (
        <>
            {blocks.map(b => (
                <BlockedUser
                    key={b.discordID}
                    user={b}
                    isBusy={isBusy}
                    setIsBusy={setIsBusy}
                />
            ))}
        </>
    );
}

export function openBlockModal() {
    openModal(modalProps => (
        <ModalRoot {...modalProps}>
            <ModalHeader className={cl("block-modal-header")}>
                <Forms.FormTitle style={{ margin: 0 }}>Blocked Users</Forms.FormTitle>
                <ModalCloseButton onClick={modalProps.onClose} />
            </ModalHeader>
            <ModalContent className={cl("block-modal")}>
                {Auth.token ? <Modal /> : <Paragraph>You are not logged into ReviewDB!</Paragraph>}
            </ModalContent>
        </ModalRoot>
    ));
}
