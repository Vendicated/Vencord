/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { CogWheel, PlusIcon, TagsIcon } from "@components/index";
import { Channel, User } from "@vencord/discord-types";
import { ChannelType } from "@vencord/discord-types/enums";
import { ContextMenuApi, Menu } from "@webpack/common";

import { addTagToChannel, removeTagFromChannel } from "./actions";
import { getChannelIdForDMsWithUser } from "./dmChannels";
import { GroupName } from "./groups";
import { presentEntries } from "./object";
import { ChannelTagsData, compareGroups, compareTags, getChannelHiddenFor, isGroupHidden } from "./selectors";
import { settings } from "./settings";
import { openCreateTagModal, openEditTagModal } from "./TagModal";
import { TagShapeIcon } from "./TagShape";
import { openTagsModal } from "./TagsModal";
import { openTagUsageModal } from "./TagUsageModal";
import { ChannelId, ChannelTag, TagId, UserId } from "./types";

export function makeChannelTagsMenuChildren(channelId: ChannelId, data: ChannelTagsData) {
    const tags = presentEntries(data.tags)
        .sort(([, a], [, b]) => compareTags(a, b));
    const assignedTagIds = new Set(data.channelTags[channelId] ?? []);
    const hiddenFor = getChannelHiddenFor(channelId, data.channels);

    if (!tags.length) {
        return [
            <Menu.MenuItem
                id="vc-channel-tags-add"
                key="vc-channel-tags-add"
                label="Add Tag"
                leadingAccessory={{ type: "icon", icon: TagsIcon }}
                action={() => openCreateTagModal(channelId)}
            />
        ];
    }

    const groupedTags = new Map<GroupName | undefined, [TagId, ChannelTag][]>();
    for (const entry of tags) {
        if (isGroupHidden(entry[1].group, data.groups, hiddenFor)) continue;
        const groupTags = groupedTags.get(entry[1].group) ?? [];
        groupTags.push(entry);
        groupedTags.set(entry[1].group, groupTags);
    }

    return [
        <Menu.MenuItem
            id="vc-channel-tags-add-new"
            key="vc-channel-tags-add-new"
            label="Create New"
            leadingAccessory={{ type: "icon", icon: PlusIcon }}
            action={() => openCreateTagModal(channelId)}
        />,
        <Menu.MenuItem
            id="vc-channel-tags-edit"
            key="vc-channel-tags-edit"
            label="Manage"
            leadingAccessory={{ type: "icon", icon: CogWheel }}
            action={openTagsModal}
        />,
        <Menu.MenuSeparator key="vc-channel-tags-separator" />,
        ...[...groupedTags].sort(([a], [b]) => compareGroups(a, b, data.groups)).map(([group, groupTags]) => {
            const items = groupTags.map(([id, tag]) => {
                const isAssigned = assignedTagIds.has(id);
                return (
                    <Menu.MenuCheckboxItem
                        id={`vc-channel-tags-toggle-${id}`}
                        key={`vc-channel-tags-toggle-${id}`}
                        label={tag.name}
                        leadingAccessory={{
                            type: "icon", icon: () => <TagShapeIcon color={tag.color} tagShape={tag.shape} />
                        }}
                        checked={isAssigned}
                        action={event => event.shiftKey
                            ? editTagFromContext(event, id)
                            : event.ctrlKey
                                ? openTagUsageFromContext(event, id)
                                : isAssigned
                                    ? removeTagFromChannel(channelId, id)
                                    : addTagToChannel(channelId, id)}
                    />
                );
            });

            return group && data.groups[group]?.showInSubmenu
                ? (
                    <Menu.MenuItem id={`vc-channel-tags-group-${group}`} key={group} label={group}>
                        {items}
                    </Menu.MenuItem>
                )
                : (
                    <Menu.MenuGroup key={group ?? "vc-channel-tags-ungrouped"} label={group}>
                        {items}
                    </Menu.MenuGroup>
                );
        })
    ];
}

export function makeChannelTagsMenuItem(channelId: ChannelId, data: ChannelTagsData) {
    const children = makeChannelTagsMenuChildren(channelId, data);
    if (!Object.keys(data.tags).length) return children[0];

    return (
        <Menu.MenuItem
            id="vc-channel-tags"
            key="vc-channel-tags"
            label="Tags"
            leadingAccessory={{ type: "icon", icon: TagsIcon }}
        >
            {children}
        </Menu.MenuItem>
    );
}

function ChannelTagsMenu({ channelId }: { channelId: ChannelId; }) {
    const data = settings.use(["channelTags", "tags", "groups", "channels"]);

    return (
        <Menu.Menu
            aria-label="Channel Tags"
            navId="vc-channel-tags-row-menu"
            onClose={ContextMenuApi.closeContextMenu}
        >
            {makeChannelTagsMenuChildren(channelId, data)}
        </Menu.Menu>
    );
}

export function openChannelTagsMenu(event: React.MouseEvent, channelId: ChannelId) {
    event.preventDefault();
    event.stopPropagation();
    ContextMenuApi.openContextMenu(event, () => <ChannelTagsMenu channelId={channelId} />);
}

export function editTagFromContext(event: React.MouseEvent, tagId: TagId) {
    event.preventDefault();
    event.stopPropagation();
    ContextMenuApi.closeContextMenu();
    openEditTagModal(tagId, true);
}

export function openTagUsageFromContext(event: React.MouseEvent, tagId: TagId) {
    event.preventDefault();
    event.stopPropagation();
    ContextMenuApi.closeContextMenu();
    openTagUsageModal(tagId, true);
}

export const patchChannelContextMenu: NavContextMenuPatchCallback = (children, props) => {
    const data = settings.use(["channelTags", "tags", "groups", "channels"]);

    const channel = props?.channel;
    if (!channel?.id) return;

    const group = findGroupChildrenByChildId("mark-channel-read", children) ?? children;
    group.push(makeChannelTagsMenuItem(channel.id, data));
};

export const patchDmListContextMenu: NavContextMenuPatchCallback = (children, props: { channel?: Channel, user: User; }) => {
    const data = settings.use(["channelTags", "tags", "groups", "channels"]);

    const { channel, user } = props;

    const channelType = channel?.type;
    const isValidDMChannel = channelType === ChannelType.DM || channelType === ChannelType.GROUP_DM;
    const channelId = isValidDMChannel ? channel!.id as ChannelId : getChannelIdForDMsWithUser(user.id as UserId);

    const group = findGroupChildrenByChildId("user-profile", children);

    if (!group || !channelId) return;

    group.push(makeChannelTagsMenuItem(channelId, data));
};
