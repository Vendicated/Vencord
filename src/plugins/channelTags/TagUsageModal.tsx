/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { ExpandableSection } from "@components/ExpandableCard";
import { BaseText, Paragraph } from "@components/index";
import { classNameFactory } from "@utils/css";
import type { RenderModalProps } from "@vencord/discord-types";
import { Avatar, closeAllModals, Modal, NavigationRouter, openModal, Tooltip } from "@webpack/common";

import { ChannelTags } from "./ChannelTags";
import { openChannelTagsMenu } from "./contextMenu";
import { JumpIcon, TagsIcon } from "./icons";
import type { TagsChannel, TagsGuild } from "./metadata";
import { getTagMap, settings, updateStoreMetadata } from "./settings";
import { getTagUsageChannelIds, groupTagUsageChannels } from "./usage";

const cl = classNameFactory("vc-channel-tags-usage-");

function navigateToChannel(tagsChannel: TagsChannel) {
    closeAllModals();

    if (tagsChannel.kind === "guild") {
        NavigationRouter.transitionTo(`/channels/${tagsChannel.guildId}/${tagsChannel.id}`);
    } else {
        NavigationRouter.transitionTo(`/channels/@me/${tagsChannel.id}`);
    }
}

function GuildIcon({ guild }: { guild?: TagsGuild; }) {
    if (!guild) return <BaseText className={cl("group-icon")}>@</BaseText>;

    return guild.iconUrl
        ? <img alt="" className={cl("group-icon")} src={guild.iconUrl} />
        : <BaseText className={cl("group-icon")}>{guild.name.slice(0, 2).toUpperCase()}</BaseText>;
}

function PrivateChannelAvatar({ channel }: { channel: TagsChannel; }) {
    return channel.kind !== "guild" && channel.avatarUrl
        ? <Avatar className={cl("channel-avatar")} size="SIZE_32" src={channel.avatarUrl} />
        : null;
}

function getJumpTooltip(channel: TagsChannel) {
    if (channel.kind !== "guild") return "Jump to DM";
    if (channel.thread) return "Jump to Thread";
    return "Jump to Channel";
}

function ChannelUsageRow({ channel, onNavigate }: { channel: TagsChannel; onNavigate(): void; }) {
    return (
        <div
            className={cl("channel-row")}
            onContextMenu={event => openChannelTagsMenu(event, channel.id)}
        >
            <PrivateChannelAvatar channel={channel} />
            <div className={cl("channel-names")}>
                {channel.kind === "guild" && channel.parent && <Paragraph size="xs" style={{ color: "var(--text-muted)" }}>#{channel.parent.name}</Paragraph>}
                <Paragraph>
                    {channel.kind === "guild" && !channel.thread && "#"}{channel.name}
                </Paragraph>
            </div>
            <ChannelTags channelId={channel.id} />
            <Tooltip position="top" text="Edit Tags">
                {tooltipProps => (
                    <Button
                        {...tooltipProps}
                        aria-label="Edit Tags"
                        onClick={event => openChannelTagsMenu(event, channel.id)}
                        size="iconOnly"
                        variant="secondary"
                    >
                        <TagsIcon />
                    </Button>
                )}
            </Tooltip>
            <Tooltip position="top" text={getJumpTooltip(channel)}>
                {tooltipProps => (
                    <Button
                        {...tooltipProps}
                        aria-label={getJumpTooltip(channel)}
                        onClick={event => {
                            event.stopPropagation();
                            onNavigate();
                        }}
                        size="iconOnly"
                        variant="secondary"
                    >
                        <JumpIcon />
                    </Button>
                )}
            </Tooltip>
        </div>
    );
}

function TagUsageModal({ tagId, channelIds, modalProps }: {
    tagId: string;
    channelIds: string[];
    modalProps: RenderModalProps;
}) {
    settings.use();
    const tags = getTagMap();
    const groups = groupTagUsageChannels(channelIds);

    return (
        <Modal {...modalProps} size="lg" title={`Tagged: ${tags[tagId]?.name ?? "Tag"}`}>
            <div className={cl("content")}>
                {groups.map(group => (
                    <ExpandableSection
                        className={cl("group")}
                        initialExpanded
                        key={group.id}
                        renderContent={() => (
                            <div className={cl("channels")}>
                                {group.channels.map(channel => (
                                    <ChannelUsageRow
                                        channel={channel}
                                        key={channel.id}
                                        onNavigate={() => navigateToChannel(channel)}
                                    />
                                ))}
                            </div>
                        )}
                    >
                        <GuildIcon guild={group.guild} />
                        <Paragraph size="md" weight="semibold" className={cl("group-name")}>{group.name}</Paragraph>
                    </ExpandableSection>
                ))}
            </div>
        </Modal>
    );
}

export function openTagUsageModal(tagId: string) {
    updateStoreMetadata();
    const channelIds = getTagUsageChannelIds(tagId);
    openModal(modalProps => <TagUsageModal channelIds={channelIds} modalProps={modalProps} tagId={tagId} />);
}
