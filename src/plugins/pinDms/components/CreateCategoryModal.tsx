/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DEFAULT_COLOR, SWATCHES } from "@plugins/pinDms/constants";
import { categoryLen, createCategory, getCategory } from "@plugins/pinDms/data";
import { classNameFactory } from "@utils/css";
import { RenderModalProps } from "@vencord/discord-types";
import { extractAndLoadChunksLazy, findComponentByCodeLazy } from "@webpack";
import { ColorPicker, Forms, openModalLazy, TextInput, Toasts, useMemo, useState } from "@webpack/common";
import { Modal } from "@webpack/common/modalV2";

interface ColorPickerWithSwatchesProps {
    className?: string;
    defaultColor: number;
    colors: number[];
    value: number;
    disabled?: boolean;
    onChange(value: number | null): void;
    renderDefaultButton?: () => React.ReactNode;
    renderCustomButton?: () => React.ReactNode;
}

const ColorPickerWithSwatches = findComponentByCodeLazy<ColorPickerWithSwatchesProps>('id:"color-picker"');

export const requireSettingsModal = extractAndLoadChunksLazy(['type:"USER_SETTINGS_MODAL_OPEN"']);

const cl = classNameFactory("vc-pindms-modal-");

interface Props {
    categoryId: string | null;
    initialChannelId: string | null;
    modalProps: RenderModalProps;
}

function useCategory(categoryId: string | null, initalChannelId: string | null) {
    const category = useMemo(() => {
        if (categoryId) {
            return getCategory(categoryId);
        } else if (initalChannelId) {
            return {
                id: Toasts.genId(),
                name: `Pin Category ${categoryLen() + 1}`,
                color: DEFAULT_COLOR,
                collapsed: false,
                channels: [initalChannelId]
            };
        }
    }, [categoryId, initalChannelId]);

    return category;
}

export function NewCategoryModal({ categoryId, modalProps, initialChannelId }: Props) {
    const category = useCategory(categoryId, initialChannelId);
    if (!category) return null;

    const [name, setName] = useState(category.name);
    const [color, setColor] = useState(category.color);

    const onSave = () => {
        category.name = name;
        category.color = color;

        if (!categoryId) {
            createCategory(category);
        }

        modalProps.onClose();
    };

    return (
        <Modal
            {...modalProps}
            title={`${categoryId ? "Edit" : "New"} Category`}
            actions={[{
                text: categoryId ? "Save" : "Create",
                variant: "primary",
                onClick: onSave,
                disabled: !name
            }]}
        >
            <form
                className={cl("content")}
                onSubmit={e => {
                    e.preventDefault();
                    onSave();
                }}
            >
                <section>
                    <Forms.FormTitle>Name</Forms.FormTitle>
                    <TextInput
                        value={name}
                        onChange={e => setName(e)}
                    />
                </section>
                <section>
                    <Forms.FormTitle>Color</Forms.FormTitle>
                    <ColorPickerWithSwatches
                        className={cl("color-picker")}
                        key={category.id}
                        defaultColor={DEFAULT_COLOR}
                        colors={SWATCHES}
                        onChange={c => setColor(c!)}
                        value={color}
                        renderDefaultButton={() => null}
                        renderCustomButton={() => (
                            <ColorPicker
                                color={color}
                                onChange={c => setColor(c!)}
                                key={category.id}
                                showEyeDropper={false}
                            />
                        )}
                    />
                </section>
            </form>
        </Modal>
    );
}

export const openCategoryModal = (categoryId: string | null, channelId: string | null) =>
    openModalLazy(async () => {
        await requireSettingsModal();
        return modalProps => <NewCategoryModal categoryId={categoryId} modalProps={modalProps} initialChannelId={channelId} />;
    });
