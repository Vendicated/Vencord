/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button, Heading, Margins, Paragraph, PencilIcon } from "@components/index";
import { classNameFactory } from "@utils/css";
import { RenderModalProps } from "@vencord/discord-types";
import { extractAndLoadChunksLazy, findComponentByCodeLazy } from "@webpack";
import { ColorPicker, Modal, openModalLazy, SearchableSelect, TextInput, useRef, useState } from "@webpack/common";

import { addTagToChannel, ChannelId, createTag, DEFAULT_TAG_SHAPE, deleteEmptyGroups, ensureGroup, keysOf, sortAlphaNum, TagId, TagShape, TagShapesList, updateTag } from "./data";
import { openGroupModal } from "./GroupModal";
import { GroupName, toGroupName } from "./groups";
import { getGroupMap, getTagMap, settings } from "./settings";
import { TagShapeIcon } from "./TagShape";

const SWATCHES = [
    0xffffff, 0xe91e22, 0x00dd00, 0x2ecc71, 0x3498db, 0x9b59b6, 0xe91e63, 0xf1c40f, 0xe67e22, 0xe74c3c, 0x95a5a6,
    0x000000, 0x210bff, 0xffdd00, 0x1f8b4c, 0x206694, 0x71368a, 0xad1457, 0xc27c0e, 0xa84300, 0x992d22, 0x607d8b,
];
const DEFAULT_COLOR = SWATCHES[10];
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
    channelId?: ChannelId;
    tagId?: TagId;
    wasFromContext?: boolean;
    modalProps: RenderModalProps;
}

function TagModal({ channelId, tagId, wasFromContext, modalProps }: TagModalProps) {
    const existingTag = tagId ? getTagMap()[tagId] : undefined;
    const [name, setName] = useState(existingTag?.name ?? "");
    const [group, setGroup] = useState<GroupName | undefined>(existingTag?.group);
    const [groupQuery, setGroupQuery] = useState<GroupName | undefined>(undefined);
    const lastGroupQuery = useRef<GroupName | undefined>(undefined);
    const [color, setColor] = useState(cssColorToInt(existingTag?.color));
    const [shape, setShape] = useState<TagShape>(existingTag?.shape ?? DEFAULT_TAG_SHAPE);
    const groupName = toGroupName(group);
    const groupOptions = [...new Set([
        ...keysOf(getGroupMap()),
        groupName,
        toGroupName(groupQuery)
    ].filter((group): group is GroupName => !!group))]
        .sort(sortAlphaNum)
        .map(group => ({ label: group, value: group }));

    const cycleShape = (direction: 1 | -1) => {
        setShape(currentShape => {
            const currentIndex = TagShapesList.indexOf(currentShape);
            return TagShapesList[(currentIndex + direction + TagShapesList.length) % TagShapesList.length];
        });
    };

    const onSave = () => {
        const trimmedName = name.trim();
        if (!trimmedName) return;

        const savedGroup = groupName || undefined;
        if (savedGroup) ensureGroup(savedGroup);

        if (tagId) {
            updateTag(tagId, { name: trimmedName, color: intToCssColor(color), group: savedGroup, shape });
        } else {
            const id = createTag(trimmedName, intToCssColor(color), shape, savedGroup);
            if (channelId) addTagToChannel(channelId, id);
        }
        modalProps.onClose();
    };

    const notice = !name.trim()
        ? { message: "A name is required!", type: "critical" }
        : undefined;

    return (
        <Modal
            {...modalProps}
            title={tagId ? "Edit Tag" : "Create Tag"}
            subtitle={(settings.store.showHints && !wasFromContext && "You can hold shift when clicking a tag in the context menu to go straight to this dialog!")}
            actions={[{
                text: tagId ? "Save" : channelId ? "Create & Set" : "Create",
                variant: "primary",
                onClick: onSave,
                disabled: notice?.type === "critical"
            }]}
            notice={notice}
        >
            <div className={cl("content")}>
                <div className={cl("row")}>
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
                    <TextInput
                        autoFocus
                        maxLength={32}
                        onKeyDown={event => {
                            if (event.key !== "Enter") return;
                            event.preventDefault();
                            onSave();
                        }}
                        placeholder="Tag Name"
                        value={name}
                        onChange={setName}
                    />
                </div>
                <section>
                    <Heading>Group</Heading>
                    <div className={cl("row")}>
                        <SearchableSelect
                            clearable
                            closeOnSelect
                            maxVisibleItems={5}
                            onChange={value => {
                                setGroup(value);
                                setGroupQuery(undefined);
                                lastGroupQuery.current = undefined;
                            }}
                            onSearchChange={query => {
                                const nextGroup = toGroupName(query.slice(0, 32));
                                setGroupQuery(nextGroup);

                                if (nextGroup) setGroup(nextGroup);
                                else if (lastGroupQuery.current) setGroup(undefined);

                                lastGroupQuery.current = nextGroup;
                            }}
                            options={groupOptions}
                            placeholder="Ungrouped"
                            value={group}
                        />
                        <Button
                            type="button"
                            variant="secondary"
                            size="iconOnly"
                            disabled={!groupName}
                            onClick={() => openGroupModal(groupName!, nextGroup => setGroup(nextGroup))}
                        >
                            <PencilIcon />
                        </Button>
                    </div>
                    {groupName && getGroupMap()[groupName]?.isExclusive && <Paragraph size="xs" className={Margins.top8} style={{ color: "var(--text-muted)" }}>
                        Only one tag in "{group}" may be set on a channel/thread/DM at a time.<br />
                        When setting a grouped tag on a channel/thread/DM, the others of that group are removed.
                    </Paragraph>}
                </section>
                <ColorPickerWithSwatches
                    className={cl("color-picker")}
                    colors={SWATCHES}
                    defaultColor={DEFAULT_COLOR}
                    onChange={c => setColor(c!)}
                    value={color}
                    renderDefaultButton={() => null}
                    renderCustomButton={() => (
                        <ColorPicker
                            color={color}
                            onChange={c => setColor(c!)}
                            showEyeDropper={false}
                        />
                    )}
                />
            </div>
        </Modal>
    );
}

export function openCreateTagModal(channelId?: ChannelId) {
    openModalLazy(async () => {
        await requireSettingsModal();
        return modalProps => <TagModal channelId={channelId} modalProps={modalProps} />;
    }, { onCloseCallback: deleteEmptyGroups });
}

export function openEditTagModal(tagId: TagId, wasFromContext: boolean = false) {
    openModalLazy(async () => {
        await requireSettingsModal();
        return modalProps => <TagModal tagId={tagId} wasFromContext={wasFromContext} modalProps={modalProps} />;
    }, { onCloseCallback: deleteEmptyGroups });
}
