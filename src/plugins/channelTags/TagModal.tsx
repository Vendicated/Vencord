/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { classNameFactory } from "@utils/css";
import { RenderModalProps } from "@vencord/discord-types";
import { extractAndLoadChunksLazy, findComponentByCodeLazy } from "@webpack";
import { ColorPicker, Forms, Modal, openModalLazy, TextInput, useState } from "@webpack/common";

import { addTagToChannel, createTag, DEFAULT_TAG_SHAPE, TagShape, TagShapesList, updateTag } from "./data";
import { getTagMap } from "./settings";
import { TagShapeIcon } from "./TagShape";

const SWATCHES = [
    0x1abc9c, 0x2ecc71, 0x3498db, 0x9b59b6, 0xe91e63, 0xf1c40f, 0xe67e22, 0xe74c3c, 0x95a5a6, 0x607d8b,
    0x11806a, 0x1f8b4c, 0x206694, 0x71368a, 0xad1457, 0xc27c0e, 0xa84300, 0x992d22, 0x979c9f, 0x546e7a,
];
const DEFAULT_COLOR = SWATCHES[8];
const cl = classNameFactory("vc-channel-tags-modal-");

interface ColorPickerWithSwatchesProps {
    className?: string;
    defaultColor: number;
    colors: number[];
    value: number;
    onChange(value: number | null): void;
    renderDefaultButton?: () => React.ReactNode;
    renderCustomButton?: () => React.ReactNode;
}

const ColorPickerWithSwatches = findComponentByCodeLazy<ColorPickerWithSwatchesProps>('id:"color-picker"');
const requireSettingsModal = extractAndLoadChunksLazy(['type:"USER_SETTINGS_MODAL_OPEN"']);

function intToCssColor(color: number) {
    return `#${color.toString(16).padStart(6, "0")}`;
}

function cssColorToInt(color?: string) {
    if (!color || !/^#[\da-f]{6}$/i.test(color)) return DEFAULT_COLOR;
    return Number.parseInt(color.slice(1), 16);
}

interface TagModalProps {
    channelId?: string;
    tagId?: string;
    modalProps: RenderModalProps;
}

function TagModal({ channelId, tagId, modalProps }: TagModalProps) {
    const existingTag = tagId ? getTagMap()[tagId] : undefined;
    const [name, setName] = useState(existingTag?.name ?? "");
    const [color, setColor] = useState(cssColorToInt(existingTag?.color));
    const [shape, setShape] = useState<TagShape>(existingTag?.shape ?? DEFAULT_TAG_SHAPE);

    const cycleShape = (direction: 1 | -1) => {
        setShape(currentShape => {
            const currentIndex = TagShapesList.indexOf(currentShape);
            return TagShapesList[(currentIndex + direction + TagShapesList.length) % TagShapesList.length];
        });
    };

    const onSave = () => {
        const trimmedName = name.trim();
        if (!trimmedName) return;

        if (tagId) {
            updateTag(tagId, { name: trimmedName, color: intToCssColor(color), shape });
        } else {
            const id = createTag(trimmedName, intToCssColor(color), shape);
            if (channelId) addTagToChannel(channelId, id);
        }
        modalProps.onClose();
    };

    return (
        <Modal
            {...modalProps}
            title={tagId ? "Edit Tag" : "Create Tag"}
            actions={[{
                text: tagId ? "Save" : "Create & Set",
                variant: "primary",
                onClick: onSave,
                disabled: !name.trim()
            }]}
        >
            <form
                className={cl("content")}
                onSubmit={event => {
                    event.preventDefault();
                    onSave();
                }}
            >
                <section>
                    <Forms.FormTitle>Tag Name</Forms.FormTitle>
                    <div className={cl("name-row")}>
                        <Button
                            aria-label={`Shape: ${shape}. Click for next shape; right-click for previous shape`}
                            className={cl("shape-button")}
                            onClick={() => cycleShape(1)}
                            onContextMenu={event => {
                                event.preventDefault();
                                event.stopPropagation();
                                cycleShape(-1);
                            }}
                            size="iconOnly"
                            type="button"
                            variant="secondary"
                        >
                            <TagShapeIcon color={intToCssColor(color)} tagShape={shape} />
                        </Button>
                        <div className={cl("name-input")}>
                            <TextInput
                                autoFocus
                                maxLength={32}
                                placeholder="Important"
                                value={name}
                                onChange={setName}
                            />
                        </div>
                    </div>
                </section>
                <section>
                    <Forms.FormTitle>Color</Forms.FormTitle>
                    <ColorPickerWithSwatches
                        className={cl("color-picker")}
                        colors={SWATCHES}
                        defaultColor={DEFAULT_COLOR}
                        onChange={nextColor => nextColor != null && setColor(nextColor)}
                        renderCustomButton={() => (
                            <ColorPicker
                                color={color}
                                onChange={nextColor => nextColor != null && setColor(nextColor)}
                                showEyeDropper={false}
                            />
                        )}
                        renderDefaultButton={() => null}
                        value={color}
                    />
                </section>
            </form>
        </Modal>
    );
}

export function openCreateTagModal(channelId?: string) {
    openModalLazy(async () => {
        await requireSettingsModal();
        return modalProps => <TagModal channelId={channelId} modalProps={modalProps} />;
    });
}

export function openEditTagModal(tagId: string) {
    openModalLazy(async () => {
        await requireSettingsModal();
        return modalProps => <TagModal tagId={tagId} modalProps={modalProps} />;
    });
}
