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

import ErrorBoundary from "@components/ErrorBoundary";
import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { cl } from "@plugins/showHiddenChannels";
import { classes } from "@utils/misc";
import { formatDurationVerbose } from "@utils/text";
import type { Channel } from "@vencord/discord-types";
import { findByPropsLazy, findComponentByCodeLazy, findCssClassesLazy } from "@webpack";
import { EmojiStore, FluxDispatcher, GuildMemberStore, GuildStore, Parser, PermissionsBits, PermissionStore, SnowflakeUtils, Timestamp, Tooltip, useEffect } from "@webpack/common";

const enum SortOrderTypes {
    LATEST_ACTIVITY = 0,
    CREATION_DATE = 1
}

const enum ForumLayoutTypes {
    DEFAULT = 0,
    LIST = 1,
    GRID = 2
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

const ChatScrollClasses = findCssClassesLazy("auto", "managedReactiveScroller", "customTheme");
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

function HiddenChannelLockScreen({ channel }: { channel: Channel; }) {
    const {
        type,
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

        const guildOwnerId = GuildStore.getGuild(guild_id)?.ownerId;
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
    }, [channelId]);

    return (
        <div className={classes(ChatScrollClasses.auto, ChatScrollClasses.customTheme, ChatScrollClasses.managedReactiveScroller)}>
            <div className={cl("container")}>
                <img className={cl("logo")} src={HiddenChannelLogo} />

                <div className={cl("heading-container")}>
                    <Heading tag="h1" size="xxl">This is a {!PermissionStore.can(PermissionsBits.VIEW_CHANNEL, channel) ? "hidden" : "locked"} {ChannelTypesToChannelNames[type]} channel</Heading>
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
                    <Paragraph size="lg">
                        You can not see the name or {channel.isForumChannel() ? "posts" : "messages"} of this channel.
                    </Paragraph>
                )}

                {lastMessageId &&
                    <Paragraph size="md">
                        Last {channel.isForumChannel() ? "post" : "message"} created:
                        <Timestamp timestamp={new Date(SnowflakeUtils.extractTimestamp(lastMessageId))} />
                    </Paragraph>
                }
                {lastPinTimestamp &&
                    <Paragraph size="md">Last message pin: <Timestamp timestamp={new Date(lastPinTimestamp)} /></Paragraph>
                }
                {(rateLimitPerUser ?? 0) > 0 &&
                    <Paragraph size="md">Slowmode: {formatDurationVerbose(rateLimitPerUser!, "seconds")}</Paragraph>
                }
                {(defaultThreadRateLimitPerUser ?? 0) > 0 &&
                    <Paragraph size="md">
                        Default thread slowmode: {formatDurationVerbose(defaultThreadRateLimitPerUser!, "seconds")}
                    </Paragraph>
                }
                {((channel.isGuildVoice() || channel.isGuildStageVoice()) && bitrate != null) &&
                    <Paragraph size="md">Bitrate: {bitrate} bits</Paragraph>
                }
                {rtcRegion !== undefined &&
                    <Paragraph size="md">Region: {rtcRegion ?? "Automatic"}</Paragraph>
                }
                {(channel.isGuildVoice() || channel.isGuildStageVoice()) &&
                    <Paragraph size="md">Video quality mode: {VideoQualityModesToNames[videoQualityMode ?? VideoQualityModes.AUTO]}</Paragraph>
                }
                {(defaultAutoArchiveDuration ?? 0) > 0 &&
                    <Paragraph size="md">
                        Default inactivity duration before archiving {channel.isForumChannel() ? "posts" : "threads"}:
                        {" " + formatDurationVerbose(defaultAutoArchiveDuration!, "minutes")}
                    </Paragraph>
                }
                {defaultForumLayout != null &&
                    <Paragraph size="md">Default layout: {ForumLayoutTypesToNames[defaultForumLayout]}</Paragraph>
                }
                {defaultSortOrder != null &&
                    <Paragraph size="md">Default sort order: {SortOrderTypesToNames[defaultSortOrder]}</Paragraph>
                }
                {defaultReactionEmoji != null &&
                    <div className={cl("default-emoji-container")}>
                        <Paragraph size="md">Default reaction emoji:</Paragraph>
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
                    <Paragraph size="md">Posts on this forum require a tag to be set.</Paragraph>
                }
                {availableTags && availableTags.length > 0 &&
                    <div className={cl("tags-container")}>
                        <Heading tag="h2">Available tags:</Heading>
                        <div className={cl("tags")}>
                            {availableTags.map(tag => <TagComponent tag={tag} key={tag.id} />)}
                        </div>
                    </div>
                }
            </div>
        </div>
    );
}

export default ErrorBoundary.wrap(HiddenChannelLockScreen);
