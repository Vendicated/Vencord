/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { DeleteIcon, PencilIcon } from "@components/Icons";
import { ConfirmModal, Forms, openModal, Tooltip } from "@webpack/common";

import { deleteTag, sortAlphaNum } from "./data";
import { getTagMap, settings } from "./settings";
import { openCreateTagModal, openEditTagModal } from "./TagModal";
import { TagShapeIcon } from "./TagShape";
import { openTagUsageModal } from "./TagUsageModal";
import { getTagUsageCounts } from "./usage";

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
            <Forms.FormText>
                Delete “{name}” and remove it from every channel?
            </Forms.FormText>
        </ConfirmModal>
    ));
}

function ViewIcon() {
    return (
        <svg aria-hidden="true" className="vc-channel-tags-action-icon" viewBox="0 0 24 24">
            <path fill="currentColor" d="M12 5c5.5 0 9.5 5.1 9.7 5.3a2.7 2.7 0 0 1 0 3.4C21.5 13.9 17.5 19 12 19s-9.5-5.1-9.7-5.3a2.7 2.7 0 0 1 0-3.4C2.5 10.1 6.5 5 12 5Zm0 2c-4.2 0-7.5 3.8-8.1 5 .6 1.2 3.9 5 8.1 5s7.5-3.8 8.1-5c-.6-1.2-3.9-5-8.1-5Zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z" />
        </svg>
    );
}

export function TagSettings() {
    settings.use();
    const tags = Object.entries(getTagMap())
        .sort(([, a], [, b]) => sortAlphaNum(a.name, b.name));
    const usageCounts = getTagUsageCounts();

    return (
        <div className="vc-channel-tags-settings">
            <div className="vc-channel-tags-settings-header">
                <Forms.FormTitle tag="h3">Tags</Forms.FormTitle>
                <Button onClick={() => openCreateTagModal()} size="small">
                    Add Tag
                </Button>
            </div>
            <Forms.FormText className="vc-channel-tags-settings-note">
                Hold Shift when clicking Delete to skip confirmation.
            </Forms.FormText>
            {!tags.length && (
                <Forms.FormText className="vc-channel-tags-settings-empty">
                    No tags have been defined yet. Right-click a channel and choose Add Tag to create one.
                </Forms.FormText>
            )}
            {tags.map(([id, tag]) => (
                <div
                    className="vc-channel-tags-settings-row"
                    key={id}
                >
                    <div className="vc-channel-tags-settings-summary">
                        <TagShapeIcon
                            className="vc-channel-tags-settings-swatch"
                            color={tag.color}
                            shape={tag.shape}
                        />
                        <span className="vc-channel-tags-settings-name">
                            {tag.name}
                            <span className="vc-channel-tags-settings-usage-count">
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
                                <PencilIcon className="vc-channel-tags-action-icon" />
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
                                <DeleteIcon className="vc-channel-tags-action-icon" />
                            </Button>
                        )}
                    </Tooltip>
                </div>
            ))}
        </div>
    );
}
