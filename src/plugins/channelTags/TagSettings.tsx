/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { DeleteIcon, PencilIcon } from "@components/Icons";
import { ConfirmModal, Forms, openModal, Tooltip } from "@webpack/common";

import { deleteTag, sortAlphaNum } from "./data";
import { settings } from "./settings";
import { openCreateTagModal, openEditTagModal } from "./TagModal";
import { TagShapeIcon } from "./TagShape";

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

export function TagSettings() {
    // CUSTOM settings do not expose wildcard paths in definePluginSettings' types.
    const { tags: tagMap } = settings.use(["tags", "channelTags.*" as "channelTags"]);
    const tags = Object.entries(tagMap)
        .sort(([, a], [, b]) => sortAlphaNum(a.name, b.name));

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
                        </span>
                    </div>
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
