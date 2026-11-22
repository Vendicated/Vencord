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
import { ChannelType } from "@vencord/discord-types/enums";
import { findCssClassesLazy } from "@webpack";
import { PermissionsBits, PermissionStore } from "@webpack/common";

const enum SortOrderTypes {
    LATEST_ACTIVITY = 0,
    CREATION_DATE = 1
}

const enum ForumLayoutTypes {
    DEFAULT = 0,
    LIST = 1,
    GRID = 2
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

const ChannelTypesToChannelNames = {
    [ChannelType.GUILD_TEXT]: "text",
    [ChannelType.GUILD_ANNOUNCEMENT]: "announcement",
    [ChannelType.GUILD_FORUM]: "forum",
    [ChannelType.GUILD_VOICE]: "voice",
    [ChannelType.GUILD_STAGE_VOICE]: "stage"
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
        defaultForumLayout,
        defaultAutoArchiveDuration,
        rateLimitPerUser,
        defaultThreadRateLimitPerUser,
        defaultSortOrder,
        bitrate,
        rtcRegion,
        videoQualityMode
    } = channel;

    return (
        <div className={classes(ChatScrollClasses.auto, ChatScrollClasses.customTheme, ChatScrollClasses.managedReactiveScroller)}>
            <div className={cl("container")}>
                <img className={cl("logo")} src={HiddenChannelLogo} />

                <div className={cl("heading-container")}>
                    <Heading tag="h1" size="xxl">This is a {!PermissionStore.can(PermissionsBits.VIEW_CHANNEL, channel) ? "hidden" : "locked"} {ChannelTypesToChannelNames[type]} channel</Heading>
                </div>

                {(!channel.isGuildVoice() && !channel.isGuildStageVoice()) && (
                    <Paragraph size="lg">
                        You can not see the name or {channel.isForumChannel() ? "posts" : "messages"} of this channel.
                    </Paragraph>
                )}

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
                {channel.hasFlag(ChannelFlags.REQUIRE_TAG) &&
                    <Paragraph size="md">Posts on this forum require a tag to be set.</Paragraph>
                }
            </div>
        </div>
    );
}

export default ErrorBoundary.wrap(HiddenChannelLockScreen);
