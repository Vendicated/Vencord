/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { ExpandableSection } from "@components/ExpandableCard";
import { Paragraph } from "@components/index";
import { classNameFactory } from "@utils/css";
import type { RenderModalProps } from "@vencord/discord-types";
import { ConfirmModal, Modal, openModal, Tooltip } from "@webpack/common";

import { ChannelTag, compareTags, deleteTag } from "./data";
import { DeleteIcon, PencilIcon, ViewIcon } from "./icons";
import { getTagMap, settings } from "./settings";
import { openCreateTagModal, openEditTagModal } from "./TagModal";
import { TagShapeIcon } from "./TagShape";
import { openTagUsageModal } from "./TagUsageModal";
import { getTagUsageCounts } from "./usage";

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
            onClick: openCreateTagModal
        }]}>
            <div className={cl("settings")}>
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
                                    className={cl("settings-row")}
                                    key={id}
                                >
                                    <div className={cl("settings-summary")}>
                                        <TagShapeIcon
                                            className={cl("settings-swatch")}
                                            color={tag.color}
                                            tagShape={tag.shape}
                                        />
                                        <span className={cl("settings-name")}>
                                            {tag.name}
                                            <span className={cl("settings-usage-count")}>
                                                ({usageCounts.get(id) || "Unused"})
                                            </span>
                                        </span>
                                    </div>
                                    <Tooltip position="top" text="View">
                                        {tooltipProps => (
                                            <Button
                                                {...tooltipProps}
                                                aria-label="View"
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
                                    </Tooltip>
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

const cl = classNameFactory("vc-channel-tags-");

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
