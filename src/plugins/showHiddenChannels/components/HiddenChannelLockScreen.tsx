/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { isPluginEnabled } from "@api/PluginManager";
import ErrorBoundary from "@components/ErrorBoundary";
import PermissionsViewerPlugin from "@plugins/permissionsViewer";
import openRolesAndUsersPermissionsModal, { PermissionType, RoleOrUserPermission } from "@plugins/permissionsViewer/components/RolesAndUsersPermissions";
import { sortPermissionOverwrites } from "@plugins/permissionsViewer/utils";
import { cl } from "@plugins/showHiddenChannels/core/constants";
import { settings } from "@plugins/showHiddenChannels/core/settings";
import { classes } from "@utils/misc";
import { formatDuration } from "@utils/text";
import type { Channel } from "@vencord/discord-types";
import { findByPropsLazy, findComponentByCodeLazy, findCssClassesLazy } from "@webpack";
import {
    EmojiStore,
    FluxDispatcher,
    GuildMemberStore,
    GuildStore,
    Parser,
    PermissionsBits,
    PermissionStore,
    SnowflakeUtils,
    Text,
    Timestamp,
    Tooltip,
    useEffect,
    useState
} from "@webpack/common";
import { ReactNode } from "react";

const enum SortOrderTypes {
    LatestActivity = 0,
    CreationDate = 1
}

const enum ForumLayoutTypes {
    Default = 0,
    List = 1,
    Grid = 2
}

const enum ChannelTypes {
    GuildText = 0,
    GuildVoice = 2,
    GuildAnnouncement = 5,
    GuildStageVoice = 13,
    GuildForum = 15
}

const enum VideoQualityModes {
    Auto = 1,
    Full = 2
}

const enum ChannelFlags {
    RequireTag = 1 << 4
}

interface DefaultReaction {
    emojiId: string | null;
    emojiName: string | null;
}

interface Tag {
    id: string;
    name: string;
    emojiId: string | null;
    emojiName: string | null;
    moderated: boolean;
}

interface ExtendedChannel extends Channel {
    defaultThreadRateLimitPerUser?: number;
    defaultSortOrder?: SortOrderTypes | null;
    defaultForumLayout?: ForumLayoutTypes;
    defaultReactionEmoji?: DefaultReaction | null;
    availableTags?: Array<Tag>;
}

interface MetadataRow {
    key: string;
    label: string;
    value: ReactNode;
}

const ChatScrollClasses = findCssClassesLazy("auto", "managedReactiveScroller", "customTheme");
const ChannelBeginHeader = findComponentByCodeLazy("#{intl::ROLE_REQUIRED_SINGLE_USER_MESSAGE}");
const TagComponent = findComponentByCodeLazy("#{intl::FORUM_TAG_A11Y_FILTER_BY_TAG}");

const EmojiParser = findByPropsLazy("convertSurrogateToName");
const EmojiUtils = findByPropsLazy("getURL", "getEmojiColors");

const CHANNEL_TYPE_LABELS = {
    [ChannelTypes.GuildText]: "text",
    [ChannelTypes.GuildAnnouncement]: "announcement",
    [ChannelTypes.GuildForum]: "forum",
    [ChannelTypes.GuildVoice]: "voice",
    [ChannelTypes.GuildStageVoice]: "stage"
} as const;

const SORT_ORDER_LABELS = {
    [SortOrderTypes.LatestActivity]: "Latest activity",
    [SortOrderTypes.CreationDate]: "Creation date"
} as const;

const FORUM_LAYOUT_LABELS = {
    [ForumLayoutTypes.Default]: "Not set",
    [ForumLayoutTypes.List]: "List view",
    [ForumLayoutTypes.Grid]: "Gallery view"
} as const;

const VIDEO_QUALITY_LABELS = {
    [VideoQualityModes.Auto]: "Automatic",
    [VideoQualityModes.Full]: "720p"
} as const;

// Icon from the modal when clicking a message link you don't have access to view
const HiddenChannelLogo = "/assets/433e3ec4319a9d11b0cbe39342614982.svg";

function usePermissionDetails(channel: ExtendedChannel) {
    const [permissions, setPermissions] = useState<RoleOrUserPermission[]>([]);
    const isPermissionsViewerEnabled = isPluginEnabled(PermissionsViewerPlugin.name);

    useEffect(() => {
        const guild = GuildStore.getGuild(channel.guild_id);
        if (!guild) {
            setPermissions([]);
            return;
        }

        const membersToFetch = new Set<string>();

        if (!GuildMemberStore.getMember(channel.guild_id, guild.ownerId)) {
            membersToFetch.add(guild.ownerId);
        }

        for (const overwrite of Object.values(channel.permissionOverwrites ?? {})) {
            if (overwrite.type === 1 && !GuildMemberStore.getMember(channel.guild_id, overwrite.id)) {
                membersToFetch.add(overwrite.id);
            }
        }

        if (membersToFetch.size > 0) {
            FluxDispatcher.dispatch({
                type: "GUILD_MEMBERS_REQUEST",
                guildIds: [channel.guild_id],
                userIds: [...membersToFetch]
            });
        }

        if (!isPermissionsViewerEnabled) {
            setPermissions([]);
            return;
        }

        setPermissions(sortPermissionOverwrites(
            Object.values(channel.permissionOverwrites ?? {}).map(overwrite => ({
                type: overwrite.type as PermissionType,
                id: overwrite.id,
                overwriteAllow: overwrite.allow,
                overwriteDeny: overwrite.deny
            })),
            channel.guild_id
        ));
    }, [channel.guild_id, channel.id, channel.permissionOverwrites, isPermissionsViewerEnabled]);

    return permissions;
}

function buildMetadataRows(channel: ExtendedChannel) {
    const rows: MetadataRow[] = [];
    const isForumChannel = channel.isForumChannel();
    const isVoiceChannel = channel.isGuildVoice() || channel.isGuildStageVoice();

    if (channel.lastMessageId) {
        rows.push({
            key: "last-message",
            label: `Last ${isForumChannel ? "post" : "message"} created`,
            value: <Timestamp timestamp={new Date(SnowflakeUtils.extractTimestamp(channel.lastMessageId))} />
        });
    }

    if (channel.lastPinTimestamp) {
        rows.push({
            key: "last-pin",
            label: "Last message pin",
            value: <Timestamp timestamp={new Date(channel.lastPinTimestamp)} />
        });
    }

    if ((channel.rateLimitPerUser ?? 0) > 0) {
        rows.push({
            key: "slowmode",
            label: "Slowmode",
            value: formatDuration(channel.rateLimitPerUser!, "seconds")
        });
    }

    if ((channel.defaultThreadRateLimitPerUser ?? 0) > 0) {
        rows.push({
            key: "thread-slowmode",
            label: "Default thread slowmode",
            value: formatDuration(channel.defaultThreadRateLimitPerUser!, "seconds")
        });
    }

    if (isVoiceChannel && channel.bitrate != null) {
        rows.push({
            key: "bitrate",
            label: "Bitrate",
            value: `${channel.bitrate} bits`
        });
    }

    if (channel.rtcRegion !== undefined) {
        rows.push({
            key: "region",
            label: "Region",
            value: channel.rtcRegion ?? "Automatic"
        });
    }

    if (isVoiceChannel) {
        rows.push({
            key: "video-quality",
            label: "Video quality mode",
            value: VIDEO_QUALITY_LABELS[channel.videoQualityMode ?? VideoQualityModes.Auto]
        });
    }

    if ((channel.defaultAutoArchiveDuration ?? 0) > 0) {
        rows.push({
            key: "auto-archive",
            label: `Default inactivity duration before archiving ${isForumChannel ? "posts" : "threads"}`,
            value: formatDuration(channel.defaultAutoArchiveDuration!, "minutes")
        });
    }

    if (channel.defaultForumLayout != null) {
        rows.push({
            key: "forum-layout",
            label: "Default layout",
            value: FORUM_LAYOUT_LABELS[channel.defaultForumLayout]
        });
    }

    if (channel.defaultSortOrder != null) {
        rows.push({
            key: "sort-order",
            label: "Default sort order",
            value: SORT_ORDER_LABELS[channel.defaultSortOrder]
        });
    }

    return rows;
}

function renderDefaultReactionEmoji(defaultReactionEmoji: DefaultReaction) {
    return Parser.defaultRules[defaultReactionEmoji.emojiName ? "emoji" : "customEmoji"].react({
        name: defaultReactionEmoji.emojiName
            ? EmojiParser.convertSurrogateToName(defaultReactionEmoji.emojiName)
            : EmojiStore.getCustomEmojiById(defaultReactionEmoji.emojiId)?.name ?? "",
        emojiId: defaultReactionEmoji.emojiId ?? void 0,
        surrogate: defaultReactionEmoji.emojiName ?? void 0,
        src: defaultReactionEmoji.emojiName
            ? EmojiUtils.getURL(defaultReactionEmoji.emojiName)
            : void 0
    }, void 0, { key: 0 });
}

function PermissionDetailsButton({ channel, permissions }: { channel: ExtendedChannel; permissions: RoleOrUserPermission[]; }) {
    if (!isPluginEnabled(PermissionsViewerPlugin.name)) return null;

    return (
        <Tooltip text="Permission Details">
            {({ onMouseLeave, onMouseEnter }) => (
                <button
                    type="button"
                    onMouseLeave={onMouseLeave}
                    onMouseEnter={onMouseEnter}
                    className={cl("allowed-users-and-roles-container-permdetails-btn")}
                    onClick={() => {
                        const guild = GuildStore.getGuild(channel.guild_id);
                        if (!guild) return;

                        openRolesAndUsersPermissionsModal(permissions, guild, channel.name);
                    }}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M7 12.001C7 10.8964 6.10457 10.001 5 10.001C3.89543 10.001 3 10.8964 3 12.001C3 13.1055 3.89543 14.001 5 14.001C6.10457 14.001 7 13.1055 7 12.001ZM14 12.001C14 10.8964 13.1046 10.001 12 10.001C10.8954 10.001 10 10.8964 10 12.001C10 13.1055 10.8954 14.001 12 14.001C13.1046 14.001 14 13.1055 14 12.001ZM19 10.001C20.1046 10.001 21 10.8964 21 12.001C21 13.1055 20.1046 14.001 19 14.001C17.8954 14.001 17 13.1055 17 12.001C17 10.8964 17.8954 10.001 19 10.001Z" />
                    </svg>
                </button>
            )}
        </Tooltip>
    );
}

function AllowedUsersAndRolesSection({ channel, permissions }: { channel: ExtendedChannel; permissions: RoleOrUserPermission[]; }) {
    const { defaultAllowedUsersAndRolesDropdownState } = settings.use(["defaultAllowedUsersAndRolesDropdownState"]);

    return (
        <div className={cl("allowed-users-and-roles-container")}>
            <div className={cl("allowed-users-and-roles-container-title")}>
                <PermissionDetailsButton channel={channel} permissions={permissions} />
                <Text variant="text-lg/bold">Allowed users and roles:</Text>
                <Tooltip text={defaultAllowedUsersAndRolesDropdownState ? "Hide Allowed Users and Roles" : "View Allowed Users and Roles"}>
                    {({ onMouseLeave, onMouseEnter }) => (
                        <button
                            type="button"
                            onMouseLeave={onMouseLeave}
                            onMouseEnter={onMouseEnter}
                            className={cl("allowed-users-and-roles-container-toggle-btn")}
                            onClick={() => settings.store.defaultAllowedUsersAndRolesDropdownState = !defaultAllowedUsersAndRolesDropdownState}
                        >
                            <svg
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                transform={defaultAllowedUsersAndRolesDropdownState ? "scale(1 -1)" : "scale(1 1)"}
                            >
                                <path fill="currentColor" d="M16.59 8.59003L12 13.17L7.41 8.59003L6 10L12 16L18 10L16.59 8.59003Z" />
                            </svg>
                        </button>
                    )}
                </Tooltip>
            </div>

            {defaultAllowedUsersAndRolesDropdownState && <ChannelBeginHeader channel={channel} />}
        </div>
    );
}

function HiddenChannelLockScreen({ channel }: { channel: ExtendedChannel; }) {
    const permissions = usePermissionDetails(channel);
    const metadataRows = buildMetadataRows(channel);
    const isForumChannel = channel.isForumChannel();
    const isVoiceChannel = channel.isGuildVoice() || channel.isGuildStageVoice();
    const isHidden = !PermissionStore.can(PermissionsBits.VIEW_CHANNEL, channel);

    return (
        <div className={classes(ChatScrollClasses.auto, ChatScrollClasses.customTheme, ChatScrollClasses.managedReactiveScroller)}>
            <div className={cl("container")}>
                <img className={cl("logo")} src={HiddenChannelLogo} alt="" />

                <div className={cl("heading-container")}>
                    <Text variant="heading-xxl/bold">
                        This is a {isHidden ? "hidden" : "locked"} {CHANNEL_TYPE_LABELS[channel.type as keyof typeof CHANNEL_TYPE_LABELS]} channel
                    </Text>

                    {channel.isNSFW() && (
                        <Tooltip text="NSFW">
                            {({ onMouseLeave, onMouseEnter }) => (
                                <svg
                                    onMouseLeave={onMouseLeave}
                                    onMouseEnter={onMouseEnter}
                                    className={cl("heading-nsfw-icon")}
                                    width="32"
                                    height="32"
                                    viewBox="0 0 48 48"
                                    aria-hidden={true}
                                    role="img"
                                >
                                    <path fill="currentColor" d="M.7 43.05 24 2.85l23.3 40.2Zm23.55-6.25q.75 0 1.275-.525.525-.525.525-1.275 0-.75-.525-1.3t-1.275-.55q-.8 0-1.325.55-.525.55-.525 1.3t.55 1.275q.55.525 1.3.525Zm-1.85-6.1h3.65V19.4H22.4Z" />
                                </svg>
                            )}
                        </Tooltip>
                    )}
                </div>

                {!isVoiceChannel && (
                    <Text variant="text-lg/normal">
                        You can not see the {isForumChannel ? "posts" : "messages"} of this channel.
                        {isForumChannel && channel.topic && channel.topic.length > 0 && " However you may see its guidelines:"}
                    </Text>
                )}

                {isForumChannel && channel.topic && channel.topic.length > 0 && (
                    <div className={cl("topic-container")}>
                        {Parser.parseTopic(channel.topic, false, { channelId: channel.id })}
                    </div>
                )}

                {metadataRows.map(({ key, label, value }) => (
                    <Text key={key} variant="text-md/normal">
                        {label}: {value}
                    </Text>
                ))}

                {channel.defaultReactionEmoji != null && (
                    <div className={cl("default-emoji-container")}>
                        <Text variant="text-md/normal">Default reaction emoji:</Text>
                        {renderDefaultReactionEmoji(channel.defaultReactionEmoji)}
                    </div>
                )}

                {channel.hasFlag(ChannelFlags.RequireTag) && (
                    <Text variant="text-md/normal">Posts on this forum require a tag to be set.</Text>
                )}

                {channel.availableTags && channel.availableTags.length > 0 && (
                    <div className={cl("tags-container")}>
                        <Text variant="text-lg/bold">Available tags:</Text>
                        <div className={cl("tags")}>
                            {channel.availableTags.map(tag => <TagComponent tag={tag} key={tag.id} />)}
                        </div>
                    </div>
                )}

                <AllowedUsersAndRolesSection channel={channel} permissions={permissions} />
            </div>
        </div>
    );
}

export default ErrorBoundary.wrap(HiddenChannelLockScreen);
