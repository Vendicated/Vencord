/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { ExpandableSection } from "@components/ExpandableCard";
import { classNameFactory } from "@utils/css";
import type { Channel, Guild, RenderModalProps } from "@vencord/discord-types";
import { findByPropsLazy } from "@webpack";
import { Avatar, ChannelRouter, ChannelStore, closeAllModals, IconUtils, Modal, openModal, Tooltip, UserStore } from "@webpack/common";

import { ChannelTags } from "./ChannelTags";
import { openChannelTagsMenu } from "./contextMenu";
import { settings } from "./settings";
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
    if (!guild) return <div className={cl("group-icon", "group-icon-dms")}>@</div>;

    const iconUrl = guild.icon && IconUtils.getGuildIconURL({
        id: guild.id,
        icon: guild.icon,
        canAnimate: true,
        size: 32
    });

    return iconUrl
        ? <img alt="" className={cl("group-icon")} src={iconUrl} />
        : <div className={cl("group-icon")}>{guild.name.slice(0, 2).toUpperCase()}</div>;
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

function JumpIcon() {
    return (
        <svg aria-hidden="true" className="vc-channel-tags-action-icon" viewBox="0 0 24 24">
            <path fill="currentColor" d="M13.3 5.3a1 1 0 0 1 1.4 0l6 6a1 1 0 0 1 0 1.4l-6 6a1 1 0 1 1-1.4-1.4L17.6 13H4a1 1 0 1 1 0-2h13.6l-4.3-4.3a1 1 0 0 1 0-1.4Z" />
        </svg>
    );
}

function TagsIcon() {
    return (
        <svg aria-hidden="true" className="vc-channel-tags-action-icon" viewBox="0 0 24 24">
            <path fill="currentColor" d="M3 5a2 2 0 0 1 2-2h6.2a2 2 0 0 1 1.4.6l7.8 7.8a2 2 0 0 1 0 2.8l-6.2 6.2a2 2 0 0 1-2.8 0l-7.8-7.8A2 2 0 0 1 3 11.2V5Zm4 1.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" />
        </svg>
    );
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
                {parent && <span className={cl("parent-name")}>#{getChannelName(parent)}</span>}
                <span className={cl("channel-name")}>
                    {!channel.isPrivate() && !channel.isThread() && "#"}{getChannelName(channel)}
                </span>
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
    const { tags } = settings.use(["tags"]);
    const groups = groupTagUsageChannels(channelIds);

    return (
        <Modal {...modalProps} size="lg" title={`Tagged: ${tags[tagId]?.name ?? "Tag"}`}>
            <div className={cl("content")}>
                {!groups.length && <div className={cl("empty")}>This tag is not used by any channels.</div>}
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
                        <span className={cl("group-name")}>{group.name}</span>
                        <span className={cl("group-count")}>{group.channels.length}</span>
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
