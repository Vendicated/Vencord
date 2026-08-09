/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { ExpandableSection } from "@components/ExpandableCard";
import { BaseText, Paragraph } from "@components/index";
import { classNameFactory } from "@utils/css";
import type { Channel, Guild, RenderModalProps } from "@vencord/discord-types";
import { findByPropsLazy } from "@webpack";
import { Avatar, ChannelRouter, ChannelStore, closeAllModals, IconUtils, Modal, openModal, Tooltip, UserStore } from "@webpack/common";

import { ChannelTags } from "./ChannelTags";
import { openChannelTagsMenu } from "./contextMenu";
import { JumpIcon, TagsIcon } from "./icons";
import { getTagMap, settings } from "./settings";
import { getTagUsageChannelIds, groupTagUsageChannels } from "./usage";

const cl = classNameFactory("vc-channel-tags-usage-");
const SelectedChannelActionCreators = findByPropsLazy("selectPrivateChannel");

function navigateToChannel(channel: Channel) {
    closeAllModals();

    if (channel.isPrivate()) SelectedChannelActionCreators.selectPrivateChannel(channel.id);
    else if (channel.isThread()) ChannelRouter.transitionToThread(channel);
    else ChannelRouter.transitionToChannel(channel.id);
}

function getChannelName(channel: Channel) {
    if (channel.isDM()) {
        const recipient = UserStore.getUser(channel.getRecipientId()!);
        return recipient?.globalName ?? recipient?.username ?? "Direct Message";
    }

    if (channel.isGroupDM()) {
        return channel.name || channel.rawRecipients.map(user => user.global_name ?? user.username).join(", ") || "Group DM";
    }

    return channel.name;
}

function GuildIcon({ guild }: { guild?: Guild; }) {
    if (!guild) return <BaseText className={`${cl("group-icon")}`}>@</BaseText>;

    const iconUrl = guild.icon && IconUtils.getGuildIconURL({
        id: guild.id,
        icon: guild.icon,
        canAnimate: true,
        size: 32
    });

    return iconUrl
        ? <img alt="" className={cl("group-icon")} src={iconUrl} />
        : <BaseText className={cl("group-icon")}>{guild.name.slice(0, 2).toUpperCase()}</BaseText>;
}

function PrivateChannelAvatar({ channel }: { channel: Channel; }) {
    if (channel.isDM()) {
        const recipient = UserStore.getUser(channel.getRecipientId()!);
        return recipient
            ? <Avatar className={cl("channel-avatar")} size="SIZE_32" src={recipient.getAvatarURL(undefined, 32)} />
            : null;
    }

    if (channel.isGroupDM()) {
        return <Avatar className={cl("channel-avatar")} size="SIZE_32" src={IconUtils.getChannelIconURL(channel)} />;
    }

    return null;
}

function getJumpTooltip(channel: Channel) {
    if (channel.isDM() || channel.isGroupDM()) return "Jump to DM";
    if (channel.isThread()) return "Jump to Thread";
    return "Jump to Channel";
}

function ChannelUsageRow({ channel, onNavigate }: { channel: Channel; onNavigate(): void; }) {
    const parent = channel.isThread() ? ChannelStore.getChannel(channel.parent_id) : undefined;

    return (
        <div
            className={cl("channel-row")}
            onContextMenu={event => openChannelTagsMenu(event, channel.id)}
        >
            <PrivateChannelAvatar channel={channel} />
            <div className={cl("channel-names")}>
                {parent && <Paragraph size="xs" style={{ color: "var(--text-muted)" }}>#{getChannelName(parent)}</Paragraph>}
                <Paragraph>
                    {!channel.isPrivate() && !channel.isThread() && "#"}{getChannelName(channel)}
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
    const channelIds = getTagUsageChannelIds(tagId);
    openModal(modalProps => <TagUsageModal channelIds={channelIds} modalProps={modalProps} tagId={tagId} />);
}
