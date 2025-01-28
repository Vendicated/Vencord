/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import { getIntlMessage, getUniqueUsername } from "@utils/discord";
import { classes } from "@utils/misc";
import { findByPropsLazy, findComponentByCodeLazy } from "@webpack";
import { Avatar, ChannelStore, ContextMenuApi, Dots, GuildStore, PresenceStore, ReadStateStore, Text, TypingStore, useDrag, useDrop, useRef, UserStore, useStateFromStores } from "@webpack/common";
import { Channel, Guild, User } from "discord-types/general";

import { ChannelTabsProps, CircleQuestionIcon, closeTab, isTabSelected, moveDraggedTabs, moveToTab, openedTabs, settings } from "../util";
import { TabContextMenu } from "./ContextMenus";

const { getBadgeWidthForValue } = findByPropsLazy("getBadgeWidthForValue");
const dotStyles = findByPropsLazy("numberBadge", "textBadge");

const { FriendsIcon } = findByPropsLazy("FriendsIcon");
const ChannelTypeIcon = findComponentByCodeLazy(".iconContainerWithGuildIcon,");

const cl = classNameFactory("vc-channeltabs-");

function XIcon({ size, fill }: { size: number, fill: string; }) {
    return <svg width={size} height={size} viewBox="0 0 24 24">
        <path fill={fill}
            d="M17.3 18.7a1 1 0 0 0 1.4-1.4L13.42 12l5.3-5.3a1 1 0 0 0-1.42-1.4L12 10.58l-5.3-5.3a1 1 0 0 0-1.4 1.42L10.58 12l-5.3 5.3a1 1 0 1 0 1.42 1.4L12 13.42l5.3 5.3Z"
        />
    </svg>;
}

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
        ? <Dots dotRadius={3} themed={true} className={cl("typing-indicator")} />
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
                mentionCount ? "var(--red-400)" : "var(--brand-500)", "important"
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
            return (
                <>
                    <GuildIcon guild={guild} />
                    <ChannelTypeIcon channel={channel} guild={guild} />
                    {!compact && <Text className={cl("name-text")}>{channel.name}</Text>}
                    <NotificationDot channelIds={[channel.id]} />
                    <TypingIndicator isTyping={isTyping} />
                </>
            );
        else {
            let name = `${getIntlMessage("UNKNOWN_CHANNEL")} (${channelId})`;
            switch (channelId) {
                case "customize-community":
                    name = getIntlMessage("CHANNELS_AND_ROLES");
                    break;
                case "channel-browser":
                    name = getIntlMessage("GUILD_SIDEBAR_CHANNEL_BROWSER");
                    break;
                case "shop":
                    name = getIntlMessage("GUILD_SHOP_CHANNEL_LABEL");
                    break;
                case "member-safety":
                    name = getIntlMessage("MEMBER_SAFETY_CHANNEL_TITLE");
                    break;
                case "@home":
                    name = getIntlMessage("SERVER_GUIDE");
                    break;
            }
            return (
                <>
                    <GuildIcon guild={guild} />
                    {!compact && <Text className={cl("name-text")}>{name}</Text>}
                </>
            );
        }
    }

    if (channel && recipients?.length) {
        if (recipients.length === 1) {
            const user = UserStore.getUser(recipients[0]) as User & { globalName: string, isPomelo(): boolean; };
            const username = noPomeloNames
                ? user.globalName || user.username
                : getUniqueUsername(user);

            return (
                <>
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
                </>
            );
        } else {
            // Group DM
            return (
                <>
                    <ChannelIcon channel={channel} />
                    {!compact && <Text className={cl("name-text")}>{channel?.name || getIntlMessage("GROUP_DM")}</Text>}
                    <NotificationDot channelIds={[channel.id]} />
                    <TypingIndicator isTyping={isTyping} />
                </>
            );
        }
    }

    if (guildId === "@me" || guildId === undefined)
        return (
            <>
                <FriendsIcon />
                {!compact && <Text className={cl("name-text")}>{getIntlMessage("FRIENDS")}</Text>}
            </>
        );

    return (
        <>
            <CircleQuestionIcon />
            {!compact && <Text className={cl("name-text")}>{getIntlMessage("UNKNOWN_CHANNEL")}</Text>}
        </>
    );
}

export default function ChannelTab(props: ChannelTabsProps & { index: number; }) {
    const { channelId, guildId, id, index, compact } = props;
    const guild = GuildStore.getGuild(guildId);
    const channel = ChannelStore.getChannel(channelId);

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

    return <div
        className={cl("tab", { "tab-compact": compact, "tab-selected": isTabSelected(id), wider: settings.store.widerTabsAndBookmarks })}
        key={index}
        ref={ref}
        onAuxClick={e => {
            if (e.button === 1 /* middle click */)
                closeTab(id);
        }}
        onContextMenu={e => ContextMenuApi.openContextMenu(e, () => <TabContextMenu tab={props} />)}
    >
        <button
            className={cl("button", "channel-info")}
            onClick={() => moveToTab(id)}
        >
            <div
                className={cl("tab-inner")}
                data-compact={compact}
            >
                <ChannelTabContent {...props} guild={guild} channel={channel} />
            </div>
        </button>

        {openedTabs.length > 1 && (compact ? isTabSelected(id) : true) && <button
            className={cl("button", "close-button", { "close-button-compact": compact, "hoverable": !compact })}
            onClick={() => closeTab(id)}
        >
            <XIcon size={16} fill="var(--interactive-normal)" />
        </button>}
    </div>;
}

export const PreviewTab = (props: ChannelTabsProps) => {
    const guild = GuildStore.getGuild(props.guildId);
    const channel = ChannelStore.getChannel(props.channelId);

    return (
        <div className={classes(cl("preview-tab"), props.compact ? cl("preview-tab-compact") : null)}>
            <ChannelTabContent {...props} guild={guild} channel={channel} />
        </div>
    );
};
