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

import "./style.css";

import { Flex } from "@components/Flex";
import { classes } from "@utils/misc";
import { LazyComponent, useForceUpdater } from "@utils/react";
import { filters, find, findByCode, findByCodeLazy, findByPropsLazy, mapMangledModuleLazy } from "@webpack";
import {
    Button, ChannelStore, ContextMenu, FluxDispatcher, Forms, GuildStore,
    i18n,
    Menu,
    PresenceStore,
    ReadStateStore, Text, TypingStore,
    useEffect, useRef,
    UserStore,
    useState, useStateFromStores
} from "@webpack/common";
import { Channel, Guild, User } from "discord-types/general";

import { BasicChannelTabsProps, ChannelTabsProps, channelTabsSettings as settings, ChannelTabsUtils } from "./util.js";

const {
    closeCurrentTab, closeOtherTabs, closeTab, closeTabsToTheRight, createTab, handleChannelSwitch, isTabSelected,
    moveDraggedTabs, moveToTab, moveToTabRelative, saveTabs, openStartupTabs, reopenClosedTab, setUpdaterFunction,
    toggleCompactTab
} = ChannelTabsUtils;

enum ChannelTypes {
    DM = 1,
    GROUP_DM = 3
}
const getDotWidth = findByCodeLazy("<10?16:");
const dotStyles = findByPropsLazy("numberBadge");
const ReadStateUtils = mapMangledModuleLazy('"ENABLE_AUTOMATIC_ACK",', {
    markAsRead: filters.byCode(".getActiveJoinedThreadsForParent")
});
const useEmojiBackgroundColor: (emoji: string, channelId: string) => string = findByCodeLazy("themeColor:null==");
const useDrag = findByCodeLazy(".disconnectDragSource(");
const useDrop = findByCodeLazy(".disconnectDropTarget(");

const QuestionIcon = LazyComponent(() => findByCode("M12 2C6.486 2 2 6.487"));
const FriendsIcon = LazyComponent(() => findByCode("M0.5,0 L0.5,1.5 C0.5,5.65"));
const PlusIcon = LazyComponent(() => findByCode("15 10 10 10"));
const XIcon = LazyComponent(() => findByCode("M18.4 4L12 10.4L5.6 4L4"));
const ThreeDots = LazyComponent(() => find(m => m.type?.render?.toString()?.includes(".dots")));
const Emoji = LazyComponent(() => findByCode(".autoplay,allowAnimatedEmoji:"));

const cl = (name: string) => `vc-channeltabs-${name}`;

const GuildIcon = ({ guild }: { guild: Guild; }) => guild.icon
    ? <img
        src={`https://${window.GLOBAL_ENV.CDN_HOST}/icons/${guild?.id}/${guild?.icon}.png`}
        className={cl("icon")}
    />
    : <div className={cl("guild-acronym-icon")}>
        <Text variant="text-xs/semibold" tag="span">{guild.acronym}</Text>
    </div>;


const Avatar = findByCodeLazy(".typingIndicatorRef", "svg");

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

const NotificationDot = ({ unreadCount, mentionCount }: { unreadCount: number, mentionCount: number; }) => {
    return unreadCount > 0 ?
        <div
            data-has-mention={!!mentionCount}
            className={classes(dotStyles.numberBadge, dotStyles.baseShapeRound)}
            style={{
                backgroundColor: mentionCount ? "var(--status-danger)" : "var(--brand-experiment)",
                width: getDotWidth(mentionCount || unreadCount)
            }}
        >
            {mentionCount || unreadCount}
        </div> : null;
};

function ChannelEmoji({ channel }: {
    channel: Channel & {
        // see comments in ChannelTabContent
        iconEmoji: {
            id?: string,
            name: string;
        },
        themeColor?: number;
    };
}) {
    const backgroundColor = useEmojiBackgroundColor(channel.iconEmoji.name, channel.id);

    return <div className={classes("channelEmoji-soSnippetsHideIt", cl("emoji-container"))} style={{ backgroundColor }}>
        {channel.iconEmoji.id
            ? <img src={`https://${window.GLOBAL_ENV.CDN_HOST}/emojis/${channel.iconEmoji.id}.png`} className={cl("emoji")} />
            : <Emoji emojiName={channel.iconEmoji.name} className={cl("emoji")} />
        }
    </div>;
}

function ChannelContextMenu({ tab }: { tab: ChannelTabsProps; }) {
    const channel = ChannelStore.getChannel(tab.channelId);
    const { openTabs } = ChannelTabsUtils;
    const [compact, setCompact] = useState(tab.compact);

    return <Menu.Menu
        navId="channeltabs-channel-context"
        onClose={() => FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" })}
        aria-label="Channel Tab Context Menu"
    >
        <Menu.MenuCheckboxItem
            checked={compact}
            key="toggle-compact-tab"
            id="toggle-compact-tab"
            label="Compact"
            action={() => {
                setCompact(compact => !compact);
                toggleCompactTab(tab.id);
            }}
        />
        {channel && <Menu.MenuGroup>
            <Menu.MenuItem
                key="mark-as-read"
                id="mark-as-read"
                label={i18n.Messages.MARK_AS_READ}
                disabled={!ReadStateStore.hasUnread(channel.id)}
                action={() => ReadStateUtils.markAsRead(channel)}
            />
        </Menu.MenuGroup>}
        {openTabs.length !== 1 && <Menu.MenuGroup>
            <Menu.MenuItem
                key="close-tab"
                id="close-tab"
                label="Close Tab"
                action={() => closeTab(tab.id)}
            />
            <Menu.MenuItem
                key="close-other-tabs"
                id="close-other-tabs"
                label="Close Other Tabs"
                action={() => closeOtherTabs(tab.id)}
            />
            <Menu.MenuItem
                key="close-right-tabs"
                id="close-right-tabs"
                label="Close Tabs to the Right"
                disabled={openTabs.indexOf(tab) === openTabs.length - 1}
                action={() => closeTabsToTheRight(tab.id)}
            />
        </Menu.MenuGroup>}
    </Menu.Menu>;
}

function ChannelTabContent(props: ChannelTabsProps &
{
    guild?: Guild,
    channel?: Channel & {
        iconEmoji?: {
            id?: string,
            name: string; // unicode emoji if it's not a custom one
        },
        // background color for channel emoji, undefined if it's from an auto generated emoji
        // and not explicitly set
        themeColor?: number;
    };
}) {
    const { guild, guildId, channel, channelId, compact } = props;
    const userId = UserStore.getCurrentUser()?.id;
    const recipients = channel?.recipients;

    const [unreadCount, mentionCount, isTyping, status, isMobile] = useStateFromStores(
        [ReadStateStore, TypingStore, PresenceStore],
        () => [
            ReadStateStore.getUnreadCount(channelId) as number,
            ReadStateStore.getMentionCount(channelId) as number,
            !!((Object.keys(TypingStore.getTypingUsers(props.channelId)) as string[]).filter(id => id !== userId).length),
            PresenceStore.getStatus(recipients?.[0]),
            PresenceStore.isMobileOnline(recipients?.[0])
        ],
        null,
        // is this necessary?
        (o, n) => o.every((v, i) => v === n[i])
    );

    if (guildId === "@favorites")
        return <>
            <Emoji emojiName={"⭐"} className={cl("icon")} />
            {/* @ts-ignore */}
            {!compact && channel?.iconEmoji ? <ChannelEmoji channel={channel} /> : null}
            {!compact && <Text className={cl("channel-name-text")}>#{channel?.name}</Text>}
            <NotificationDot unreadCount={unreadCount} mentionCount={mentionCount} />
            <TypingIndicator isTyping={isTyping} />
        </>;

    if (guild) {
        if (channel)
            return <>
                <GuildIcon guild={guild} />
                {/* @ts-ignore */}
                {!compact && channel?.iconEmoji ? <ChannelEmoji channel={channel} /> : null}
                {!compact && <Text className={cl("channel-name-text")}>#{channel.name}</Text>}
                <NotificationDot unreadCount={unreadCount} mentionCount={mentionCount} />
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
                case "@home":
                    name = i18n.Messages.SERVER_GUIDE;
                    break;
            }
            return <>
                <GuildIcon guild={guild} />
                {!compact && <Text className={cl("channel-name-text")}>{name}</Text>}
            </>;
        }
    }

    if (channel && recipients?.length) {
        if (channel.type === ChannelTypes.DM) {
            const user = UserStore.getUser(recipients[0]) as User & { globalName: string, isPomelo(): boolean; };
            const username = settings.store.noPomeloNames
                ? user.globalName ?? user.username
                : user.isPomelo() ? `@${user.username}` : user.tag;

            return <>
                <Avatar
                    size="SIZE_24"
                    src={user.getAvatarURL(guildId, 128)}
                    status={settings.store.showStatusIndicators ? status : null}
                    isTyping={isTyping}
                    isMobile={isMobile}
                />
                {!compact && <Text className={cl("channel-name-text")}>{username}</Text>}
                <NotificationDot unreadCount={unreadCount} mentionCount={mentionCount} />
                {!settings.store.showStatusIndicators && <TypingIndicator isTyping={isTyping} />}
            </>;
        } else { // Group DM
            return <>
                <ChannelIcon channel={channel} />
                {!compact && <Text className={cl("channel-name-text")}>{channel?.name || i18n.Messages.GROUP_DM}</Text>}
                <NotificationDot unreadCount={unreadCount} mentionCount={mentionCount} />
                <TypingIndicator isTyping={isTyping} />
            </>;
        }
    }

    if (guildId === "@me" || guildId === undefined)
        return <>
            <FriendsIcon height={24} width={24} />
            {!compact && <Text className={cl("channel-name-text")}>{i18n.Messages.FRIENDS}</Text>}
        </>;

    return <>
        <QuestionIcon height={24} width={24} />
        {!compact && <Text className={cl("channel-name-text")}>{i18n.Messages.UNKNOWN_CHANNEL}</Text>}
    </>;
}
function ChannelTab(props: ChannelTabsProps & { index: number; }) {
    const { channelId, guildId, id, index } = props;
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
        hover: item => {
            if (!ref.current) return;

            const dragIndex = item.index;
            const hoverIndex = index;
            if (dragIndex === hoverIndex) return;

            moveDraggedTabs(dragIndex, hoverIndex);
            item.index = hoverIndex;
        },
    }), []);
    drag(drop(ref));

    const tab = <div className={cl("tab-base")} ref={ref}>
        <ChannelTabContent {...props} guild={guild} channel={channel as any} />
    </div>;
    return tab;
}

export function ChannelsTabsContainer(props: BasicChannelTabsProps & { userId: string; }) {
    const { openTabs } = ChannelTabsUtils;
    let userId: string;
    userId ??= props.userId;

    const _update = useForceUpdater();
    function update() {
        _update();
        saveTabs(userId);
    }
    useEffect(() => {
        setUpdaterFunction(update);
        const initialRender = () => {
            userId = UserStore.getCurrentUser().id;
            _update();
            FluxDispatcher.unsubscribe("CONNECTION_OPEN_SUPPLEMENTAL", initialRender);
        };
        FluxDispatcher.subscribe("CONNECTION_OPEN_SUPPLEMENTAL", initialRender);
    }, []);
    openStartupTabs(props);

    function handleKeybinds(e: KeyboardEvent) {
        if (e.key === "Tab" && e.ctrlKey) {
            const direction = e.shiftKey ? -1 : 1;
            moveToTabRelative(direction, true);
        }
        // Ctrl+T is taken by discord
        else if (["N", "n"].includes(e.key) && e.ctrlKey) {
            createTab(props);
        }
        else if (["W", "w"].includes(e.key) && e.ctrlKey) {
            closeCurrentTab();
        }
        else if (["T", "t"].includes(e.key) && e.ctrlKey && e.shiftKey) {
            reopenClosedTab();
        }
    }
    useEffect(() => {
        document.addEventListener("keydown", handleKeybinds);
        return () => {
            document.removeEventListener("keydown", handleKeybinds);
        };
    }, []);

    if (!userId) return null;
    handleChannelSwitch(props);
    saveTabs(userId);

    return <div className={cl("container")}>
        {openTabs.map((ch, i) => <div
            className={classes(cl("tab"), ch.compact ? cl("tab-compact") : null, isTabSelected(ch.id) ? cl("tab-selected") : null)}
            key={i}
            onAuxClick={e => {
                if (e.button === 1 /* middle click */) {
                    closeTab(ch.id);
                }
            }}
            onContextMenu={e => ContextMenu.open(e, () => <ChannelContextMenu tab={ch} />)}
        >
            <button
                className={classes(cl("button"), cl("channel-info"))}
                onClick={() => moveToTab(ch.id)}
            >
                <ChannelTab {...ch} index={i} />
            </button>
            {openTabs.length > 1 && (ch.compact ? isTabSelected(ch.id) : true) && <button
                className={classes(cl("button"), cl("close-button"), ch.compact ? cl("close-button-compact") : null)}
                onClick={() => closeTab(ch.id)}
            >
                <XIcon width={16} height={16} />
            </button>}
        </div>)
        }

        <button
            onClick={() => createTab(props, true)}
            className={classes(cl("button"), cl("new-button"))}
        >
            <PlusIcon />
        </button>
    </div >;
}
const PreviewTab = (props: ChannelTabsProps) => {
    const guild = GuildStore.getGuild(props.guildId);
    const channel = ChannelStore.getChannel(props.channelId);

    return <div className={classes(cl("preview-tab"), props.compact ? cl("preview-tab-compact") : null)}>
        <ChannelTabContent {...props} guild={guild} channel={channel as any} />
    </div>;
};
export function ChannelTabsPreview(p) {
    const id = UserStore.getCurrentUser()?.id;
    if (!id) return <Forms.FormText>there's no logged in account?????</Forms.FormText>;

    const { setValue }: { setValue: (v: { [userId: string]: ChannelTabsProps[]; }) => void; } = p;
    const { tabSet }: { tabSet: { [userId: string]: ChannelTabsProps[]; }; } = settings.use(["tabSet"]);
    const placeholder = [{ guildId: "@me", channelId: undefined as any }];
    const [currentTabs, setCurrentTabs] = useState(tabSet?.[id] ?? placeholder);

    return <>
        <Forms.FormTitle>Startup tabs</Forms.FormTitle>
        <Flex flexDirection="row" style={{ gap: "2px" }}>
            {currentTabs.map(t => <>
                <PreviewTab {...t} />
            </>)}
        </Flex>
        <Flex flexDirection="row-reverse">
            <Button
                onClick={() => {
                    setCurrentTabs([...ChannelTabsUtils.openTabs]);
                    setValue({ ...tabSet, [id]: [...ChannelTabsUtils.openTabs] });
                }}
            >Set to currently open tabs</Button>
        </Flex>
    </>;
}
