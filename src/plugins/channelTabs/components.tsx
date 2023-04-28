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
import { classes, LazyComponent, useForceUpdater } from "@utils/misc.jsx";
import { filters, find, findByCode, findByCodeLazy, findByPropsLazy, findStoreLazy, mapMangledModuleLazy } from "@webpack";
import {
    Button, ChannelStore, ContextMenu, FluxDispatcher, Forms, GuildStore, Menu, ReadStateStore, Text, TypingStore,
    useDrag, useDrop, useEffect, UserStore, useState, useStateFromStores
} from "@webpack/common";
import { Channel, Guild, User } from "discord-types/general";

import { ChannelProps, channelTabsSettings, ChannelTabsUtils } from "./util.js";

const {
    closeCurrentTab, closeOtherTabs, closeTab, closeTabsToTheRight, createTab, handleChannelSwitch,
    isTabSelected, moveToTab, moveToTabRelative, saveChannels, shiftCurrentTab, openStartupTabs
} = ChannelTabsUtils;

enum ChannelTypes {
    DM = 1,
    GROUP_DM = 3
}
const ChannelNameEmojisStore = findStoreLazy("ChannelNameEmojisStore");
const useChannelEmojiBgColor: (emoji: string, channel: Channel) => any = findByCodeLazy('"#607D8B");');
const getDotWidth = findByCodeLazy("<10?16:");
const styles = findByPropsLazy("numberBadge");
const ReadStateUtils = mapMangledModuleLazy('"ENABLE_AUTOMATIC_ACK",', {
    markAsRead: filters.byCode(".getActiveJoinedThreadsForParent")
});

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
function TypingIndicator(props: { isTyping: boolean; }) {
    const { isTyping } = props;
    return isTyping
        ? <div style={{ marginLeft: 2 }}><ThreeDots dotRadius={3} themed={true} /></div>
        : null;
}
const NotificationDot = ({ unreadCount, mentionCount }: { unreadCount: number, mentionCount: number; }) => {
    return unreadCount > 0 ?
        <div
            data-has-mention={!!mentionCount}
            className={classes(styles.numberBadge, styles.baseShapeRound)}
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
function ChannelContextMenu(props: { channelInfo: ChannelProps, pos: number, update: () => void; }) {
    const { channelInfo, pos, update } = props;
    const channel = ChannelStore.getChannel(channelInfo.channelId);
    const { openChannels } = ChannelTabsUtils;
    return <Menu.Menu
        navId="channeltabs-channel-context"
        onClose={() => FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" })}
        aria-label="Channel Tab Context Menu"
    >
        {channel && <Menu.MenuGroup>
            <Menu.MenuItem
                key="mark-as-read"
                id="mark-as-read"
                label="Mark as Read"
                disabled={!ReadStateStore.hasUnread(channel.id)}
                action={() => ReadStateUtils.markAsRead(channel)}
            />
        </Menu.MenuGroup>}
        {openChannels.length !== 1 && <Menu.MenuGroup>
            <Menu.MenuItem
                key="close-tab"
                id="close-tab"
                label="Close Tab"
                action={() => { closeTab(pos); update(); }}
            />
            <Menu.MenuItem
                key="close-other-tabs"
                id="close-other-tabs"
                label="Close Other Tabs"
                action={() => {
                    closeOtherTabs(pos);
                    update();
                }}
            />
            <Menu.MenuItem
                key="close-right-tabs"
                id="close-right-tabs"
                label="Close Tabs to the Right"
                disabled={openChannels.length === (pos + 1)}
                action={() => {
                    closeTabsToTheRight(pos);
                    update();
                }}
            />
        </Menu.MenuGroup>}
    </Menu.Menu>;
}

function ChannelTabContent(props: ChannelProps & { guild?: Guild, channel?: Channel; }) {
    const { guildId, channel, channelId } = props;
    const guild = props.guild ?? GuildStore.getGuild(channel!.guild_id);
    const userId = UserStore.getCurrentUser()?.id;
    const recipients = channel?.recipients;
    const [unreadCount, mentionCount, isTyping, channelEmoji] = useStateFromStores(
        [ReadStateStore, TypingStore, ChannelNameEmojisStore],
        () => [
            ReadStateStore.getUnreadCount(props.channelId) as number,
            ReadStateStore.getMentionCount(props.channelId) as number,
            !!((Object.keys(TypingStore.getTypingUsers(props.channelId)) as string[]).filter(id => id !== userId).length),
            (props.channel
                ? ChannelNameEmojisStore.getGuildChannelEmojis(props.guildId)?.[props.channel.name?.toLowerCase()]
                : undefined
            ) as string | undefined
        ],
        null,
        // is this necessary?
        (o, n) => o[0] === n[0] && o[1] === n[1] && o[2] === n[2] && o[3] === n[3]
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
            let name = "Unknown (" + channelId + ")";
            switch (channelId) {
                case "customize-community":
                    name = "Channels & Roles";
                    break;
                case "channel-browser":
                    name = "Browse Channels";
                    break;
                case "@home":
                    name = "Server Guide";
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
                <Text className={cl("channel-name-text")}>{channel?.name || "Group DM"}</Text>
                <NotificationDot unreadCount={unreadCount} mentionCount={mentionCount} />
                <TypingIndicator isTyping={isTyping} />
            </>;
        }
    }

    if (guildId === "@me" || guildId === undefined)
        return <>
            <FriendsIcon height={24} width={24} />
            <Text className={cl("channel-name-text")}>Friends</Text>
        </>;

    return <>
        <QuestionIcon height={24} width={24} />
        <Text className={cl("channel-name-text")}>Unknown</Text>
    </>;
}
function ChannelTab(props: ChannelProps) {
    const guild = GuildStore.getGuild(props.guildId);
    const channel = ChannelStore.getChannel(props.channelId);

    const [{ isDragging }, drag] = useDrag(() => ({
        type: "vc_ChannelTab",
        collect: monitor => ({
            isDragging: !!monitor.isDragging()
        }),
    }));

    const tab = <div className={cl("tab-base")} ref={drag} style={{ opacity: isDragging ? 0.5 : 1 }}>
        <ChannelTabContent {...props} guild={guild} channel={channel} />
    </div>;
    return tab;
}

export function ChannelsTabsContainer(props: ChannelProps & { userId: string; }) {
    const _update = useForceUpdater();
    function update() {
        _update();
        saveChannels(props.userId);
    }
    const { openChannels } = ChannelTabsUtils;
    if (!openChannels.length) openStartupTabs(props, update);
    function handleKeybinds(e: KeyboardEvent) {
        if (e.key === "Tab" && e.ctrlKey) {
            const direction = e.shiftKey ? -1 : 1;
            moveToTabRelative(direction);
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
    }
    useEffect(() => {
        document.addEventListener("keydown", handleKeybinds);
        FluxDispatcher.subscribe("CHANNEL_SELECT", saveChannels);
        return () => {
            document.removeEventListener("keydown", handleKeybinds);
            FluxDispatcher.unsubscribe("CHANNEL_SELECT", saveChannels);
        };
    }, []);

    const [, drop] = useDrop(() => ({
        accept: "vc_ChannelTab",
        collect: monitor => ({
            isOver: !!monitor.isOver(),
        }),
        drop: (item, monitor) => {
            // TODO: figure this out
        },
    }), []);

    handleChannelSwitch(props);

    return <div className={cl("container")} ref={drop}>
        {openChannels.map((ch, i) => <div
            className={classes(cl("tab"), isTabSelected(ch) ? cl("tab-selected") : null)}
            key={i}
            onContextMenu={e => ContextMenu.open(e, () => <ChannelContextMenu channelInfo={ch} pos={i} update={update} />)}
        >
            <button className={classes(cl("button"), cl("channel-info"))} onMouseDown={event => {
                if (event.button !== 0)
                    return;

                moveToTab(i);
                update();
            }}>
                <ChannelTab {...ch} />
            </button>
            {openChannels.length > 1 && <button className={classes(cl("button"), cl("close-button"))} onClick={() => {
                closeTab(i);
                update();
            }}>
                <XIcon width={16} height={16} />
            </button>}
        </div>)
        }
        <button onClick={() => {
            createTab(props);
            update();
        }} className={classes(cl("button"), cl("new-button"))}><PlusIcon /></button>
    </div >;
}
const PreviewTab = (props: ChannelProps) => {
    const guild = GuildStore.getGuild(props.guildId);
    const channel = ChannelStore.getChannel(props.channelId);

    return <div className={cl("preview-tab")}>
        <ChannelTabContent {...props} guild={guild} channel={channel} />
    </div>;
};
export function ChannelTabsPreivew(p) {
    const id = UserStore.getCurrentUser()?.id;
    if (!id) return <Forms.FormText>there's no logged in account?????</Forms.FormText>;

    const { setValue }: { setValue: (v: { [userId: string]: ChannelProps[]; }) => void; } = p;
    const { tabSet }: { tabSet: { [userId: string]: ChannelProps[]; }; } = channelTabsSettings.use();
    const placeholder = [{ guildId: "@me", channelId: undefined as any }];

    const [currentTabs, setCurrentTabs] = useState(tabSet?.[id] ?? placeholder);
    return <>
        <Forms.FormTitle>Startup tabs</Forms.FormTitle>
        <Flex flexDirection="row" style={{ gap: "2px" }}>
            {currentTabs.map(t => <>
                <PreviewTab channelId={t.channelId} guildId={t.guildId} />
            </>)}
        </Flex>
        <Flex flexDirection="row-reverse">
            <Button
                onClick={() => {
                    setCurrentTabs([...ChannelTabsUtils.openChannels]);
                    setValue({ ...tabSet, [id]: [...ChannelTabsUtils.openChannels] });
                }}
            >Set to currently open tabs</Button>
        </Flex>
    </>;
}
