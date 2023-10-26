/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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

import { getUniqueUsername } from "@utils/discord";
import { classes } from "@utils/misc";
import { LazyComponent } from "@utils/react";
import { find, findByCode, findByPropsLazy } from "@webpack";
import { Avatar, ChannelStore, GuildStore, i18n, PresenceStore, ReactDnd, ReadStateStore, Text, TypingStore, useRef, UserStore, useStateFromStores } from "@webpack/common";
import { Channel, Guild, User } from "discord-types/general";

import { ChannelTabsProps, channelTabsSettings as settings, ChannelTabsUtils } from "../util";

const { moveDraggedTabs } = ChannelTabsUtils;

const BadgeUtils = findByPropsLazy("getBadgeWidthForValue");
const dotStyles = findByPropsLazy("numberBadge", "textBadge");
const ChannelEmojiHooks = findByPropsLazy("useChannelEmojiAndColor");

const Emoji = LazyComponent(() => findByCode(".autoplay,allowAnimatedEmoji:"));
const FriendsIcon = () => <svg
    height={24}
    width={24}
    viewBox="0 0 24 16"
>
    <path fill="var(--text-muted)" fillRule="nonzero" d="M0.5,0 L0.5,1.5 C0.5,5.65 2.71,9.28 6,11.3 L6,16 L21,16 L21,14 C21,11.34 15.67,10 13,10 C13,10 12.83,10 12.75,10 C8,10 4,6 4,1.5 L4,0 L0.5,0 Z M13,0 C10.790861,0 9,1.790861 9,4 C9,6.209139 10.790861,8 13,8 C15.209139,8 17,6.209139 17,4 C17,1.790861 15.209139,0 13,0 Z" />
</svg>;
const QuestionIcon = () => <svg
    height={24}
    width={24}
    viewBox="0 0 24 24"
>
    <path fill="var(--text-muted)" d="M12 2C6.486 2 2 6.487 2 12C2 17.515 6.486 22 12 22C17.514 22 22 17.515 22 12C22 6.487 17.514 2 12 2ZM12 18.25C11.31 18.25 10.75 17.691 10.75 17C10.75 16.31 11.31 15.75 12 15.75C12.69 15.75 13.25 16.31 13.25 17C13.25 17.691 12.69 18.25 12 18.25ZM13 13.875V15H11V12H12C13.104 12 14 11.103 14 10C14 8.896 13.104 8 12 8C10.896 8 10 8.896 10 10H8C8 7.795 9.795 6 12 6C14.205 6 16 7.795 16 10C16 11.861 14.723 13.429 13 13.875Z" />
</svg>;
const ThreeDots = LazyComponent(() => {
    const res = find(m => m.Dots && !m.Menu);
    return res?.Dots;
});

const cl = (name: string) => `vc-channeltabs-${name}`;

const GuildIcon = ({ guild }: { guild: Guild; }) => {
    return guild.icon
        ? <img
            src={`https://${window.GLOBAL_ENV.CDN_HOST}/icons/${guild?.id}/${guild?.icon}.png`}
            className={cl("icon")}
        />
        : <div className={cl("guild-acronym-icon")}>
            <Text variant="text-xs/semibold" tag="span">{guild.acronym}</Text>
        </div>;
};

const ChannelIcon = ({ channel }: { channel: Channel; }) =>
    <img
        src={channel?.icon
            ? `https://${window.GLOBAL_ENV.CDN_HOST}/channel-icons/${channel?.id}/${channel?.icon}.png`
            : "https://discord.com/assets/c6851bd0b03f1cca5a8c1e720ea6ea17.png" // Default Group Icon
        }
        className={cl("icon")}
    />;

function TypingIndicator({ isTyping }: { isTyping: boolean; }) {
    return isTyping
        ? <div className={cl("typing-indicator")}><ThreeDots dotRadius={3} themed={true} /></div>
        : null;
}

export const NotificationDot = ({ channelIds }: { channelIds: string[]; }) => {
    const [unreadCount, mentionCount] = useStateFromStores(
        [ReadStateStore],
        () => [
            channelIds.reduce((count, channelId) => count + ReadStateStore.getUnreadCount(channelId), 0),
            channelIds.reduce((count, channelId) => count + ReadStateStore.getMentionCount(channelId), 0),
        ]
    );

    return unreadCount > 0 ?
        <div
            data-has-mention={!!mentionCount}
            className={classes(dotStyles.numberBadge, dotStyles.baseShapeRound)}
            style={{
                backgroundColor: mentionCount ? "var(--status-danger)" : "var(--brand-experiment)",
                width: BadgeUtils.getBadgeWidthForValue(mentionCount || unreadCount)
            }}
        >
            {mentionCount || unreadCount}
        </div> : null;
};

function ChannelEmoji({ channel }: { channel: Channel; }) {
    const { emoji, color } = ChannelEmojiHooks.useChannelEmojiAndColor(channel);
    if (!emoji?.name) return null;

    return <div className={cl("emoji-container")} style={{ backgroundColor: color }}>
        {emoji.id
            ? <img src={emoji.url} className={cl("emoji")} />
            : <Emoji emojiName={emoji.name} className={cl("emoji")} />
        }
    </div>;
}

function ChannelTabContent(props: ChannelTabsProps & {
    guild?: Guild,
    channel?: Channel;
}) {
    const { guild, guildId, channel, channelId, compact } = props;
    const userId = UserStore.getCurrentUser()?.id;
    const recipients = channel?.recipients;
    const {
        noPomeloNames,
        showChannelEmojis,
        showStatusIndicators
    } = settings.use(["noPomeloNames", "showChannelEmojis", "showStatusIndicators"]);

    const [isTyping, status, isMobile] = useStateFromStores(
        [TypingStore, PresenceStore],
        () => [
            !!((Object.keys(TypingStore.getTypingUsers(props.channelId)) as string[]).filter(id => id !== userId).length),
            PresenceStore.getStatus(recipients?.[0]) as string,
            PresenceStore.isMobileOnline(recipients?.[0]) as boolean
        ]
    );

    if (guild) {
        if (channel)
            return <>
                <GuildIcon guild={guild} />
                {!compact && showChannelEmojis && <ChannelEmoji channel={channel} />}
                {!compact && <Text className={cl("name-text")}>#{channel.name}</Text>}
                <NotificationDot channelIds={[channel.id]} />
                <TypingIndicator isTyping={isTyping} />
            </>;
        else {
            let name = `${i18n.Messages.UNKNOWN_CHANNEL} (${channelId})`;
            switch (channelId) {
                case "customize-community":
                    name = i18n.Messages.CHANNELS_AND_ROLES;
                    break;
                case "channel-browser":
                    name = i18n.Messages.GUILD_SIDEBAR_CHANNEL_BROWSER;
                    break;
                case "shop":
                    name = i18n.Messages.GUILD_SHOP_CHANNEL_LABEL;
                    break;
                case "member-safety":
                    name = i18n.Messages.MEMBER_SAFETY_CHANNEL_TITLE;
                    break;
                case "@home":
                    name = i18n.Messages.SERVER_GUIDE;
                    break;
            }
            return <>
                <GuildIcon guild={guild} />
                {!compact && <Text className={cl("name-text")}>{name}</Text>}
            </>;
        }
    }

    if (channel && recipients?.length) {
        if (recipients.length === 1) {
            const user = UserStore.getUser(recipients[0]) as User & { globalName: string, isPomelo(): boolean; };
            const username = noPomeloNames
                ? user.globalName || user.username
                : getUniqueUsername(user);

            return <>
                <Avatar
                    size="SIZE_24"
                    src={user.getAvatarURL(guildId, 128)}
                    status={showStatusIndicators ? status : undefined}
                    isTyping={isTyping}
                    isMobile={isMobile}
                />
                {!compact && <Text className={cl("name-text")} data-pomelo={user.isPomelo()}>
                    {username}
                </Text>}
                <NotificationDot channelIds={[channel.id]} />
                {!showStatusIndicators && <TypingIndicator isTyping={isTyping} />}
            </>;
        } else { // Group DM
            return <>
                <ChannelIcon channel={channel} />
                {!compact && <Text className={cl("name-text")}>{channel?.name || i18n.Messages.GROUP_DM}</Text>}
                <NotificationDot channelIds={[channel.id]} />
                <TypingIndicator isTyping={isTyping} />
            </>;
        }
    }

    if (guildId === "@me" || guildId === undefined)
        return <>
            <FriendsIcon />
            {!compact && <Text className={cl("name-text")}>{i18n.Messages.FRIENDS}</Text>}
        </>;

    return <>
        <QuestionIcon />
        {!compact && <Text className={cl("name-text")}>{i18n.Messages.UNKNOWN_CHANNEL}</Text>}
    </>;
}

export default function ChannelTab(props: ChannelTabsProps & { index: number; }) {
    const { channelId, guildId, id, index } = props;
    const guild = GuildStore.getGuild(guildId);
    const channel = ChannelStore.getChannel(channelId);

    const { useDrag, useDrop } = ReactDnd;

    const ref = useRef<HTMLDivElement>(null);
    const [, drag] = useDrag(() => ({
        type: "vc_ChannelTab",
        item: () => {
            return { id, index };
        },
        collect: monitor => ({
            isDragging: !!monitor.isDragging()
        }),
    }));
    const [, drop] = useDrop(() => ({
        accept: "vc_ChannelTab",
        hover: (item, monitor) => {
            if (!ref.current) return;

            const dragIndex = item.index;
            const hoverIndex = index;
            if (dragIndex === hoverIndex) return;

            const hoverBoundingRect = ref.current?.getBoundingClientRect();
            const hoverMiddleX =
                (hoverBoundingRect.right - hoverBoundingRect.left) / 2;
            const clientOffset = monitor.getClientOffset();
            const hoverClientX = clientOffset.x - hoverBoundingRect.left;
            if (dragIndex < hoverIndex && hoverClientX < hoverMiddleX
                || dragIndex > hoverIndex && hoverClientX > hoverMiddleX) {
                return;
            }

            moveDraggedTabs(dragIndex, hoverIndex);
            item.index = hoverIndex;
        },
    }), []);
    drag(drop(ref));

    const tab = <div
        ref={ref}
        className={cl("tab-inner")}
        data-compact={props.compact}
    >
        <ChannelTabContent {...props} guild={guild} channel={channel as any} />
    </div>;
    return tab;
}

export const PreviewTab = (props: ChannelTabsProps) => {
    const guild = GuildStore.getGuild(props.guildId);
    const channel = ChannelStore.getChannel(props.channelId);

    return <div className={classes(cl("preview-tab"), props.compact ? cl("preview-tab-compact") : null)}>
        <ChannelTabContent {...props} guild={guild} channel={channel as any} />
    </div>;
};
