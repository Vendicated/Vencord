/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { plugins } from "@api/PluginManager";
import { MainSettingsIcon, PlusIcon } from "@components/index";
import { openPluginModal } from "@components/settings";
import { ContextMenuApi, Menu } from "@webpack/common";

import { addTagToChannel, ChannelTagMap, removeTagFromChannel, sortAlphaNum, TagShape } from "./data";
import { getChannelTagMap, getTagMap, settings } from "./settings";
import { openCreateTagModal } from "./TagModal";
import { TagShapeIcon } from "./TagShape";

function TagMenuLabel({ color, name, shape }: {
    color: string;
    name: string;
    shape?: TagShape;
}) {
    return (
        <span className="vc-channel-tags-menu-label">
            <TagShapeIcon
                className="vc-channel-tags-menu-swatch"
                color={color}
                tagShape={shape}
            />
            <span>{name}</span>
        </span>
    );
}

export function makeChannelTagsMenuChildren(channelId: string, channelTags: ChannelTagMap) {
    const tags = Object.entries(getTagMap())
        .sort(([, a], [, b]) => sortAlphaNum(a.name, b.name));
    const assignedTagIds = new Set(channelTags[channelId] ?? []);

    if (!tags.length) {
        return [
            <Menu.MenuItem
                id="vc-channel-tags-add"
                key="vc-channel-tags-add"
                label="Create Tag"
                action={() => openCreateTagModal(channelId)}
            />
        ];
    }

    return [
        <Menu.MenuItem
            id="vc-channel-tags-add-new"
            key="vc-channel-tags-add-new"
            label="Create New Tag"
            icon={PlusIcon}
            action={() => openCreateTagModal(channelId)}
        />,
        <Menu.MenuItem
            id="vc-channel-tags-edit"
            key="vc-channel-tags-edit"
            label="Manage Tags"
            icon={MainSettingsIcon}
            action={() => openPluginModal(plugins.ChannelTags)}
        />,
        <Menu.MenuSeparator key="vc-channel-tags-separator" />,
        ...tags.map(([id, tag]) => {
            const isAssigned = assignedTagIds.has(id);
            return (
                <Menu.MenuCheckboxItem
                    id={`vc-channel-tags-toggle-${id}`}
                    key={`vc-channel-tags-toggle-${id}`}
                    label={<TagMenuLabel color={tag.color} name={tag.name} shape={tag.shape} />}
                    checked={isAssigned}
                    action={() => isAssigned
                        ? removeTagFromChannel(channelId, id)
                        : addTagToChannel(channelId, id)}
                />
            );
        })
    ];
}

export function makeChannelTagsMenuItem(channelId: string, channelTags: ChannelTagMap) {
    const children = makeChannelTagsMenuChildren(channelId, channelTags);
    if (!Object.keys(getTagMap()).length) return children[0];

    return (
        <Menu.MenuItem
            id="vc-channel-tags"
            key="vc-channel-tags"
            label="Tags"
        >
            {children}
        </Menu.MenuItem>
    );
}

function ChannelTagsMenu({ channelId }: { channelId: string; }) {
    settings.use();

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

export function openChannelTagsMenu(event: React.MouseEvent, channelId: string) {
    event.preventDefault();
    event.stopPropagation();
    ContextMenuApi.openContextMenu(event, () => <ChannelTagsMenu channelId={channelId} />);
}

export const patchChannelContextMenu: NavContextMenuPatchCallback = (children, props) => {
    const channel = props?.channel;
    if (!channel?.id) return;

    const group = findGroupChildrenByChildId("mark-channel-read", children) ?? children;
    group.push(makeChannelTagsMenuItem(channel.id, getChannelTagMap()));
};

export const patchDmListContextMenu: NavContextMenuPatchCallback = (children, props) => {
    const group = findGroupChildrenByChildId("close-dm", children);
    if (!group || !props?.channel?.id) return;

    group.push(makeChannelTagsMenuItem(props.channel.id, getChannelTagMap()));
};
