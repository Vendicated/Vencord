/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { DecoratorProps } from "@api/MemberListDecorators";
import { isPluginEnabled } from "@api/PluginManager";
import { definePluginSettings } from "@api/Settings";
import betterActivities from "@equicordplugins/betterActivities";
import showMeYourName from "@plugins/showMeYourName";
import { Devs, EquicordDevs } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import { classes } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { Activity, ApplicationStream, Channel, Message, OnlineStatus, User } from "@vencord/discord-types";
import { MessageFlags } from "@vencord/discord-types/enums";
import { findByCodeLazy, findByPropsLazy, findComponentByCodeLazy, findCssClassesLazy, findExportedComponentLazy } from "@webpack";
import { ChannelStore, ExperimentStore, MessageStore, Parser, RelationshipStore, SnowflakeUtils, UserGuildSettingsStore, UserStore, useStateFromStores } from "@webpack/common";

const cl = classNameFactory("vc-message-peek-");

const PrivateChannelClasses = findCssClassesLazy("subtext", "channel", "interactive");
const ActivityClasses = findCssClassesLazy("textWithIconContainer", "icon", "truncated", "container", "textXs");
const MessageActions = findByPropsLazy("fetchMessages", "sendMessage");

const hasRelevantActivity: (props: ActivityCheckProps) => boolean = findByCodeLazy(".OFFLINE||", ".INVISIBLE)return!1");
const ActivityText: React.ComponentType<ActivityTextProps> = findComponentByCodeLazy("hasQuest:", "hideEmoji:");

const ONE_HOUR_MS = 60 * 60 * 1000;

const settings = definePluginSettings({
    hideMuted: {
        type: OptionType.BOOLEAN,
        description: "Hide message previews and timestamps for muted DMs and group chats.",
        default: false
    }
});

type AttachmentType = "image" | "gif" | "video" | "file";
type IconType = AttachmentType | "voice" | "sticker";

const Icons: Record<IconType, React.ComponentType<{ size: string; className: string; }>> = {
    image: findExportedComponentLazy("ImageIcon"),
    file: findExportedComponentLazy("AttachmentIcon"),
    voice: findExportedComponentLazy("MicrophoneIcon"),
    sticker: findExportedComponentLazy("StickerIcon"),
    gif: findExportedComponentLazy("GifIcon"),
    video: findExportedComponentLazy("VideoIcon"),
};

const ATTACHMENT_LABELS: Record<AttachmentType, string> = {
    gif: "GIF",
    image: "image",
    video: "video",
    file: "file"
};

interface ActivityCheckProps {
    activities: Activity[] | null;
    status: OnlineStatus;
    applicationStream: ApplicationStream | null;
    voiceChannel: Channel | null;
}

interface ActivityTextProps {
    user: User;
    activities: Activity[] | null;
    applicationStream: ApplicationStream | null;
    voiceChannel: Channel | null;
}

interface PrivateChannelProps extends ActivityCheckProps {
    channel: Channel;
    user: User;
}

interface MessageContent {
    text: React.ReactNode;
    icon?: IconType;
}

function getActivityIcons(activities: Activity[] | null, user: User): React.ReactNode {
    if (!activities?.length) return null;

    if (!isPluginEnabled(betterActivities.name)) return null;

    return betterActivities.patchActivityList({
        activities,
        user,
        hideTooltip: false
    });
}

function getAttachmentType(contentType = ""): AttachmentType {
    if (contentType === "image/gif") return "gif";
    if (contentType.startsWith("image/")) return "image";
    if (contentType.startsWith("video/")) return "video";
    return "file";
}

function formatRelativeTime(timestamp: number): string {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days >= 365) return `${Math.floor(days / 365)}y`;
    if (days >= 30) return `${Math.floor(days / 30)}mo`;
    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    return `${Math.max(1, minutes)}m`;
}

function pluralize(count: number, singular: string, plural = singular + "s") {
    return count === 1 ? `1 ${singular}` : `${count} ${plural}`;
}

function getMessageContent(message: Message): MessageContent | null {
    if (message.content) {
        if (/https?:\/\/(\S+\.gif|tenor\.com|giphy\.com|klipy\.com)/i.test(message.content)) {
            return { text: "sent a GIF", icon: "gif" };
        }
        return { text: Parser.parseInlineReply(message.content) };
    }

    if (message.flags & MessageFlags.IS_VOICE_MESSAGE) {
        return { text: "voice message", icon: "voice" };
    }

    if (message.attachments?.length) {
        const types = message.attachments.map(a => getAttachmentType(a.content_type));
        const count = types.length;
        const firstType = types[0];
        const allSameType = types.every(t => t === firstType);

        if (allSameType) {
            return { text: pluralize(count, ATTACHMENT_LABELS[firstType]), icon: firstType };
        }
        return { text: pluralize(count, "file"), icon: "file" };
    }

    if (message.stickerItems?.length) {
        return { text: message.stickerItems[0].name, icon: "sticker" };
    }

    return null;
}

function MessagePreviewContent({ channel, user }: { channel: Channel; user: User | null | undefined; }) {
    const lastMessage = useStateFromStores(
        [MessageStore],
        () => MessageStore.getLastMessage(channel.id) as Message | undefined
    );

    if (channel.isSystemDM()) {
        return <>Official Discord Message</>;
    }

    const smynName = isPluginEnabled(showMeYourName.name) ? showMeYourName.getTypingMemberListProfilesReactionsVoiceNameText({ user: user ?? lastMessage?.author, type: "membersList" }) : null;

    if (!lastMessage) {
        if (channel.isMultiUserDM()) return <>{channel.recipients.length + 1} Members</>;
        return null;
    }

    const content = getMessageContent(lastMessage);
    if (!content) return null;

    const currentUserId = UserStore.getCurrentUser()?.id;
    const isOwnMessage = lastMessage.author.id === currentUserId;
    const authorName = isOwnMessage ? "You" : (smynName || RelationshipStore.getNickname(lastMessage.author.id) || lastMessage.author.globalName || lastMessage.author.username);
    const Icon = content.icon ? Icons[content.icon] : null;

    return (
        <div className={classes(ActivityClasses.container, ActivityClasses.textXs, cl("preview"))}>
            <span className={ActivityClasses.truncated}>{authorName}: {content.text}</span>
            {Icon && (
                <span className={cl("icon")}>
                    <Icon size="xxs" className={ActivityClasses.icon} />
                </span>
            )}
        </div>
    );
}

function SubText({ channel, user, activities, applicationStream, voiceChannel, showActivity }: PrivateChannelProps & { showActivity: boolean; }) {
    if (showActivity) {
        return (
            <ActivityText
                user={user}
                activities={activities}
                voiceChannel={voiceChannel}
                applicationStream={applicationStream}
            />
        );
    }

    const activityIcons = getActivityIcons(activities, user);

    if (activityIcons) {
        return (
            <div className={PrivateChannelClasses.subtext}>
                <div className={cl("activity-row")}>
                    <MessagePreviewContent channel={channel} user={user} />
                    {activityIcons}
                </div>
            </div>
        );
    }

    return (
        <div className={PrivateChannelClasses.subtext}>
            <MessagePreviewContent channel={channel} user={user} />
        </div>
    );
}

function Timestamp({ channel }: { channel: Channel; }) {
    const lastMessage = useStateFromStores([MessageStore], () => MessageStore.getLastMessage(channel.id) as Message | undefined);

    if (!lastMessage) return null;

    const timestamp = SnowflakeUtils.extractTimestamp(lastMessage.id);
    const className = ExperimentStore.getUserExperimentBucket("2026-01-favorites-server") > 0 ? cl("timestamp-favorites") : cl("timestamp");
    return <span className={className}>{formatRelativeTime(timestamp)}</span>;
}

function shouldShowActivity(lastMessage: Message | undefined, hasActivity: boolean): boolean {
    if (!hasActivity) return false;
    if (!lastMessage) return true;

    const messageTimestamp = SnowflakeUtils.extractTimestamp(lastMessage.id);
    return Date.now() - messageTimestamp > ONE_HOUR_MS;
}

export default definePlugin({
    name: "MessagePeek",
    description: "Shows the last message preview and timestamp in the Direct Messages list.",
    authors: [Devs.prism, EquicordDevs.justjxke],
    settings,
    patches: [
        {
            find: "PrivateChannel.renderAvatar",
            replacement: {
                match: /,subText:(\i)\.isSystemDM\(\).{0,500}:null,(?=name:)/,
                replace: ",subText:$self.getSubText(arguments[0]),"
            }
        }
    ],

    async start() {
        const channels = ChannelStore.getSortedPrivateChannels();
        for (const channel of channels) {
            if (!MessageStore.getLastMessage(channel.id)) {
                await MessageActions.fetchMessages({ channelId: channel.id, limit: 1 });
            }
        }
    },

    renderMemberListDecorator({ channel }: DecoratorProps) {
        if (!channel) return null;
        if (settings.store.hideMuted && UserGuildSettingsStore.isChannelMuted(null!, channel.id)) return null;
        return <Timestamp channel={channel} />;
    },

    getSubText(props: PrivateChannelProps) {
        const { channel, user, activities, status, applicationStream, voiceChannel } = props;

        if (settings.store.hideMuted && UserGuildSettingsStore.isChannelMuted(null!, channel.id)) {
            const hasActivity = hasRelevantActivity({ activities, status, applicationStream, voiceChannel });
            if (hasActivity) {
                return (
                    <ActivityText
                        user={user}
                        activities={activities}
                        voiceChannel={voiceChannel}
                        applicationStream={applicationStream}
                    />
                );
            }
            return null;
        }

        const lastMessage = MessageStore.getLastMessage(channel.id) as Message | undefined;
        const hasActivity = hasRelevantActivity({ activities, status, applicationStream, voiceChannel });
        const showActivity = shouldShowActivity(lastMessage, hasActivity);

        return (
            <SubText
                channel={channel}
                user={user}
                activities={activities}
                status={status}
                applicationStream={applicationStream}
                voiceChannel={voiceChannel}
                showActivity={showActivity}
            />
        );
    }
});
