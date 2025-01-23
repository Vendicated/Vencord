/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import { ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, openModalLazy } from "@utils/modal";
import { extractAndLoadChunksLazy, findComponentByCodeLazy, findExportedComponentLazy } from "@webpack";
import { Button, Forms, Text, TextInput, Toasts, useEffect, useState } from "@webpack/common";

import { DEFAULT_COLOR, SWATCHES } from "../constants";
import { categories, Category, createCategory, getCategory, updateCategory } from "../data";
import { forceUpdate } from "../index";

interface ColorPickerProps {
    color: number | null;
    showEyeDropper?: boolean;
    suggestedColors?: string[];
    onChange(value: number | null): void;
}

interface ColorPickerWithSwatchesProps {
    defaultColor: number;
    colors: number[];
    value: number;
    disabled?: boolean;
    onChange(value: number | null): void;
    renderDefaultButton?: () => React.ReactNode;
    renderCustomButton?: () => React.ReactNode;
}

const ColorPicker = findComponentByCodeLazy<ColorPickerProps>("#{intl::USER_SETTINGS_PROFILE_COLOR_SELECT_COLOR}", ".BACKGROUND_PRIMARY)");
const ColorPickerWithSwatches = findExportedComponentLazy<ColorPickerWithSwatchesProps>("ColorPicker", "CustomColorPicker");

export const requireSettingsMenu = extractAndLoadChunksLazy(['name:"UserSettings"'], /createPromise:.{0,20}(\i\.\i\("?.+?"?\).*?).then\(\i\.bind\(\i,"?(.+?)"?\)\).{0,50}"UserSettings"/);

const cl = classNameFactory("vc-pindms-modal-");

interface Props {
    categoryId: string | null;
    initalChannelId: string | null;
    modalProps: ModalProps;
}

function useCategory(categoryId: string | null, initalChannelId: string | null) {
    const [category, setCategory] = useState<Category | null>(null);

    useEffect(() => {
        if (categoryId)
            setCategory(getCategory(categoryId)!);
        else if (initalChannelId)
            setCategory({
                id: Toasts.genId(),
                name: `Pin Category ${categories.length + 1}`,
                color: DEFAULT_COLOR,
                collapsed: false,
                channels: [initalChannelId]
            });
    }, [categoryId, initalChannelId]);

    return {
        category,
        setCategory
    };
}

export function NewCategoryModal({ categoryId, modalProps, initalChannelId }: Props) {
    const { category, setCategory } = useCategory(categoryId, initalChannelId);

    if (!category) return null;

    const onSave = async (e: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        e.preventDefault();
        if (!categoryId)
            await createCategory(category);
        else
            await updateCategory(category);

        forceUpdate();
        modalProps.onClose();
    };

    return (
        <ModalRoot {...modalProps}>
            <ModalHeader>
                <Text variant="heading-lg/semibold" style={{ flexGrow: 1 }}>{categoryId ? "Edit" : "New"} Category</Text>
            </ModalHeader>

            {/* form is here so when you press enter while in the text input it submits */}
            <form onSubmit={onSave}>
                <ModalContent className={cl("content")}>
                    <Forms.FormSection>
                        <Forms.FormTitle>Name</Forms.FormTitle>
                        <TextInput
                            value={category.name}
                            onChange={e => setCategory({ ...category, name: e })}
                        />
                    </Forms.FormSection>
                    <Forms.FormDivider />
                    <Forms.FormSection>
                        <Forms.FormTitle>Color</Forms.FormTitle>
                        <ColorPickerWithSwatches
                            key={category.name}
                            defaultColor={DEFAULT_COLOR}
                            colors={SWATCHES}
                            onChange={c => setCategory({ ...category, color: c! })}
                            value={category.color}
                            renderDefaultButton={() => null}
                            renderCustomButton={() => (
                                <ColorPicker
                                    color={category.color}
                                    onChange={c => setCategory({ ...category, color: c! })}
                                    key={category.name}
                                    showEyeDropper={false}
                                />
                            )}
                        />
                    </Forms.FormSection>
                </ModalContent>
                <ModalFooter>
                    <Button type="submit" onClick={onSave} disabled={!category.name}>{categoryId ? "Save" : "Create"}</Button>
                </ModalFooter>
            </form>
        </ModalRoot>
    );
}

export const openCategoryModal = (categoryId: string | null, channelId: string | null) =>
    openModalLazy(async () => {
        await requireSettingsMenu();
        return modalProps => <NewCategoryModal categoryId={categoryId} modalProps={modalProps} initalChannelId={channelId} />;
    });

