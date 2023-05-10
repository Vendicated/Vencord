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

import { Flex } from "@components/Flex.jsx";
import { classes } from "@utils/misc.jsx";
import { LazyComponent, useForceUpdater } from "@utils/react.jsx";
import { filters, find, findByCode, findByCodeLazy, findByPropsLazy, findStoreLazy, mapMangledModuleLazy } from "@webpack";
import {
    Button, ChannelStore, ContextMenu, FluxDispatcher, Forms, GuildStore, i18n, Menu,
    ReadStateStore, Text, TypingStore, useEffect, useRef, UserStore, useState, useStateFromStores
} from "@webpack/common";
import { FluxStore } from "@webpack/types";
import { Channel, Guild, User } from "discord-types/general";

import { BasicChannelTabsProps, ChannelTabsProps, channelTabsSettings, ChannelTabsUtils } from "./util.js";

const {
    closeCurrentTab, closeOtherTabs, closeTab, closeTabsToTheRight, createTab, handleChannelSwitch,
    isTabSelected, moveDraggedTabs, moveToTab, moveToTabRelative, saveTabs, openStartupTabs, reopenClosedTab
} = ChannelTabsUtils;

enum ChannelTypes {
    DM = 1,
    GROUP_DM = 3
}
const ChannelEmojisStore = findStoreLazy("ChannelEmojisStore") as FluxStore & {
    // from what i can tell the unknown is supposed to be the background color for the emoji but it's just null atm
    // also it looks like they'll allow custom emojis in the future ([0] as emoji id instead of unicode char) so probably handle that
    getChannelEmoji(channelId: string): [string, unknown] | undefined;
};
const useChannelEmojiBgColor: (emoji: string, channel: Channel) => any = findByCodeLazy('"#607D8B");');
const getDotWidth = findByCodeLazy("<10?16:");
const dotStyles = findByPropsLazy("numberBadge");
const ReadStateUtils = mapMangledModuleLazy('"ENABLE_AUTOMATIC_ACK",', {
    markAsRead: filters.byCode(".getActiveJoinedThreadsForParent")
});
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
const UserAvatar = ({ user }: { user: User; }) =>
    <img
        src={user.avatar
            ? `https://${window.GLOBAL_ENV.CDN_HOST}/avatars/${user?.id}/${user?.avatar}.png`
            : `https://${window.GLOBAL_ENV.CDN_HOST}/embed/avatars/${parseInt(user.discriminator, 10) % 5}.png`
        }
        className={cl("icon")}
    />;
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
function ChannelEmoji({ channel, emoji }: { channel: Channel, emoji: string | undefined; }) {
    if (!emoji || !channelTabsSettings.store.channelNameEmojis) return null;
    const backgroundColor = useChannelEmojiBgColor(emoji, channel);
    return <div className={cl("emoji-container")} style={{ backgroundColor }}>
        <Emoji emojiName={emoji} className={cl("emoji")} />
    </div>;
}
function ChannelContextMenu({ tab, update }: { tab: ChannelTabsProps, update: () => void; }) {
    const channel = ChannelStore.getChannel(tab.channelId);
    const { openTabs } = ChannelTabsUtils;
    return <Menu.Menu
        navId="channeltabs-channel-context"
        onClose={() => FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" })}
        aria-label="Channel Tab Context Menu"
    >
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
                action={() => { closeTab(tab.id); update(); }}
            />
            <Menu.MenuItem
                key="close-other-tabs"
                id="close-other-tabs"
                label="Close Other Tabs"
                action={() => {
                    closeOtherTabs(tab.id);
                    update();
                }}
            />
            <Menu.MenuItem
                key="close-right-tabs"
                id="close-right-tabs"
                label="Close Tabs to the Right"
                disabled={openTabs.indexOf(tab) === openTabs.length - 1}
                action={() => {
                    closeTabsToTheRight(tab.id);
                    update();
                }}
            />
        </Menu.MenuGroup>}
    </Menu.Menu>;
}

function ChannelTabContent(props: ChannelTabsProps & { guild?: Guild, channel?: Channel; }) {
    const { guildId, channel, channelId } = props;
    const guild = props.guild ?? GuildStore.getGuild(channel?.guild_id!);
    const userId = UserStore.getCurrentUser()?.id;
    const recipients = channel?.recipients;

    const [unreadCount, mentionCount, isTyping, channelEmoji] = useStateFromStores(
        [ReadStateStore, TypingStore, ChannelEmojisStore],
        () => [
            ReadStateStore.getUnreadCount(channelId) as number,
            ReadStateStore.getMentionCount(channelId) as number,
            !!((Object.keys(TypingStore.getTypingUsers(props.channelId)) as string[]).filter(id => id !== userId).length),
            ChannelEmojisStore.getChannelEmoji(channelId)?.[0]
        ],
        null,
        // is this necessary?
        (o, n) => o.every((v, i) => v === n[i])
    );

    if (guildId === "@favorites")
        return <>
            <GuildIcon guild={guild} />
            <ChannelEmoji emoji={channelEmoji} channel={channel!} />
            <Text className={cl("channel-name-text")}>#{channel?.name}</Text>
            <NotificationDot unreadCount={unreadCount} mentionCount={mentionCount} />
            <TypingIndicator isTyping={isTyping} />
        </>;
    if (guild) {
        if (channel)
            return <>
                <GuildIcon guild={guild} />
                <ChannelEmoji emoji={channelEmoji} channel={channel!} />
                <Text className={cl("channel-name-text")}>#{channel?.name}</Text>
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
                <Text className={cl("channel-name-text")}>{name}</Text>
            </>;
        }
    }
    if (channel && recipients?.length) {
        if (channel.type === ChannelTypes.DM) {
            const user = UserStore.getUser(recipients[0]);
            return <>
                <UserAvatar user={user} />
                <Text className={cl("channel-name-text")}>@{user?.username}</Text>
                <NotificationDot unreadCount={unreadCount} mentionCount={mentionCount} />
                <TypingIndicator isTyping={isTyping} />
            </>;
        } else { // Group DM
            return <>
                <ChannelIcon channel={channel} />
                <Text className={cl("channel-name-text")}>{channel?.name || i18n.Messages.GROUP_DM}</Text>
                <NotificationDot unreadCount={unreadCount} mentionCount={mentionCount} />
                <TypingIndicator isTyping={isTyping} />
            </>;
        }
    }

    if (guildId === "@me" || guildId === undefined)
        return <>
            <FriendsIcon height={24} width={24} />
            <Text className={cl("channel-name-text")}>{i18n.Messages.FRIENDS}</Text>
        </>;

    return <>
        <QuestionIcon height={24} width={24} />
        <Text className={cl("channel-name-text")}>{i18n.Messages.UNKNOWN_CHANNEL}</Text>
    </>;
}
function ChannelTab(props: ChannelTabsProps & { index: number, update: () => void; }) {
    const { channelId, guildId, id, index, update } = props;
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
            update();
        },
    }), []);
    drag(drop(ref));

    const tab = <div className={cl("tab-base")} ref={ref}>
        <ChannelTabContent {...props} guild={guild} channel={channel} />
    </div>;
    return tab;
}

export function ChannelsTabsContainer(props: BasicChannelTabsProps & { userId: string; }) {
    let userId: string;
    userId ??= props.userId;
    const _update = useForceUpdater();
    function update() {
        _update();
        saveTabs(userId);
    }
    const { openTabs } = ChannelTabsUtils;
    openStartupTabs(props, update);
    useEffect(() => {
        const initialRender = () => {
            userId = UserStore.getCurrentUser().id;
            _update();
            FluxDispatcher.unsubscribe("CONNECTION_OPEN_SUPPLEMENTAL", initialRender);
        };
        FluxDispatcher.subscribe("CONNECTION_OPEN_SUPPLEMENTAL", initialRender);
    }, []);

    function handleKeybinds(e: KeyboardEvent) {
        if (e.key === "Tab" && e.ctrlKey) {
            const direction = e.shiftKey ? -1 : 1;
            moveToTabRelative(direction, true);
            update();
        }
        // Ctrl+T is taken by discord
        else if (["N", "n"].includes(e.key) && e.ctrlKey) {
            createTab(props);
            update();
        }
        else if (["W", "w"].includes(e.key) && e.ctrlKey) {
            closeCurrentTab();
            update();
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

    handleChannelSwitch(props);
    saveTabs(userId);

    return <div className={cl("container")}>
        {openTabs.map((ch, i) => <div
            className={classes(cl("tab"), isTabSelected(ch.id) ? cl("tab-selected") : null)}
            key={i}
            onAuxClick={e => {
                if (e.button === 1 /* middle click */) {
                    closeTab(ch.id);
                    update();
                }
            }}
            onContextMenu={e => ContextMenu.open(e, () => <ChannelContextMenu tab={ch} update={update} />)}
        >
            <button
                className={classes(cl("button"), cl("channel-info"))}
                onClick={() => { moveToTab(ch.id); update(); }}
            >
                <ChannelTab {...ch} index={i} update={update} />
            </button>
            {openTabs.length > 1 && <button className={classes(cl("button"), cl("close-button"))} onClick={() => {
                closeTab(ch.id);
                update();
            }}>
                <XIcon width={16} height={16} />
            </button>}
        </div>)
        }
        <button onClick={() => {
            createTab(props, true);
            update();
        }} className={classes(cl("button"), cl("new-button"))}><PlusIcon /></button>
    </div >;
}
const PreviewTab = (props: ChannelTabsProps) => {
    const guild = GuildStore.getGuild(props.guildId);
    const channel = ChannelStore.getChannel(props.channelId);

    return <div className={cl("preview-tab")}>
        <ChannelTabContent {...props} guild={guild} channel={channel} />
    </div>;
};
export function ChannelTabsPreivew(p) {
    const id = UserStore.getCurrentUser()?.id;
    if (!id) return <Forms.FormText>there's no logged in account?????</Forms.FormText>;

    const { setValue }: { setValue: (v: { [userId: string]: ChannelTabsProps[]; }) => void; } = p;
    const { tabSet }: { tabSet: { [userId: string]: ChannelTabsProps[]; }; } = channelTabsSettings.use();
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
