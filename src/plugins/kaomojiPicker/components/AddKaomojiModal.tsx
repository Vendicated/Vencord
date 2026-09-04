/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { TextButton } from "@components/Button";
import { Flex } from "@components/Flex";
import { HeadingSecondary } from "@components/Heading";
import { BaseText } from "@components/index";
import { cl } from "@plugins/kaomojiPicker/cl";
import { getAllKaomoji, getCategories, Kaomoji, parseUserSetting } from "@plugins/kaomojiPicker/data/kaomoji";
import { saveUserKaomoji, useKaomojiStore } from "@plugins/kaomojiPicker/store";
import { RenderModalProps } from "@vencord/discord-types";
import { Modal, openModal, SearchableSelect, TextArea, TextInput, useState } from "@webpack/common";

import { openCreateCategoryModal } from "./CreateCategoryModal";

export function openAddKaomojiModal() {
    openModal(modalProps => (
        <AddKaomojiModal modalProps={modalProps} />
    ));
}

function AddKaomojiModal({ modalProps }: { modalProps: RenderModalProps; }) {
    const { userKaomoji } = useKaomojiStore();
    const [isAdvanced, setIsAdvanced] = useState(false);

    const [id, setId] = useState("");
    const [value, setValue] = useState("");
    const [category, setCategory] = useState<string>("");
    const [pendingCategories, setPendingCategories] = useState<string[]>([]);
    const [rawInput, setRawInput] = useState("");

    const categories = Array.from(new Set([...getCategories(), ...pendingCategories]));

    const idTrimmed = id.trim();
    const valueTrimmed = value.trim();
    const isDuplicateId = Boolean(idTrimmed) && getAllKaomoji().some(e => e.id.toLowerCase() === idTrimmed.toLowerCase());
    const isDuplicateValue = Boolean(valueTrimmed) && getAllKaomoji().some(e => e.value === valueTrimmed);
    const canSubmitSimple = Boolean(idTrimmed && valueTrimmed && !isDuplicateId && !isDuplicateValue);

    const parsedItems = parseUserSetting(rawInput);
    const validItems = parsedItems.filter(item => !getAllKaomoji().some(exist => exist.value === item.value));
    const duplicate = parsedItems.length - validItems.length;
    const canSubmitAdvanced = validItems.length > 0;

    const canSubmit = isAdvanced ? canSubmitAdvanced : canSubmitSimple;

    const errorMessage = parsedItems.length > 0 && validItems.length === 0
        ? "All entered kaomojis already exists"
        : duplicate > 0
            ? `${duplicate} duplicate ${duplicate === 1 ? "kaomoji" : "kaomojis"} will be skipped`
            : undefined;

    function handleSubmit() {
        if (!canSubmit) return;

        if (isAdvanced) {
            saveUserKaomoji([...userKaomoji, ...validItems]);
        } else {
            const kaomoji: Kaomoji = {
                id: idTrimmed,
                value: valueTrimmed,
                tags: [category],
            };
            saveUserKaomoji([...userKaomoji, kaomoji]);
        }
        modalProps.onClose();
    }

    return (
        <Modal
            {...modalProps}
            title={isAdvanced ? "Import Kaomojis" : "Add Kaomoji"}
            actions={[
                {
                    text: "Cancel",
                    variant: "secondary",
                    onClick: modalProps.onClose
                },
                {
                    text: isAdvanced ? "Import" : "Add",
                    variant: "primary",
                    disabled: !canSubmit,
                    onClick: handleSubmit
                }
            ]}
        >
            <Flex flexDirection="column" gap={12}>
                {!isAdvanced ? (
                    <>
                        <section>
                            <Flex alignItems="center" justifyContent="space-between" className={cl("section-header-wrap")}>
                                <HeadingSecondary>ID</HeadingSecondary>
                                <TextButton
                                    variant="link"
                                    onClick={() => setIsAdvanced(true)}
                                >
                                    Advanced addition(s)
                                </TextButton>
                            </Flex>
                            <TextInput
                                value={id}
                                onChange={setId}
                                placeholder="meow"
                                autoFocus
                                error={isDuplicateId ? "This ID already exists" : undefined} />
                        </section>
                        <section>
                            <HeadingSecondary>Kaomoji</HeadingSecondary>
                            <TextInput
                                value={value}
                                onChange={setValue}
                                placeholder="/ᐠ - ˕ -マ Ⳋ"
                                error={isDuplicateValue ? "This Kaomoji already exists" : undefined} />
                        </section>
                        <section>
                            <HeadingSecondary>Category</HeadingSecondary>
                            <SearchableSelect
                                options={categories.map(c => ({ label: c.charAt(0).toUpperCase() + c.slice(1), value: c }))}
                                value={category}
                                multi={false}
                                onChange={setCategory}
                                placeholder="Select category"
                            />
                            <div className={cl("create-category-wrap")}>
                                <TextButton
                                    variant="link"
                                    onClick={() => {
                                        openCreateCategoryModal(name => {
                                            const tag = name.trim().toLowerCase();
                                            if (tag) {
                                                if (!categories.includes(tag)) {
                                                    setPendingCategories([...pendingCategories, tag]);
                                                }
                                                setCategory(tag);
                                            }
                                        });
                                    }}
                                >
                                    Create new category
                                </TextButton>
                            </div>
                        </section>
                    </>
                ) : (
                    <>
                        <section>
                            <Flex alignItems="center" justifyContent="space-between" className={cl("section-header-wrap")}>
                                <HeadingSecondary>Import String / JSON</HeadingSecondary>
                                <TextButton
                                    variant="link"
                                    onClick={() => setIsAdvanced(false)}
                                >
                                    Simple addition
                                </TextButton>
                            </Flex>
                            <TextArea
                                value={rawInput}
                                onChange={setRawInput}
                                placeholder="(✿◠‿◠), (=^･ω･^=)"
                                autoFocus
                            />
                            {errorMessage && (
                                <div className={cl("create-category-wrap")}>
                                    <BaseText size="xs" className={cl("error-message")}>
                                        {errorMessage}
                                    </BaseText>
                                </div>
                            )}
                        </section>
                    </>
                )}
            </Flex>
        </Modal>
    );
}
