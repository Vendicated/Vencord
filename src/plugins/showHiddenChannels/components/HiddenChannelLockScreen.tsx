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

import { Settings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { classes } from "@utils/misc";
import { formatDuration } from "@utils/text";
import { findByPropsLazy, findComponentByCodeLazy } from "@webpack";
import { EmojiStore, FluxDispatcher, GuildMemberStore, GuildStore, Parser, PermissionsBits, PermissionStore, SnowflakeUtils, Text, Timestamp, Tooltip, useEffect, useState } from "@webpack/common";
import type { Channel } from "discord-types/general";

import openRolesAndUsersPermissionsModal, { PermissionType, RoleOrUserPermission } from "../../permissionsViewer/components/RolesAndUsersPermissions";
import { sortPermissionOverwrites } from "../../permissionsViewer/utils";
import { cl, settings } from "..";

const enum SortOrderTypes {
    LATEST_ACTIVITY = 0,
    CREATION_DATE = 1
}

const enum ForumLayoutTypes {
    DEFAULT = 0,
    LIST = 1,
    GRID = 2
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

const enum ChannelTypes {
    GUILD_TEXT = 0,
    GUILD_VOICE = 2,
    GUILD_ANNOUNCEMENT = 5,
    GUILD_STAGE_VOICE = 13,
    GUILD_FORUM = 15
}

const enum VideoQualityModes {
    AUTO = 1,
    FULL = 2
}

const enum ChannelFlags {
    PINNED = 1 << 1,
    REQUIRE_TAG = 1 << 4
}


const ChatScrollClasses = findByPropsLazy("auto", "managedReactiveScroller");
const ChatClasses = findByPropsLazy("chat", "content", "noChat", "chatContent");
const ChannelBeginHeader = findComponentByCodeLazy("#{intl::ROLE_REQUIRED_SINGLE_USER_MESSAGE}");
const TagComponent = findComponentByCodeLazy("#{intl::FORUM_TAG_A11Y_FILTER_BY_TAG}");

const EmojiParser = findByPropsLazy("convertSurrogateToName");
const EmojiUtils = findByPropsLazy("getURL", "getEmojiColors");

const ChannelTypesToChannelNames = {
    [ChannelTypes.GUILD_TEXT]: "text",
    [ChannelTypes.GUILD_ANNOUNCEMENT]: "announcement",
    [ChannelTypes.GUILD_FORUM]: "forum",
    [ChannelTypes.GUILD_VOICE]: "voice",
    [ChannelTypes.GUILD_STAGE_VOICE]: "stage"
};

const SortOrderTypesToNames = {
    [SortOrderTypes.LATEST_ACTIVITY]: "Latest activity",
    [SortOrderTypes.CREATION_DATE]: "Creation date"
};

const ForumLayoutTypesToNames = {
    [ForumLayoutTypes.DEFAULT]: "Not set",
    [ForumLayoutTypes.LIST]: "List view",
    [ForumLayoutTypes.GRID]: "Gallery view"
};

const VideoQualityModesToNames = {
    [VideoQualityModes.AUTO]: "Automatic",
    [VideoQualityModes.FULL]: "720p"
};

// Icon from the modal when clicking a message link you don't have access to view
const HiddenChannelLogo = "/assets/433e3ec4319a9d11b0cbe39342614982.svg";

function HiddenChannelLockScreen({ channel }: { channel: ExtendedChannel; }) {
    const { defaultAllowedUsersAndRolesDropdownState } = settings.use(["defaultAllowedUsersAndRolesDropdownState"]);
    const [permissions, setPermissions] = useState<RoleOrUserPermission[]>([]);

    const {
        type,
        topic,
        lastMessageId,
        defaultForumLayout,
        lastPinTimestamp,
        defaultAutoArchiveDuration,
        availableTags,
        id: channelId,
        rateLimitPerUser,
        defaultThreadRateLimitPerUser,
        defaultSortOrder,
        defaultReactionEmoji,
        bitrate,
        rtcRegion,
        videoQualityMode,
        permissionOverwrites,
        guild_id
    } = channel;

    useEffect(() => {
        const membersToFetch: Array<string> = [];

        const guildOwnerId = GuildStore.getGuild(guild_id).ownerId;
        if (!GuildMemberStore.getMember(guild_id, guildOwnerId)) membersToFetch.push(guildOwnerId);

        Object.values(permissionOverwrites).forEach(({ type, id: userId }) => {
            if (type === 1 && !GuildMemberStore.getMember(guild_id, userId)) {
                membersToFetch.push(userId);
            }
        });

        if (membersToFetch.length > 0) {
            FluxDispatcher.dispatch({
                type: "GUILD_MEMBERS_REQUEST",
                guildIds: [guild_id],
                userIds: membersToFetch
            });
        }

        if (Settings.plugins.PermissionsViewer.enabled) {
            setPermissions(sortPermissionOverwrites(Object.values(permissionOverwrites).map(overwrite => ({
                type: overwrite.type as PermissionType,
                id: overwrite.id,
                overwriteAllow: overwrite.allow,
                overwriteDeny: overwrite.deny
            })), guild_id));
        }
    }, [channelId]);

    return (
        <div className={classes(ChatScrollClasses.auto, ChatScrollClasses.customTheme, ChatScrollClasses.managedReactiveScroller)}>
            <div className={cl("container")}>
                <img className={cl("logo")} src={HiddenChannelLogo} />

                <div className={cl("heading-container")}>
                    <Text variant="heading-xxl/bold">This is a {!PermissionStore.can(PermissionsBits.VIEW_CHANNEL, channel) ? "hidden" : "locked"} {ChannelTypesToChannelNames[type]} channel</Text>
                    {channel.isNSFW() &&
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
                    }
                </div>

                {(!channel.isGuildVoice() && !channel.isGuildStageVoice()) && (
                    <Text variant="text-lg/normal">
                        You can not see the {channel.isForumChannel() ? "posts" : "messages"} of this channel.
                        {channel.isForumChannel() && topic && topic.length > 0 && " However you may see its guidelines:"}
                    </Text >
                )}

                {channel.isForumChannel() && topic && topic.length > 0 && (
                    <div className={cl("topic-container")}>
                        {Parser.parseTopic(topic, false, { channelId })}
                    </div>
                )}

                {lastMessageId &&
                    <Text variant="text-md/normal">
                        Last {channel.isForumChannel() ? "post" : "message"} created:
                        <Timestamp timestamp={new Date(SnowflakeUtils.extractTimestamp(lastMessageId))} />
                    </Text>
                }
                {lastPinTimestamp &&
                    <Text variant="text-md/normal">Last message pin: <Timestamp timestamp={new Date(lastPinTimestamp)} /></Text>
                }
                {(rateLimitPerUser ?? 0) > 0 &&
                    <Text variant="text-md/normal">Slowmode: {formatDuration(rateLimitPerUser!, "seconds")}</Text>
                }
                {(defaultThreadRateLimitPerUser ?? 0) > 0 &&
                    <Text variant="text-md/normal">
                        Default thread slowmode: {formatDuration(defaultThreadRateLimitPerUser!, "seconds")}
                    </Text>
                }
                {((channel.isGuildVoice() || channel.isGuildStageVoice()) && bitrate != null) &&
                    <Text variant="text-md/normal">Bitrate: {bitrate} bits</Text>
                }
                {rtcRegion !== undefined &&
                    <Text variant="text-md/normal">Region: {rtcRegion ?? "Automatic"}</Text>
                }
                {(channel.isGuildVoice() || channel.isGuildStageVoice()) &&
                    <Text variant="text-md/normal">Video quality mode: {VideoQualityModesToNames[videoQualityMode ?? VideoQualityModes.AUTO]}</Text>
                }
                {(defaultAutoArchiveDuration ?? 0) > 0 &&
                    <Text variant="text-md/normal">
                        Default inactivity duration before archiving {channel.isForumChannel() ? "posts" : "threads"}:
                        {" " + formatDuration(defaultAutoArchiveDuration!, "minutes")}
                    </Text>
                }
                {defaultForumLayout != null &&
                    <Text variant="text-md/normal">Default layout: {ForumLayoutTypesToNames[defaultForumLayout]}</Text>
                }
                {defaultSortOrder != null &&
                    <Text variant="text-md/normal">Default sort order: {SortOrderTypesToNames[defaultSortOrder]}</Text>
                }
                {defaultReactionEmoji != null &&
                    <div className={cl("default-emoji-container")}>
                        <Text variant="text-md/normal">Default reaction emoji:</Text>
                        {Parser.defaultRules[defaultReactionEmoji.emojiName ? "emoji" : "customEmoji"].react({
                            name: defaultReactionEmoji.emojiName
                                ? EmojiParser.convertSurrogateToName(defaultReactionEmoji.emojiName)
                                : EmojiStore.getCustomEmojiById(defaultReactionEmoji.emojiId)?.name ?? "",
                            emojiId: defaultReactionEmoji.emojiId ?? void 0,
                            surrogate: defaultReactionEmoji.emojiName ?? void 0,
                            src: defaultReactionEmoji.emojiName
                                ? EmojiUtils.getURL(defaultReactionEmoji.emojiName)
                                : void 0
                        }, void 0, { key: 0 })}
                    </div>
                }
                {channel.hasFlag(ChannelFlags.REQUIRE_TAG) &&
                    <Text variant="text-md/normal">Posts on this forum require a tag to be set.</Text>
                }
                {availableTags && availableTags.length > 0 &&
                    <div className={cl("tags-container")}>
                        <Text variant="text-lg/bold">Available tags:</Text>
                        <div className={cl("tags")}>
                            {availableTags.map(tag => <TagComponent tag={tag} key={tag.id} />)}
                        </div>
                    </div>
                }
                <div className={cl("allowed-users-and-roles-container")}>
                    <div className={cl("allowed-users-and-roles-container-title")}>
                        {Vencord.Plugins.isPluginEnabled("PermissionsViewer") && (
                            <Tooltip text="Permission Details">
                                {({ onMouseLeave, onMouseEnter }) => (
                                    <button
                                        onMouseLeave={onMouseLeave}
                                        onMouseEnter={onMouseEnter}
                                        className={cl("allowed-users-and-roles-container-permdetails-btn")}
                                        onClick={() => openRolesAndUsersPermissionsModal(permissions, GuildStore.getGuild(channel.guild_id), channel.name)}
                                    >
                                        <svg
                                            width="24"
                                            height="24"
                                            viewBox="0 0 24 24"
                                        >
                                            <path fill="currentColor" d="M7 12.001C7 10.8964 6.10457 10.001 5 10.001C3.89543 10.001 3 10.8964 3 12.001C3 13.1055 3.89543 14.001 5 14.001C6.10457 14.001 7 13.1055 7 12.001ZM14 12.001C14 10.8964 13.1046 10.001 12 10.001C10.8954 10.001 10 10.8964 10 12.001C10 13.1055 10.8954 14.001 12 14.001C13.1046 14.001 14 13.1055 14 12.001ZM19 10.001C20.1046 10.001 21 10.8964 21 12.001C21 13.1055 20.1046 14.001 19 14.001C17.8954 14.001 17 13.1055 17 12.001C17 10.8964 17.8954 10.001 19 10.001Z" />
                                        </svg>
                                    </button>
                                )}
                            </Tooltip>
                        )}
                        <Text variant="text-lg/bold">Allowed users and roles:</Text>
                        <Tooltip text={defaultAllowedUsersAndRolesDropdownState ? "Hide Allowed Users and Roles" : "View Allowed Users and Roles"}>
                            {({ onMouseLeave, onMouseEnter }) => (
                                <button
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
            </div>
        </div>
    );
}

export default ErrorBoundary.wrap(HiddenChannelLockScreen);
