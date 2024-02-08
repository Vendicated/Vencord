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
import { findByPropsLazy } from "@webpack";
import { Avatar, ChannelStore, GuildStore, i18n, Menu, PresenceStore, ReactDnd, ReadStateStore, Text, TypingStore, useRef, UserStore, useStateFromStores } from "@webpack/common";
import { Channel, Guild, User } from "discord-types/general";

import { ChannelTabsProps, channelTabsSettings as settings, ChannelTabsUtils, CircleQuestionIcon } from "../util";

const { moveDraggedTabs } = ChannelTabsUtils;

const { getBadgeWidthForValue } = findByPropsLazy("getBadgeWidthForValue");
const dotStyles = findByPropsLazy("numberBadge", "textBadge");

const { FriendsIcon } = findByPropsLazy("FriendsIcon");

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
        ? <div className={cl("typing-indicator")}>
            {/* @ts-ignore */}
            <Menu.Dots dotRadius={3} themed={true} />
        </div>
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
                width: getBadgeWidthForValue(mentionCount || unreadCount)
            }}
            ref={node => node?.style.setProperty("background-color",
                mentionCount ? "var(--red-400)" : "var(--brand-experiment)", "important"
            )}
        >
            {mentionCount || unreadCount}
        </div> : null;
};

function ChannelTabContent(props: ChannelTabsProps & {
    guild?: Guild,
    channel?: Channel;
}) {
    const { guild, guildId, channel, channelId, compact } = props;
    const userId = UserStore.getCurrentUser()?.id;
    const recipients = channel?.recipients;
    const {
        noPomeloNames,
        showStatusIndicators
    } = settings.use(["noPomeloNames", "showStatusIndicators"]);

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
        <CircleQuestionIcon />
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
