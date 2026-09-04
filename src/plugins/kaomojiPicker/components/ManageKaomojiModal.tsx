/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BaseText } from "@components/BaseText";
import { Button, TextButton } from "@components/Button";
import { Card } from "@components/Card";
import { Flex } from "@components/Flex";
import { DeleteIcon, SearchIcon } from "@components/Icons";
import { cl } from "@plugins/kaomojiPicker/cl";
import { deleteUserKaomoji, useKaomojiStore } from "@plugins/kaomojiPicker/store";
import { RenderModalProps } from "@vencord/discord-types";
import { ConfirmModal, Modal, openModal, ScrollerThin, TextInput, useMemo, useState } from "@webpack/common";
import { ComponentProps } from "react";

import { openAddKaomojiModal } from "./AddKaomojiModal";
import { ExportKaomoji } from "./ExportKaomoji";

const SearchAccessory = (props: ComponentProps<typeof SearchIcon>) => <SearchIcon width={16} height={16} {...props} />;

export function openManageKaomojiModal() {
    openModal(modalProps => (
        <ManageKaomojiModal modalProps={modalProps} />
    ));
}

function ManageKaomojiModal({ modalProps }: { modalProps: RenderModalProps; }) {
    const { userKaomoji } = useKaomojiStore();
    const [search, setSearch] = useState("");
    const [exports, setExport] = useState(false);

    const query = search.trim().toLowerCase();

    const visibleKaomoji = useMemo(() => {
        if (!query) return userKaomoji;

        return userKaomoji.filter(item =>
            item.id.toLowerCase().includes(query) ||
            item.value.toLowerCase().includes(query) ||
            item.tags.some(tag => tag.toLowerCase().includes(query))
        );
    }, [userKaomoji, query]);

    return (
        <Modal
            {...modalProps}
            title="Manage Kaomojis"
        >
            <Flex flexDirection="column" gap={12}>
                <Flex gap={12} className={cl("manage-header")}>
                    <div className={cl("search-bar")}>
                        <TextInput
                            placeholder="Search kaomojis..."
                            value={search}
                            onChange={setSearch}
                            autoFocus
                            {...{ leading: SearchAccessory }}
                        />
                    </div>
                    <Button
                        variant="secondary"
                        onClick={() => openAddKaomojiModal()}
                    >
                        Add Kaomoji
                    </Button>
                </Flex>
                {userKaomoji.length === 0 ? (
                    <BaseText size="md" className={cl("manage-empty")}>
                        No kaomojis added yet.
                    </BaseText>
                ) : visibleKaomoji.length === 0 ? (
                    <BaseText size="md" className={cl("manage-empty")}>
                        No kaomojis match your search.
                    </BaseText>
                ) : (
                    <ScrollerThin className={cl("manage-list")} orientation="auto">
                        <Flex flexDirection="column" gap={12}>
                            {visibleKaomoji.map(item => (
                                <Card key={item.id + item.value} className={cl("manage-card")}>
                                    <Flex alignItems="center" gap={12} className={cl("manage-info")}>
                                        <div className={cl("manage-preview-wrap")}>
                                            <span className={cl("inspector-preview")}>
                                                {item.value}
                                            </span>
                                        </div>
                                        <Flex flexDirection="column" gap={0}>
                                            <BaseText size="md" weight="semibold">
                                                {item.id}
                                            </BaseText>
                                            <BaseText size="xs" color="text-muted">
                                                {item.tags.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(", ")}
                                            </BaseText>
                                        </Flex>
                                    </Flex>
                                    <Button
                                        size="iconOnly"
                                        variant="dangerSecondary"
                                        onClick={() => {
                                            openModal(props => (
                                                <ConfirmModal
                                                    {...props}
                                                    title="Delete Kaomoji"
                                                    confirmText="Delete"
                                                    cancelText="Cancel"
                                                    onConfirm={() => {
                                                        deleteUserKaomoji(item.value);
                                                    }}
                                                >
                                                    <BaseText size="md">
                                                        Are you sure you want to delete the <strong>{item.value}</strong> kaomoji?
                                                    </BaseText>
                                                </ConfirmModal>
                                            ));
                                        }}
                                    >
                                        <DeleteIcon width={18} height={18} />
                                    </Button>
                                </Card>
                            ))}
                        </Flex>
                    </ScrollerThin>
                )}
                {!exports ? (
                    <Flex>
                        <TextButton
                            variant="link"
                            onClick={() => setExport(true)}
                        >
                            Export ?
                        </TextButton>
                    </Flex>
                ) : undefined}
                {exports && <ExportKaomoji />}
            </Flex>
        </Modal>
    );
}
