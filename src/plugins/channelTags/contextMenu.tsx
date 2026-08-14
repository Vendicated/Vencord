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

import { addTagToChannel, ChannelId, ChannelTag, ChannelTagMap, entriesOf, GroupName, compareTags, removeTagFromChannel, TagId } from "./data";
import { getChannelIdForDMsWithUser, getChannelTagMap, getTagMap, settings } from "./settings";
import { openCreateTagModal } from "./TagModal";
import { TagShapeIcon } from "./TagShape";
import { openTagsModal } from "./TagsModal";

export function makeChannelTagsMenuChildren(channelId: ChannelId, channelTags: ChannelTagMap) {
    const tags = entriesOf(getTagMap())
        .sort(([, a], [, b]) => compareTags(a, b));
    const assignedTagIds = new Set(channelTags[channelId] ?? []);

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
        ...[...groupedTags].map(([group, groupTags]) => (
            <Menu.MenuGroup key={group ?? "vc-channel-tags-ungrouped"} label={group}>
                {groupTags.map(([id, tag]) => {
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
                            action={() => isAssigned
                                ? removeTagFromChannel(channelId, id)
                                : addTagToChannel(channelId, id)}
                        />
                    );
                })}
            </Menu.MenuGroup>
        ))
    ];
}

export function makeChannelTagsMenuItem(channelId: ChannelId, channelTags: ChannelTagMap) {
    const children = makeChannelTagsMenuChildren(channelId, channelTags);
    if (!Object.keys(getTagMap()).length) return children[0];

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
    settings.use(["channelTags"]);

    return (
        <Menu.Menu
            aria-label="Channel Tags"
            navId="vc-channel-tags-row-menu"
            onClose={ContextMenuApi.closeContextMenu}
        >
            {makeChannelTagsMenuChildren(channelId, getChannelTagMap())}
        </Menu.Menu>
    );
}

export function openChannelTagsMenu(event: React.MouseEvent, channelId: ChannelId) {
    event.preventDefault();
    event.stopPropagation();
    ContextMenuApi.openContextMenu(event, () => <ChannelTagsMenu channelId={channelId} />);
}

export const patchChannelContextMenu: NavContextMenuPatchCallback = (children, props) => {
    settings.use(["channelTags"]);

    const channel = props?.channel;
    if (!channel?.id) return;

    const group = findGroupChildrenByChildId("mark-channel-read", children) ?? children;
    group.push(makeChannelTagsMenuItem(channel.id, getChannelTagMap()));
};

export const patchDmListContextMenu: NavContextMenuPatchCallback = (children, props: { channel?: Channel, user: User; }) => {
    settings.use(["channelTags"]);

    const { channel, user } = props;

    const channelType = channel?.type;
    const isValidDMChannel = channelType === ChannelType.DM || channelType === ChannelType.GROUP_DM;
    const channelId = isValidDMChannel ? channel!.id as ChannelId : getChannelIdForDMsWithUser(user.id);

    const group = findGroupChildrenByChildId("user-profile", children);

    if (!group || !channelId) return;

    group.push(makeChannelTagsMenuItem(channelId, getChannelTagMap()));
};
