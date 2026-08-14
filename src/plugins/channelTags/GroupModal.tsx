/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { FormSwitch } from "@components/FormSwitch";
import { Divider, Heading, Margins } from "@components/index";
import { classes } from "@utils/index";
import { RenderModalProps } from "@vencord/discord-types";
import { Modal, openModal, TextInput, useState } from "@webpack/common";

import { ensureGroup, hasExclusiveConflicts, hasHiddenConflicts, renameGroup, updateGroup } from "./data";
import { Group, GroupName, HiddenFor, toGroupName } from "./groups";
import { getGroupMap } from "./settings";

interface GroupModalProps {
    group: GroupName;
    modalProps: RenderModalProps;
    onRename?(group: GroupName): void;
}

function GroupModal({ group, modalProps, onRename }: GroupModalProps) {
    const [name, setName] = useState<string>(group);
    const initialGroup = ensureGroup(group);
    const [value, setValue] = useState<Group>(() => ({
        ...initialGroup,
        hiddenFor: { ...initialGroup.hiddenFor }
    }));
    const [cleanUpHidden, setCleanUpHidden] = useState(false);
    const nextGroup = toGroupName(name);
    const nameExists = nextGroup !== group && nextGroup && nextGroup in getGroupMap();
    const exclusiveConflict = !initialGroup.isExclusive && value.isExclusive && hasExclusiveConflicts(group);
    const hiddenConflict = hasHiddenConflicts(group, value);

    const setGroupValue = <K extends keyof Group>(key: K, nextValue: Group[K]) =>
        setValue(current => ({ ...current, [key]: nextValue }));

    const onSave = () => {
        if (!nextGroup || nameExists) return;

        renameGroup(group, nextGroup);
        updateGroup(nextGroup, value, cleanUpHidden);
        onRename?.(nextGroup);
        modalProps.onClose();
    };

    const notice = !nextGroup
        ? { message: "A name is required!", type: "critical" }
        : nameExists
            ? { message: "A group with this name already exists.", type: "critical" }
            : exclusiveConflict
                ? { message: "Some channels have multiple tags from this group. Only the first tag from this group on each channel will be saved.", type: "warning" }
                : undefined;

    return (
        <Modal
            {...modalProps}
            title="Edit Group"
            actions={[{
                text: "Save",
                variant: "primary",
                onClick: onSave,
                disabled: notice?.type === "critical"
            }]}
            notice={notice}
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
            <FormSwitch
                title="Is Exclusive"
                description={<>
                    When enabled, tags in this group behave like radio buttons.<br />
                    Only one can be set for a channel at a time.
                </>}
                className={Margins.top16}
                value={value.isExclusive}
                onChange={isExclusive => setGroupValue("isExclusive", isExclusive)}
            />
            <FormSwitch
                title="Show tags in a submenu"
                description={"The group will also be sorted above others and appear \"collapsed\" in the manage tags dialog."}
                className={Margins.top16}
                value={value.showInSubmenu}
                onChange={showInSubmenu => setGroupValue("showInSubmenu", showInSubmenu)}
            />
            <section className={Margins.top16}>
                <Heading tag="h1" className={Margins.bottom16}>Don't show on...</Heading>
                {([
                    [HiddenFor.DM, "DMs"],
                    [HiddenFor.GroupDM, "Group DMs"],
                    [HiddenFor.Thread, "Threads"],
                    [HiddenFor.Channel, "Channels"]
                ]).map(([target, label], i) => (
                    <FormSwitch
                        key={target}
                        title={label}
                        value={value.hiddenFor[target]}
                        hideBorder={true}
                        className={classes(i > 0 && Margins.top8)}
                        onChange={hidden => setValue(current => ({
                            ...current,
                            hiddenFor: { ...current.hiddenFor, [target]: hidden }
                        }))}
                    />
                ))}
                {hiddenConflict && (<>
                    <Divider />
                    <FormSwitch
                        title="Clean up hidden tags on save"
                        value={cleanUpHidden}
                        hideBorder={true}
                        onChange={cleanup => setCleanUpHidden(cleanup)}
                    />
                </>)}
            </section>
        </Modal>
    );
}

export function openGroupModal(group: GroupName, onRename?: (group: GroupName) => void) {
    ensureGroup(group);
    openModal(modalProps => <GroupModal group={group} modalProps={modalProps} onRename={onRename} />);
}
