/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Margins, Paragraph } from "@components/index";
import { RenderModalProps } from "@vencord/discord-types";
import { Modal, openModal, TextInput, useState } from "@webpack/common";

import { ensureGroup, renameGroup } from "./data";
import { GroupName, toGroupName } from "./groups";
import { getGroupMap } from "./settings";

interface GroupModalProps {
    group: GroupName;
    modalProps: RenderModalProps;
    onRename?(group: GroupName): void;
}

function GroupModal({ group, modalProps, onRename }: GroupModalProps) {
    const [name, setName] = useState<string>(group);
    const nextGroup = toGroupName(name);
    const nameExists = nextGroup !== group && Object.hasOwn(getGroupMap(), nextGroup);

    const onSave = () => {
        if (!nextGroup || nameExists) return;

        renameGroup(group, nextGroup);
        onRename?.(nextGroup);
        modalProps.onClose();
    };

    return (
        <Modal
            {...modalProps}
            title="Edit Group"
            actions={[{
                text: "Save",
                variant: "primary",
                onClick: onSave,
                disabled: !nextGroup || nameExists
            }]}
        >
            <TextInput
                autoFocus
                maxLength={32}
                onChange={setName}
                onKeyDown={event => {
                    if (event.key !== "Enter") return;
                    event.preventDefault();
                    onSave();
                }}
                placeholder="Group Name"
                value={name}
            />
            {nameExists && (
                <Paragraph className={Margins.top8} size="xs" style={{ color: "var(--text-danger)" }}>
                    A group with this name already exists.
                </Paragraph>
            )}
        </Modal>
    );
}

export function openGroupModal(group: GroupName, onRename?: (group: GroupName) => void) {
    ensureGroup(group);
    openModal(modalProps => <GroupModal group={group} modalProps={modalProps} onRename={onRename} />);
}
