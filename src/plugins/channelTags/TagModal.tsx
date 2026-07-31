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

import { addTagToChannel, createTag, DEFAULT_TAG_SHAPE, TagShape, updateTag } from "./data";
import { settings } from "./settings";
import { TagShapeIcon } from "./TagShape";

const DEFAULT_COLOR = 0x5865f2;
const SWATCHES = [0x1abc9c, 0x2ecc71, 0x3498db, 0x5865f2, 0x9b59b6, 0xe91e63, 0xf1c40f, 0xe67e22, 0xe74c3c];
const SHAPES: TagShape[] = ["square", "triangle", "circle"];
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
    const existingTag = tagId ? settings.store.tags[tagId] : undefined;
    const [name, setName] = useState(existingTag?.name ?? "");
    const [color, setColor] = useState(cssColorToInt(existingTag?.color));
    const [shape, setShape] = useState<TagShape>(existingTag?.shape ?? DEFAULT_TAG_SHAPE);

    const cycleShape = (direction: 1 | -1) => {
        setShape(currentShape => {
            const currentIndex = SHAPES.indexOf(currentShape);
            return SHAPES[(currentIndex + direction + SHAPES.length) % SHAPES.length];
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
            title={tagId ? "Edit Tag" : "Add Tag"}
            actions={[{
                text: tagId ? "Save" : "Add Tag",
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
                            <TagShapeIcon color={intToCssColor(color)} shape={shape} />
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
