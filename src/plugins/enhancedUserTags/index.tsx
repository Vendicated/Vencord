/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { getCurrentGuild } from "@utils/discord";
import definePlugin from "@utils/types";
import { ChannelStore, GuildStore } from "@webpack/common";
import type { Message } from "discord-types/general";

import EnhancedUserTag from "./components/EnhancedUserTag";
import { ErrorIcon, tagIcons } from "./components/Icons";
import { OriginalAutoModMessageTag, OriginalMessageSystemTag, OriginalUsernameSystemTag } from "./components/OriginalSystemTag";
import settings from "./settings";
import { getTagDetails, GetTagDetailsReturn, TAG_NAMES, TAGS } from "./tag";
import { Channel, User } from "./types";
import { isAutoContentModerationMessage, isAutoModMessage, isSystemMessage } from "./util/system";

const MembersList = ({
    user,
    channel,
    guildId,
}: {
    user: User;
    channel: Channel;
    guildId: string;
}) => {
    const guild = GuildStore.getGuild(guildId);

    const tagDetails = getTagDetails({
        user,
        // not sure that in members list need to append permissions from current channel to compute user permissions
        channel: guild ? null : channel,
        guild,
    });

    if (!tagDetails) return;

    return <EnhancedUserTag
        {...tagDetails}
        style={{
            display: "inline-flex",
            position: "relative",
            minWidth: "12px",
            height: "12px",
            marginLeft: "4px",
        }}
    />;
};

const ChannelChat = ({
    message,
    compact,
    usernameClassName,
}: {
    message?: Message;
    compact?: boolean;
    usernameClassName?: string;
}) => {
    if (!message) return;

    const channel = ChannelStore.getChannel(message.channel_id) as Channel;

    if (!channel) return;

    // not sure that much ppl wants group owner icon for a single user in the whole dm group chat
    if (channel.isGroupDM()) return;

    let tagDetails: GetTagDetailsReturn;

    // Shows tag also in user message inside AutoMod messages
    if (isAutoModMessage(message)) {
        // Original official tag for AutoMod is hardcoded and handles in `AutoMod` patch
        // so here we apply tag only for users inside `has blocked a message in` message
        if (!isAutoContentModerationMessage(message) || !usernameClassName) {
            return;
        }

        tagDetails = getTagDetails({
            user: message.author as User,
            channel,
            guild: GuildStore.getGuild(channel.guild_id),
        });

        // Community Updates (isSystemMessage instead .system cos there're two CU bots and for first one .system and etc are false)
    } else if (isSystemMessage(message)) {
        if (settings.store.originalOfficialTag)
            return <OriginalMessageSystemTag />;

        tagDetails = {
            icon: tagIcons[TAGS.OFFICIAL],
            text: `${TAG_NAMES[TAGS.OFFICIAL]} Message`,
            gap: true,
        };
    } else {
        tagDetails = getTagDetails({
            user: message.author as User,
            channel,
            guild: GuildStore.getGuild(channel.guild_id),
        });
    }

    if (!tagDetails) return;

    return <EnhancedUserTag
        {...tagDetails}
        style={{
            display: "inline-flex",
            position: "relative",
            minWidth: "14px",
            height: "14px",
            top: "1.5px",
            marginLeft: compact ? undefined : "4px",
            marginRight: ".35rem",
        }}
    />;
};

const AutoMod = ({
    compact,
}: {
    compact?: boolean;
}) => {
    return settings.store.originalAutoModTag ? <OriginalAutoModMessageTag /> : <EnhancedUserTag
        icon={tagIcons[TAGS.AUTOMOD]}
        text={TAG_NAMES[TAGS.AUTOMOD]}
        style={{
            display: "inline-flex",
            position: "relative",
            minWidth: "14px",
            height: "14px",
            marginLeft: compact ? undefined : "4px",
            marginRight: ".35rem",
            alignSelf: "center",
            bottom: "1px",
            gap: "4px",
        }}
    />;
};

const VoiceChannels = ({
    user,
    guildId,
}: {
    user: User;
    guildId: string;
}) => {
    const tagDetails = getTagDetails({
        user,
        guild: GuildStore.getGuild(guildId)
    });

    if (!tagDetails) return;

    return <EnhancedUserTag
        {...tagDetails}
        style={{
            display: "inline-flex",
            position: "relative",
            minWidth: "14px",
            height: "14px",
            marginLeft: "4px",
        }}
    />;
};

const UserProfile = ({ user, tags }: {
    user: User;
    tags?: {
        props?: {
            displayProfile?: {
                _guildMemberProfile?: any;
            };
        };
    };
}) => {
    // Show nothing in user `Main Profile`
    // p.s. there's no other way to check if profile is server or main
    const displayProfile = tags?.props?.displayProfile;
    const isMainProfile = displayProfile ? !displayProfile._guildMemberProfile : false;

    if (!user.bot && isMainProfile) return;

    const tagDetails = getTagDetails({
        user,
        guild: getCurrentGuild()
    });

    if (!tagDetails) return;

    return <EnhancedUserTag
        {...tagDetails}
        style={{
            display: "inline-flex",
            minWidth: "16px",
            height: "16px",
        }}
    />;
};

const DMsList = ({
    channel,
    user
}: {
    channel: Channel;
    user: User;
}) => {
    if (channel.isSystemDM())
        return settings.store.originalOfficialTag ? <OriginalUsernameSystemTag /> : <EnhancedUserTag
            icon={tagIcons[TAGS.OFFICIAL]}
            text={`${TAG_NAMES[TAGS.OFFICIAL]} Account`}
            gap={true}
            style={{
                display: "inline-flex",
                position: "relative",
                minWidth: "14px",
                height: "14px",
                marginLeft: "4px",
            }}
        />;

    if (user?.bot && settings.store.botTagInDmsList)
        return <EnhancedUserTag
            icon={tagIcons[TAGS.BOT]}
            text={TAG_NAMES[TAGS.BOT]}
            style={{
                display: "inline-flex",
                position: "relative",
                minWidth: "14px",
                height: "14px",
                marginLeft: "4px",
            }}
        />;
};

export default definePlugin({
    name: "EnhancedUserTags",
    description: "Replaces and extends default tags (Official, Original Poster, etc.) with a crown icon, the type of which depends on the user's permissions",
    authors: [Devs.Vishnya],

    settings,

    patches: [
        // Members List
        {
            find: ".Messages.GUILD_OWNER,",
            replacement: [
                // Remove original owner crown icon
                {
                    match: /=\(\)=>null.{1,80}\.Messages\.GUILD_OWNER.*?\.ownerIcon.*?:null,/,
                    replace: "=()=>null,",
                },
                // Add new tag
                {
                    match: /=\(\)=>{let.{1,30}isClyde.*?isVerifiedBot.*?},/,
                    replace: "=()=>$self.membersList(arguments[0]),",
                },
            ],
        },
        // Chat
        {
            // Remove original tag
            find: ".clanTagChiplet,profileViewedAnalytics:",
            replacement: [
                {
                    // Cozy view
                    match: /:null,null==\i\|\|\i\?null:\i,/,
                    replace: ":null,",
                },
                {
                    // Compact view
                    match: /children:\[null!=.{1,50}?" ".*?:null,/,
                    replace: "children:[",
                },
            ],
        },
        {
            // Add new one
            find: ".nitroAuthorBadgeTootip,",
            replacement: {
                match: /"span",{id:\i.{1,30}?\i}\),/,
                replace: "$&$self.channelChat(arguments[0]),",
            },

        },
        {
            // AutoMod
            find: ".SYSTEM_DM,className", // x5
            all: true,
            noWarn: true,
            replacement: {
                match: /(GUILD_AUTOMOD_USERNAME}\),).{1,30}.SYSTEM_DM.*?}\)/,
                replace: "$1$self.autoMod(arguments[0])",
            },
        },
        // Guild channels list > Voice user
        {
            find: ".WATCH_STREAM_WATCHING,",
            replacement: {
                match: /isSelf:\i}\)}\):null/,
                replace: "$&,$self.voiceChannels(this.props)",
            },
        },
        // Popout/modal profile
        {
            find: ".Messages.USER_PROFILE_PRONOUNS",
            replacement: {
                match: /null!=\i&&\(0.{1,35}.isVerifiedBot\(\)}\)/,
                replace: "$self.userProfile(arguments[0]),",
            },
        },
        // DMs list
        {
            find: "PrivateChannel.renderAvatar: Invalid prop configuration",
            replacement: {
                match: /decorators:\i.isSystemDM\(\).{1,80}}\):null/,
                replace: "decorators:$self.dmsList(arguments[0])"
            },
        },
    ],

    membersList: ErrorBoundary.wrap(MembersList, { fallback: () => <ErrorIcon /> }),

    channelChat: ErrorBoundary.wrap(ChannelChat, { fallback: () => <ErrorIcon /> }),

    autoMod: ErrorBoundary.wrap(AutoMod, { fallback: () => <ErrorIcon /> }),

    voiceChannels: ErrorBoundary.wrap(VoiceChannels, { fallback: () => <ErrorIcon /> }),

    userProfile: ErrorBoundary.wrap(UserProfile, { fallback: () => <ErrorIcon /> }),

    dmsList: ErrorBoundary.wrap(DMsList, { fallback: () => <ErrorIcon /> }),
});
