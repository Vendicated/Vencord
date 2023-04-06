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
import { LazyComponent, useForceUpdater } from "@utils/misc.jsx";
import { filters, find, findByCode, mapMangledModuleLazy } from "@webpack";
import {
    Button, ChannelStore, ContextMenu, FluxDispatcher, Forms, GuildStore, Menu, ReadStateStore, Text, TypingStore,
    useDrag, useDrop, useEffect, useRef, UserStore, useState, useStateFromStores
} from "@webpack/common";
import { Channel, Guild, User } from "discord-types/general";

import { ChannelTabsProps, channelTabsSettings, ChannelTabsUtils } from "./util.js";

const {
    closeCurrentTab, closeOtherTabs, closeTab, closeTabsToTheRight, createTab, isEqualToCurrentTab, isTabSelected,
    moveToTab, moveToTabRelative, saveChannels, shiftCurrentTab, setCurrentTab, openStartupTabs
} = ChannelTabsUtils;

enum ChannelTypes {
    DM = 1,
    GROUP_DM = 3
}
const ReadStateUtils = mapMangledModuleLazy('"ENABLE_AUTOMATIC_ACK",', {
    markAsRead: filters.byCode(".getActiveJoinedThreadsForParent")
});

const twoChars = (n: number) => n > 99 ? "9+" : `${n}`;
const cl = (name: string) => `vc-channeltabs-${name}`;

const QuestionIcon = LazyComponent(() => findByCode("M12 2C6.486 2 2 6.487"));
const FriendsIcon = LazyComponent(() => findByCode("M0.5,0 L0.5,1.5 C0.5,5.65"));
const PlusIcon = () => <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" width="24" height="24"><path /* fill="var(--background-primary)"*/ d="M32 16a16 16 0 0 1-16 16A16 16 0 0 1 0 16a16 16 0 0 1 32 0z" /><path d="M16 6.667v18.667m-9.333-9.333h18.667" stroke="var(--text-normal)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" /></svg>;
const XIcon = () => <svg height="16" width="16" viewBox="-28.797 -28.797 172.787 172.787"><path fill="transparent" d="M57.596-28.797a86.394 86.394 0 0 1 86.394 86.393 86.394 86.394 0 0 1-86.394 86.394 86.394 86.394 0 0 1-86.393-86.394 86.394 86.394 0 0 1 86.393-86.393z" /><path fill="var(--text-normal)" d="m71.27 57.599 42.785-42.781a3.885 3.885 0 0 0 0-5.497l-8.177-8.18a3.889 3.889 0 0 0-5.496 0L57.597 43.926 14.813 1.141a3.889 3.889 0 0 0-5.496 0l-8.178 8.18a3.885 3.885 0 0 0 0 5.497L43.924 57.6l-42.78 42.776a3.887 3.887 0 0 0 0 5.497l8.177 8.18a3.889 3.889 0 0 0 5.496 0l42.779-42.78 42.779 42.78a3.889 3.889 0 0 0 5.496 0l8.177-8.18a3.887 3.887 0 0 0 0-5.497L71.27 57.599z" /></svg>;
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

const ThreeDots = LazyComponent(() => find(m => m.type?.render?.toString()?.includes(".dots")));
function TypingIndicator(props: { channelId: string; }) {
    const { channelId } = props;
    const hasTypingIndicatorPlugin = Vencord.Plugins.isPluginEnabled("TypingIndicator");
    const currentUserId = UserStore.getCurrentUser().id;
    const isTyping = useStateFromStores(
        [TypingStore],
        (): boolean => !!((Object.keys(TypingStore.getTypingUsers(channelId)) as string[]).filter(id => id !== currentUserId).length),
        null, (old, newer) => !hasTypingIndicatorPlugin && (old && !newer || !old && newer)
    );
    if (hasTypingIndicatorPlugin) return (Vencord.Plugins.plugins.TypingIndicator as any).TypingIndicator(channelId);
    else return isTyping
        ? <div style={{ marginLeft: 6 }}><ThreeDots dotRadius={3} themed={true} /></div>
        : null;
}
const NotificationDot = ({ unreadCount, mentionCount }: { unreadCount: number, mentionCount: number; }) => {
    let classes = cl("notification-dot");
    if (mentionCount) classes += ` ${cl("has-mention")}`;
    return unreadCount > 0 ? <div className={classes}>
        {twoChars(mentionCount || unreadCount)}
    </div> : null;
};
function ChannelContextMenu(props: { channelInfo: ChannelTabsProps, pos: number, update: () => void; }) {
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

function ChannelTabContent(props: ChannelTabsProps & { guild?: Guild, channel?: Channel; }) {
    const { guild, channel } = props;
    const recipients = channel?.recipients;
    const [unreadCount, mentionCount] = useStateFromStores(
        [ReadStateStore],
        (): [number, number] => [ReadStateStore.getUnreadCount(props.channelId), ReadStateStore.getMentionCount(props.channelId)],
        null, (_, newState) => newState.every(i => i !== 0)
    );
    if (props.guildId === "@me") return <>
        <FriendsIcon height={24} width={24} />
        <Text variant="text-md/semibold" className={cl("channel-name-text")}>Friends</Text>
    </>;
    if (props.guildId === "@favorites") return <>
        <GuildIcon guild={GuildStore.getGuild(channel!.guild_id)} />
        <Text variant="text-md/semibold" className={cl("channel-name-text")}>#{channel?.name}</Text>
        <NotificationDot unreadCount={unreadCount} mentionCount={mentionCount} />
        <TypingIndicator channelId={props.channelId} />
    </>;
    if (guild && channel) return <>
        <GuildIcon guild={guild} />
        <Text variant="text-md/semibold" className={cl("channel-name-text")}>#{channel?.name}</Text>
        <NotificationDot unreadCount={unreadCount} mentionCount={mentionCount} />
        <TypingIndicator channelId={channel?.id} />
    </>;
    if (channel && recipients?.length) {
        if (channel.type === ChannelTypes.DM) {
            const user = UserStore.getUser(recipients[0]);
            return <>
                <UserAvatar user={user} />
                <Text variant="text-md/semibold" className={cl("channel-name-text")}>@{user?.username}</Text>
                <NotificationDot unreadCount={unreadCount} mentionCount={mentionCount} />
                <TypingIndicator channelId={props.channelId} />
            </>;
        } else { // Group DM
            return <>
                <ChannelIcon channel={channel} />
                <Text variant="text-md/semibold" className={cl("channel-name-text")}>{channel?.name || "Group DM"}</Text>
                <NotificationDot unreadCount={unreadCount} mentionCount={mentionCount} />
                <TypingIndicator channelId={props.channelId} />
            </>;
        }
    }
    else return <>
        <QuestionIcon height={24} width={24} />
        <Text variant="text-md/semibold" className={cl("channel-name-text")}>Unknown</Text>
    </>;
}
function ChannelTab(props: ChannelTabsProps) {
    const guild = GuildStore.getGuild(props.guildId);
    const channel = ChannelStore.getChannel(props.channelId);

    const ref = useRef<HTMLDivElement>(null);
    const [, drop] = useDrop(() => ({
        accept: "vc_ChannelTab",
        collect: monitor => ({
            isOver: !!monitor.isOver(),
        }),
    }), []);
    const [{ isDragging }, drag] = useDrag(() => ({
        type: "vc_ChannelTab",
        collect: monitor => ({
            isDragging: !!monitor.isDragging()
        }),
    }));
    drag(drop(ref));

    const tab = <div className={cl("tab-base")} ref={ref} style={{ opacity: isDragging ? 0.5 : 1 }}>
        <ChannelTabContent {...props} guild={guild} channel={channel} />
    </div>;
    return tab;
}

export function ChannelsTabsContainer(props: ChannelTabsProps) {
    const _update = useForceUpdater();
    function update() {
        _update();
        saveChannels();
    }
    openStartupTabs(props, update);
    const { openChannels } = ChannelTabsUtils;
    function handleKeybinds(e: KeyboardEvent) {
        if (["ArrowLeft", "ArrowRight"].includes(e.key)) {
            const direction = e.key === "ArrowLeft" ? -1 : 1;
            if (e.ctrlKey) {
                moveToTabRelative(direction);
                update();
            }
            else if (e.shiftKey) {
                shiftCurrentTab(direction);
                update();
            }
        }
        // Ctrl+T is taken by discord
        else if (["N", "n"].includes(e.key) && e.ctrlKey) {
            createTab(props);
            update();
        }
        else if (["W", "w"].includes(e.key) && e.ctrlKey) {
            if (openChannels.length > 1) closeCurrentTab();
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

    if (!isEqualToCurrentTab(props)) setCurrentTab(props);

    return <div className={cl("container")}>
        {openChannels.map((ch, i) => <div
            className={cl("tab")}
            style={isTabSelected(ch) ? { backgroundColor: "var(--background-modifier-selected)" } : undefined}
            key={i}
            onContextMenu={e => ContextMenu.open(e, () => <ChannelContextMenu channelInfo={ch} pos={i} update={update} />)}
        >
            <button className={`${cl("button")} ${cl("channel-info")}`} onClick={() => {
                moveToTab(i);
                update();
            }}>
                <ChannelTab {...ch} />
            </button>
            {openChannels.length > 1 && <button className={`${cl("button")} ${cl("close-button")}`} onClick={() => {
                closeTab(i);
                update();
            }}>
                <XIcon />
            </button>}
        </div>)
        }
        <button onClick={() => {
            createTab(props);
            update();
        }} className={cl("button")}><PlusIcon /></button>
    </div >;
}

export function ChannelTabsPreivew(p) {
    const { setValue }: { setValue: (v: ChannelTabsProps[]) => void; } = p;
    const { tabSet }: { tabSet: ChannelTabsProps[], onStartup: string; } = channelTabsSettings.use();
    const placeholder = [{ guildId: "@me", channelId: undefined as any }];

    const [currentTabs, setCurrentTabs] = useState(tabSet ?? placeholder);
    const cl = (n: string) => `vc-channeltabs-preview-${n}`;
    const Tab = ({ channelId, guildId }: ChannelTabsProps) => {
        if (guildId === "@me") return <div className={cl("tab")}>
            <FriendsIcon height={24} width={24} />
            <Text variant="text-sm/semibold" className={cl("text")}>Friends</Text>
        </div>;
        const channel = ChannelStore.getChannel(channelId);
        const guild = GuildStore.getGuild(guildId);
        const recipients = channel?.recipients;
        if (channel && guild) return <div className={cl("tab")}>
            <GuildIcon guild={guild} />
            <Text variant="text-sm/semibold" className={cl("text")}>#{channel.name}</Text>
        </div>;
        else if (recipients?.length) {
            if (recipients.length === 1) {
                const user = UserStore.getUser(recipients[0]);
                return <div className={cl("tab")}>
                    <UserAvatar user={user} />
                    <Text variant="text-sm/semibold" className={cl("text")}>@{user?.username}</Text>
                </div>;
            } else {
                return <div className={cl("tab")}>
                    <ChannelIcon channel={channel} />
                    <Text variant="text-sm/semibold" className={cl("text")}>{channel?.name || "Group DM"}</Text>
                </div>;
            }
        }
        return <div className={cl("tab")}>
            <QuestionIcon height={24} width={24} />;
            <Text variant="text-sm/semibold" className={cl("text")}>Unknown {guildId}/{channelId}</Text>
        </div>;
    };
    return <>
        <Forms.FormTitle>Startup tabs</Forms.FormTitle>
        <Flex flexDirection="row" style={{ gap: "2px" }}>
            {currentTabs.map(t => <>
                <Tab channelId={t.channelId} guildId={t.guildId} />
            </>)}
        </Flex>
        <Flex flexDirection="row-reverse">
            <Button
                onClick={() => {
                    setCurrentTabs([...ChannelTabsUtils.openChannels]);
                    setValue([...ChannelTabsUtils.openChannels]);
                }}
            >Set to currently open tabs</Button>
        </Flex>
    </>;
}
