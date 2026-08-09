/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { ExpandableSection } from "@components/ExpandableCard";
import { BaseText, Margins, Paragraph } from "@components/index";
import { classNameFactory } from "@utils/css";
import { classes } from "@utils/index";
import type { RenderModalProps } from "@vencord/discord-types";
import { ConfirmModal, Modal, openModal, Tooltip } from "@webpack/common";

import { ChannelTag, compareTags, deleteTag } from "./data";
import { DeleteIcon, PencilIcon, ViewIcon } from "./icons";
import { getTagMap, settings } from "./settings";
import { openCreateTagModal, openEditTagModal } from "./TagModal";
import { TagShapeIcon } from "./TagShape";
import { openTagUsageModal } from "./TagUsageModal";
import { getTagUsageCounts } from "./usage";

const cl = classNameFactory("vc-channel-tags-");

function TagsModal(modalProps: RenderModalProps) {
    settings.use();
    const tags = Object.entries(getTagMap())
        .sort(([, a], [, b]) => compareTags(a, b));
    const usageCounts = getTagUsageCounts();
    const groupedTags = new Map<string | undefined, [string, ChannelTag][]>();
    for (const entry of tags) {
        const groupTags = groupedTags.get(entry[1].group) ?? [];
        groupTags.push(entry);
        groupedTags.set(entry[1].group, groupTags);
    }

    return (
        <Modal {...modalProps} size="lg" title="Tags" actions={[{
            text: "Create New Tag",
            variant: "primary",
            onClick: () => openCreateTagModal()
        }]}>
            <div className={cl("list")}>
                {!!tags.length && (
                    <Paragraph size="xs" style={{ color: "var(--text-muted)" }}>
                        Hold Shift when clicking Delete to skip confirmation.
                    </Paragraph>
                )}
                {!tags.length && (
                    <Paragraph style={{ color: "var(--text-muted)" }}>
                        No tags have been created yet!
                    </Paragraph>
                )}
                {[...groupedTags].map(([group, groupTags]) => (
                    <ExpandableSection
                        initialExpanded
                        key={group}
                        renderContent={() => (
                            groupTags.map(([id, tag]) => (
                                <div
                                    className={cl("list-row")}
                                    key={id}
                                >
                                    <div className={cl("list-summary")}>
                                        <TagShapeIcon
                                            className={classes(cl("list-swatch"), Margins.right8)}
                                            color={tag.color}
                                            tagShape={tag.shape}
                                        />
                                        <BaseText tag="span" size="md" weight="semibold">
                                            {tag.name}
                                        </BaseText>
                                        <BaseText tag="span" size="xs" className={Margins.left8} style={{ color: "var(--text-muted)" }}>
                                            ({usageCounts.get(id) ?? "Unused"})
                                        </BaseText>
                                    </div>
                                    {!!usageCounts.get(id) && <Tooltip position="top" text="View Usages">
                                        {tooltipProps => (
                                            <Button
                                                {...tooltipProps}
                                                aria-label="View Usages"
                                                onClick={event => {
                                                    event.stopPropagation();
                                                    openTagUsageModal(id);
                                                }}
                                                size="iconOnly"
                                                variant="secondary"
                                            >
                                                <ViewIcon />
                                            </Button>
                                        )}
                                    </Tooltip>}
                                    <Tooltip position="top" text="Edit">
                                        {tooltipProps => (
                                            <Button
                                                {...tooltipProps}
                                                aria-label="Edit"
                                                onClick={event => {
                                                    event.stopPropagation();
                                                    openEditTagModal(id);
                                                }}
                                                size="iconOnly"
                                                variant="secondary"
                                            >
                                                <PencilIcon />
                                            </Button>
                                        )}
                                    </Tooltip>
                                    <Tooltip position="top" text="Delete">
                                        {tooltipProps => (
                                            <Button
                                                {...tooltipProps}
                                                aria-label="Delete"
                                                onClick={event => {
                                                    event.stopPropagation();
                                                    if (event.shiftKey) deleteTag(id);
                                                    else confirmDeleteTag(id, tag.name);
                                                }}
                                                size="iconOnly"
                                                variant="dangerSecondary"
                                            >
                                                <DeleteIcon />
                                            </Button>
                                        )}
                                    </Tooltip>
                                </div>
                            ))
                        )}
                    >
                        <Paragraph weight="medium" size="md">
                            {group ?? "Ungrouped"}
                        </Paragraph>
                    </ExpandableSection>
                ))}
            </div>
        </Modal>
    );
}

export function openTagsModal() {
    openModal(modalProps => <TagsModal {...modalProps} />);
}


function confirmDeleteTag(id: string, name: string) {
    openModal(props => (
        <ConfirmModal
            {...props}
            cancelText="Cancel"
            confirmText="Delete"
            onConfirm={() => deleteTag(id)}
            title="Delete Channel Tag"
            variant="critical-primary"
        >
            <Paragraph>
                Delete "{name}" and remove it from every channel?
            </Paragraph>
        </ConfirmModal>
    ));
}
