/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BaseText } from "@components/BaseText";
import { Button, TextButton } from "@components/Button";
import { Card } from "@components/Card";
import { Flex } from "@components/Flex";
import { DeleteIcon, PencilIcon } from "@components/Icons";
import { cl } from "@plugins/kaomojiPicker/cl";
import { BUILTIN_CATEGORIES } from "@plugins/kaomojiPicker/data/kaomoji";
import { addCategory, deleteCategory, renameCategory, useKaomojiStore } from "@plugins/kaomojiPicker/store";
import { RenderModalProps } from "@vencord/discord-types";
import { ConfirmModal, Modal, openModal, ScrollerThin, TextInput, useState } from "@webpack/common";

import { openCreateCategoryModal } from "./CreateCategoryModal";

export function openManageCategoryModal() {
    openModal(modalProps => (
        <ManageCategoryModal modalProps={modalProps} />
    ));
}

function ManageCategoryModal({ modalProps }: { modalProps: RenderModalProps; }) {
    const { customCategories } = useKaomojiStore();

    return (
        <Modal
            {...modalProps}
            title="Manage Categories"
        >
            <Flex flexDirection="column" gap={12}>
                <div>
                    {customCategories.length === 0 ? (
                        <BaseText size="md" className={cl("manage-empty")}>
                            No custom categories yet.
                        </BaseText>
                    ) : (
                        <ScrollerThin className={cl("manage-list")} orientation="auto">
                            <Flex flexDirection="column" gap={12}>
                                {customCategories.map(cat => (
                                    <ManageRow
                                        key={cat}
                                        name={cat}
                                    />
                                ))}
                            </Flex>
                        </ScrollerThin>
                    )}
                </div>

                <div className={cl("create-category-wrap")}>
                    <TextButton
                        variant="link"
                        onClick={() => {
                            openCreateCategoryModal(name => {
                                addCategory(name);
                            });
                        }}
                    >
                        Create new category
                    </TextButton>
                </div>
            </Flex>
        </Modal>
    );
}

function ManageRow({ name }: { name: string; }) {
    const { customCategories } = useKaomojiStore();
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(name);

    const trimmed = draft.trim();
    const isDuplicate = trimmed.toLowerCase() !== name.toLowerCase() && (
        customCategories.some(c => c.toLowerCase() === trimmed.toLowerCase())
        || (BUILTIN_CATEGORIES as readonly string[]).includes(trimmed.toLowerCase())
    );
    const canSave = Boolean(trimmed && !isDuplicate);

    function handleSave() {
        if (!canSave) return;
        if (trimmed === name) {
            setEditing(false);
            return;
        }
        if (renameCategory(name, trimmed)) {
            setEditing(false);
        }
    }

    if (editing) {
        return (
            <Card className={cl("manage-card")}>
                <form
                    className={cl("manage-input-wrap")}
                    onSubmit={e => {
                        e.preventDefault();
                        handleSave();
                    }}
                >
                    <TextInput
                        value={draft}
                        onChange={setDraft}
                        autoFocus
                        error={isDuplicate ? "This category already exists." : undefined}
                    />
                </form>
                <Flex gap={8}>
                    <Button
                        size="small"
                        variant="primary"
                        disabled={!canSave}
                        onClick={handleSave}
                    >
                        Save
                    </Button>
                    <Button
                        size="small"
                        variant="secondary"
                        onClick={() => {
                            setDraft(name);
                            setEditing(false);
                        }}
                    >
                        Cancel
                    </Button>
                </Flex>
            </Card>
        );
    }

    return (
        <Card className={cl("manage-card")}>
            <BaseText size="md" weight="medium">
                {name}
            </BaseText>
            <Flex gap={8}>
                <Button
                    size="iconOnly"
                    variant="secondary"
                    onClick={() => setEditing(true)}
                >
                    <PencilIcon width={18} height={18} />
                </Button>
                <Button
                    size="iconOnly"
                    variant="dangerSecondary"
                    onClick={() => {
                        openModal(props => (
                            <ConfirmModal
                                {...props}
                                title="Delete Category"
                                confirmText="Delete"
                                cancelText="Cancel"
                                onConfirm={() => {
                                    deleteCategory(name);
                                }}
                            >
                                <BaseText size="md">
                                    Are you sure you want to delete the <strong>{name}</strong> category?
                                </BaseText>
                            </ConfirmModal>
                        ));
                    }}
                >
                    <DeleteIcon width={18} height={18} />
                </Button>
            </Flex>
        </Card>
    );
}
