/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { TextButton } from "@components/Button";
import { Flex } from "@components/Flex";
import { HeadingSecondary } from "@components/Heading";
import { cl } from "@plugins/kaomojiPicker/cl";
import { BUILTIN_CATEGORIES, BUILTIN_KAOMOJI, Kaomoji } from "@plugins/kaomojiPicker/data/kaomoji";
import { addCategory, addCustomEntry, useKaomojiStore } from "@plugins/kaomojiPicker/store";
import { RenderModalProps } from "@vencord/discord-types";
import { Modal, openModal, SearchableSelect, TextInput, useState } from "@webpack/common";

import { openCreateCategoryModal } from "./CreateCategoryModal";

export function openAddKaomojiModal() {
    openModal(modalProps => (
        <AddKaomojiModal modalProps={modalProps} />
    ));
}

function AddKaomojiModal({ modalProps }: { modalProps: RenderModalProps; }) {
    const { customCategories, customEntries } = useKaomojiStore();
    const [id, setId] = useState("");
    const [value, setValue] = useState("");
    const [categories, setCategories] = useState<string[]>([]);

    const allCategories = [...BUILTIN_CATEGORIES, ...customCategories];

    const idTrimmed = id.trim();
    const valueTrimmed = value.trim();
    const isDuplicateId = customEntries.some(e => e.id.toLowerCase() === idTrimmed.toLowerCase()) || BUILTIN_KAOMOJI.some(e => e.id.toLowerCase() === idTrimmed.toLowerCase());
    const isDuplicateValue = customEntries.some(e => e.value === valueTrimmed) || BUILTIN_KAOMOJI.some(e => e.value === valueTrimmed);
    const canSubmit = Boolean(idTrimmed && valueTrimmed && !isDuplicateId && !isDuplicateValue);

    function handleSubmit() {
        if (!canSubmit) return;

        const entry: Kaomoji = {
            id: idTrimmed,
            value: valueTrimmed,
            tags: categories,
        };
        addCustomEntry(entry);
        modalProps.onClose();
    }

    return (
        <Modal
            {...modalProps}
            title="Add Kaomoji"
            actions={[
                {
                    text: "Cancel",
                    variant: "secondary",
                    onClick: modalProps.onClose
                },
                {
                    text: "Add",
                    variant: "primary",
                    disabled: !canSubmit,
                    onClick: handleSubmit
                }
            ]}
        >
            <Flex flexDirection="column" gap={12}>
                <section>
                    <HeadingSecondary>ID</HeadingSecondary>
                    <TextInput
                        value={id}
                        onChange={setId}
                        placeholder="meow"
                        autoFocus
                        error={isDuplicateId ? "This ID already exists" : undefined}
                    />
                </section>

                <section>
                    <HeadingSecondary>Kaomoji</HeadingSecondary>
                    <TextInput
                        value={value}
                        onChange={setValue}
                        placeholder="/ᐠ - ˕ -マ Ⳋ"
                        error={isDuplicateValue ? "This Kaomoji already exists" : undefined}
                    />
                </section>

                <section>
                    <HeadingSecondary>Categories</HeadingSecondary>
                    <SearchableSelect
                        options={allCategories.map(c => ({ label: c.charAt(0).toUpperCase() + c.slice(1), value: c }))}
                        value={categories}
                        multi={true}
                        onChange={setCategories}
                        placeholder="Select categories"
                        closeOnSelect={false}
                    />
                    <div className={cl("create-category-wrap")}>
                        <TextButton
                            variant="link"
                            onClick={() => {
                                openCreateCategoryModal(name => {
                                    if (addCategory(name) && !categories.includes(name)) {
                                        setCategories([...categories, name]);
                                    }
                                });
                            }}
                        >
                            Create new category
                        </TextButton>
                    </div>
                </section>
            </Flex>
        </Modal>
    );
}
