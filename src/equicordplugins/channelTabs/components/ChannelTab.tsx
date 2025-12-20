/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BaseText } from "@components/BaseText";
import { ChannelTabsProps, closeTab, isTabSelected, moveDraggedTabs, moveToTab, openedTabs, settings } from "@equicordplugins/channelTabs/util";
import { ActivityIcon, CircleQuestionIcon, DiscoveryIcon, EnvelopeIcon, FriendsIcon, ICYMIIcon, NitroIcon, QuestIcon, ShopIcon } from "@equicordplugins/channelTabs/util/icons";
import { activeQuestIntervals } from "@equicordplugins/questify"; // sorry murphy!
import { classNameFactory } from "@utils/css";
import { getGuildAcronym, getIntlMessage, getUniqueUsername } from "@utils/discord";
import { classes } from "@utils/misc";
import { Channel, Guild, User } from "@vencord/discord-types";
import { findByPropsLazy, findComponentByCodeLazy } from "@webpack";
import { Avatar, ChannelStore, ContextMenuApi, GuildStore, PresenceStore, ReadStateStore, TypingStore, useDrag, useDrop, useEffect, useRef, UserStore, useState, useStateFromStores } from "@webpack/common";
import { JSX } from "react";

import { TabContextMenu } from "./ContextMenus";

const ThreeDots = findComponentByCodeLazy(".dots,", "dotRadius:");
const dotStyles = findByPropsLazy("numberBadge", "textBadge");

const ChannelTypeIcon = findComponentByCodeLazy(".iconContainerWithGuildIcon,");

// Custom SVG icons for pages that don't have findable components

function LibraryIcon(height: number = 20, width: number = 20, className?: string): JSX.Element {
    return (
        <svg
            viewBox="0 0 24 24"
            height={height}
            width={width}
            fill="none"
            className={className}
        >
            <path fill="currentColor" d="M3 3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3zm2 1v16h10V4H5zm13-1h2a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-2V3zm0 2v12h1V5h-1z" />
        </svg>
    );
}

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
            <BaseText size="xs" weight="semibold" tag="span">{getGuildAcronym(guild)}</BaseText>
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
        ? <ThreeDots dotRadius={3} themed={true} className={cl("typing-indicator")} />
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
            className={classes(cl("notification-badge"), dotStyles.numberBadge, dotStyles.baseShapeRound)}
            style={{
                width: "16px"
            }}
            ref={node => node?.style.setProperty("background-color",
                mentionCount ? "var(--red-400)" : "var(--brand-500)", "important"
            )}
        >
            {mentionCount || unreadCount}
        </div> : null;
};

interface TabNumberBadgeProps {
    number: number;
    position: "left" | "right";
    isSelected: boolean;
    isCompact: boolean;
    isHovered: boolean;
}

export const TabNumberBadge = ({ number, position, isSelected, isCompact, isHovered }: TabNumberBadgeProps) => {
    // hide badge if:
    // 1. tab is currently selected
    // 2. tab is compact AND not hovered
    const shouldHide = isSelected || (isCompact && !isHovered);

    if (shouldHide) return null;

    return (
        <div
            className={cl("tab-number-badge", `position-${position}`)}
            data-position={position}
        >
            {number}
        </div>
    );
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
        () => {
            const recipientId = recipients?.[0] ?? "";

            return [
                !!((Object.keys(TypingStore.getTypingUsers(props.channelId)) as string[]).filter(id => id !== userId).length),
                PresenceStore.getStatus(recipientId),
                PresenceStore.isMobileOnline(recipientId)
            ];
        }
    );

    if (guild) {
        if (channel)
            return (
                <>
                    <GuildIcon guild={guild} />
                    <ChannelTypeIcon channel={channel} guild={guild} />
                    <BaseText className={cl("name-text")}>{channel.name}</BaseText>
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
                    <BaseText className={cl("name-text")}>{name}</BaseText>
                </>
            );
        }
    }

    if (channel && recipients?.length) {
        if (recipients.length === 1) {
            const user = UserStore.getUser(recipients[0]) as User & { globalName: string; };
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
                    <BaseText className={cl("name-text")}>
                        {username}
                    </BaseText>
                    <NotificationDot channelIds={[channel.id]} />
                    {!showStatusIndicators && <TypingIndicator isTyping={isTyping} />}
                </>
            );
        } else {
            // Group DM
            return (
                <>
                    <ChannelIcon channel={channel} />
                    <BaseText className={cl("name-text")}>{channel?.name || getIntlMessage("GROUP_DM")}</BaseText>
                    <NotificationDot channelIds={[channel.id]} />
                    <TypingIndicator isTyping={isTyping} />
                </>
            );
        }
    }

    // handle special synthetic pages
    if (channelId && channelId.startsWith("__")) {
        const specialPagesConfig: Record<string, { label: string, Icon: React.ComponentType<any>; }> = {
            "__quests__": { label: "Quests", Icon: QuestIcon },
            "__message-requests__": { label: "Message Requests", Icon: EnvelopeIcon },
            "__friends__": { label: getIntlMessage("FRIENDS"), Icon: FriendsIcon },
            "__shop__": { label: "Shop", Icon: ShopIcon },
            "__library__": { label: "Library", Icon: () => LibraryIcon(20, 20) },
            "__discovery__": { label: "Discovery", Icon: DiscoveryIcon },
            "__nitro__": { label: "Nitro", Icon: NitroIcon },
            "__icymi__": { label: "ICYMI", Icon: ICYMIIcon },
            "__activity__": { label: "Activity", Icon: ActivityIcon },
        };

        const pageConfig = specialPagesConfig[channelId];
        if (pageConfig) {
            const { label, Icon } = pageConfig;
            return (
                <>
                    <Icon />
                    <BaseText className={cl("name-text")}>{label}</BaseText>
                </>
            );
        }
    }

    if (guildId === "@me" || guildId === undefined) {
        return (
            <>
                <FriendsIcon />
                <BaseText className={cl("name-text")}>{getIntlMessage("FRIENDS")}</BaseText>
            </>
        );
    }

    return (
        <>
            <CircleQuestionIcon />
            <BaseText className={cl("name-text")}>{getIntlMessage("UNKNOWN_CHANNEL")}</BaseText>
        </>
    );
}

export default function ChannelTab(props: ChannelTabsProps & { index: number; }) {
    const { channelId, guildId, id, index, compact } = props;
    const guild = GuildStore.getGuild(guildId);
    const channel = ChannelStore.getChannel(channelId);

    const [isEntering, setIsEntering] = useState(true);
    const [isClosing, setIsClosing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isDropTarget, setIsDropTarget] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    const { showTabNumbers, tabNumberPosition } = settings.use(["showTabNumbers", "tabNumberPosition"]);

    useEffect(() => {
        if (isEntering) {
            const timer = setTimeout(() => setIsEntering(false), 300);
            return () => clearTimeout(timer);
        }
    }, [isEntering]);

    useEffect(() => {
        if (isDropTarget && !isDragging) {
            const timer = setTimeout(() => setIsDropTarget(false), 100);
            return () => clearTimeout(timer);
        }
    }, [isDropTarget, isDragging]);

    const ref = useRef<HTMLDivElement>(null);
    const lastSwapTimeRef = useRef(0);
    const SWAP_THROTTLE_MS = 100;

    const handleResizeStart = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const startX = e.clientX;
        const startWidth = ref.current?.getBoundingClientRect().width || 0;
        const baseWidth = 192; // 12rem in pixels (assuming 16px base font)
        let pendingScale = settings.store.tabWidthScale;

        document.body.style.cursor = "ew-resize";
        document.body.style.userSelect = "none";

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const newWidth = startWidth + deltaX;
            const newScale = newWidth / baseWidth;

            // 50% and 200% scale
            const clampedScale = Math.max(0.5, Math.min(2, newScale));
            pendingScale = Math.round(clampedScale * 100);

            // update CSS variable immediately for visual feedback
            if (ref.current) {
                ref.current.style.setProperty("--tab-width-scale", String(pendingScale / 100));
            }
        };

        const handleMouseUp = () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
            document.body.style.cursor = "";
            document.body.style.userSelect = "";

            settings.store.tabWidthScale = pendingScale;

            if (ref.current) {
                ref.current.style.removeProperty("--tab-width-scale");
            }
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
    };

    const [, drag] = useDrag(() => ({
        type: "vc_ChannelTab",
        item: () => {
            setIsDragging(true);
            lastSwapTimeRef.current = Date.now() - SWAP_THROTTLE_MS;

            // get fresh tab data dynamically to avoid stale closures
            const tab = openedTabs.find(t => t.id === id);

            return {
                id,
                channelId: tab?.channelId || channelId,
                guildId: tab?.guildId || guildId
            };
        },
        collect: monitor => ({
            isDragging: !!monitor.isDragging()
        }),
        end: () => {
            setIsDragging(false);
            setIsDropTarget(false);
            lastSwapTimeRef.current = 0;
        }
    }), [id, channelId, guildId]);
    const [, drop] = useDrop(() => ({
        accept: "vc_ChannelTab",
        hover: (item, monitor) => {
            if (!ref.current) return;

            const now = Date.now();
            const draggedId = item.id;
            const hoveredId = id;

            if (draggedId === hoveredId) return;

            const dragIndex = openedTabs.findIndex(t => t.id === draggedId);
            const hoverIndex = openedTabs.findIndex(t => t.id === hoveredId);

            if (dragIndex === -1 || hoverIndex === -1) return;

            const isOver = monitor.isOver({ shallow: true });
            setIsDropTarget(isOver);

            if (now - lastSwapTimeRef.current < SWAP_THROTTLE_MS) {
                return;
            }

            const hoverBoundingRect = ref.current.getBoundingClientRect();
            const clientOffset = monitor.getClientOffset();
            if (!clientOffset) return;

            const hoverClientX = clientOffset.x - hoverBoundingRect.left;
            const hoverWidth = hoverBoundingRect.right - hoverBoundingRect.left;
            const hoverMiddleX = hoverWidth / 2;

            // get tab width
            const draggedElement = document.querySelector(".vc-channeltabs-tab-dragging") as HTMLElement;
            const draggedWidth = draggedElement?.getBoundingClientRect().width || hoverWidth;
            const halfDraggedWidth = draggedWidth / 2;

            const hysteresis = hoverWidth * 0.05;

            // When dragging RIGHT: check if right edge of dragged tab has crossed midpoint
            if (dragIndex < hoverIndex) {
                const draggedRightEdge = hoverClientX + halfDraggedWidth;
                if (draggedRightEdge < hoverMiddleX + hysteresis) return;
            }

            // When dragging LEFT: check if left edge of dragged tab has crossed midpoint
            if (dragIndex > hoverIndex) {
                const draggedLeftEdge = hoverClientX - halfDraggedWidth;
                if (draggedLeftEdge > hoverMiddleX - hysteresis) return;
            }

            lastSwapTimeRef.current = now;
            moveDraggedTabs(dragIndex, hoverIndex);
        },
        drop: () => {
            setIsDropTarget(false);
        }
    }), []);
    drag(drop(ref));

    // check if quests running (questify momentLet)
    const hasActiveQuests = activeQuestIntervals.size > 0;

    return <div
        className={cl("tab", {
            "tab-compact": compact,
            "tab-selected": isTabSelected(id),
            "tab-entering": isEntering,
            "tab-closing": isClosing,
            "tab-dragging": isDragging,
            "tab-drop-target": isDropTarget,
            "tab-nitro": channelId === "__nitro__",
            "tab-quests-active": channelId === "__quests__" && hasActiveQuests,
            wider: settings.store.widerTabsAndBookmarks
        })}
        key={index}
        ref={ref}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
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
                {/* left position badge */}
                {showTabNumbers && tabNumberPosition === "left" && (
                    <TabNumberBadge
                        number={index + 1}
                        position="left"
                        isSelected={isTabSelected(id)}
                        isCompact={compact}
                        isHovered={isHovered}
                    />
                )}

                <ChannelTabContent {...props} guild={guild} channel={channel} />

                {/* right position badge */}
                {showTabNumbers && tabNumberPosition === "right" && (
                    <TabNumberBadge
                        number={index + 1}
                        position="right"
                        isSelected={isTabSelected(id)}
                        isCompact={compact}
                        isHovered={isHovered}
                    />
                )}
            </div>
        </button>

        {openedTabs.length > 1 && <button
            className={cl("button", "close-button", { "close-button-compact": compact, "hoverable": !compact })}
            onClick={() => {
                setIsClosing(true);
                setTimeout(() => closeTab(id), 150);
            }}
        >
            <XIcon size={16} fill="var(--interactive-icon-default)" />
        </button>}

        {!compact && settings.store.showResizeHandle && <div
            className={cl("tab-resize-handle")}
            onMouseDown={handleResizeStart}
        />}
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
