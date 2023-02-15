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

import { LazyComponent, useForceUpdater } from "@utils/misc.jsx";
import { findByCode } from "@webpack";
import { ChannelStore, GuildStore, ReadStateStore, Text, useEffect, UserStore, useStateFromStores } from "@webpack/common";
import { Channel, Guild, User } from "discord-types/general";

import { ChannelTabsProps, ChannelTabsUtils } from "./util.js";
const {
    closeCurrentTab, closeTab, createTab, isEqualToCurrentTab, isTabSelected, moveToTab, moveToTabRelative, shiftCurrentTab, setCurrentTabTo
} = ChannelTabsUtils;

const twoChars = (n: number) => n > 99 ? "9+" : `${n}`;
const cl = (name: string) => `vc-channeltabs-${name}`;

const PlusIcon = () => <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" width="24" height="24"><path /* fill="var(--background-primary)"*/ d="M32 16a16 16 0 0 1-16 16A16 16 0 0 1 0 16a16 16 0 0 1 32 0z" /><path d="M16 6.667v18.667m-9.333-9.333h18.667" stroke="var(--text-normal)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" /></svg>;
const XIcon = () => <svg height="16" width="16" viewBox="-28.797 -28.797 172.787 172.787"><path fill="transparent" d="M57.596-28.797a86.394 86.394 0 0 1 86.394 86.393 86.394 86.394 0 0 1-86.394 86.394 86.394 86.394 0 0 1-86.393-86.394 86.394 86.394 0 0 1 86.393-86.393z" /><path fill="var(--text-normal)" d="m71.27 57.599 42.785-42.781a3.885 3.885 0 0 0 0-5.497l-8.177-8.18a3.889 3.889 0 0 0-5.496 0L57.597 43.926 14.813 1.141a3.889 3.889 0 0 0-5.496 0l-8.178 8.18a3.885 3.885 0 0 0 0 5.497L43.924 57.6l-42.78 42.776a3.887 3.887 0 0 0 0 5.497l8.177 8.18a3.889 3.889 0 0 0 5.496 0l42.779-42.78 42.779 42.78a3.889 3.889 0 0 0 5.496 0l8.177-8.18a3.887 3.887 0 0 0 0-5.497L71.27 57.599z" /></svg>;
const QuestionIcon = LazyComponent(() => findByCode("M12 2C6.486 2 2 6.487"));
const FriendsIcon = LazyComponent(() => findByCode("M0.5,0 L0.5,1.5 C0.5,5.65"));
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
        src={`https://${window.GLOBAL_ENV.CDN_HOST}/avatars/${user?.id}/${user?.avatar}.png`}
        className={cl("icon")}
    />;
const NotificationDot = ({ unreadCount, mentionCount }: { unreadCount: number, mentionCount: number; }) => {
    let classes = cl("notification-dot");
    if (mentionCount) classes += ` ${cl("has-mention")}`;
    return unreadCount > 0 ? <div className={classes}>
        {twoChars(mentionCount || unreadCount)}
    </div> : null;
};

function ChannelTabContent(props: ChannelTabsProps & { guild?: Guild, channel?: Channel, user?: User; }) {
    const { guild, channel, user } = props;
    const [unreadCount, mentionCount] = useStateFromStores(
        [ReadStateStore], () => [ReadStateStore.getUnreadCount(props.channelId), ReadStateStore.getMentionCount(props.channelId)]
    );
    if (props.guildId === "@me") return <>
        <FriendsIcon height={24} width={24} />
        <Text variant="text-md/semibold" className={cl("channel-name-text")}>Friends</Text>
    </>;
    if (guild && channel) return <>
        <GuildIcon guild={guild} />
        <Text variant="text-md/semibold" className={cl("channel-name-text")}>#{channel.name}</Text>
        <NotificationDot unreadCount={unreadCount} mentionCount={mentionCount} />

    </>;
    if (user) return <>
        <UserAvatar user={user} />
        <Text variant="text-md/semibold" className={cl("channel-name-text")}>@{user?.username}</Text>
        <NotificationDot unreadCount={unreadCount} mentionCount={mentionCount} />
    </>;
    else return <>
        <QuestionIcon height={24} width={24} />
        <Text variant="text-md/semibold" className={cl("channel-name-text")}>Unknown</Text>
    </>;
}
function ChannelTab(props: ChannelTabsProps) {
    const guild = GuildStore.getGuild(props.guildId);
    const channel = ChannelStore.getChannel(props.channelId);
    const user = UserStore.getUser(channel?.recipients?.[0]);
    const tab = <div className={cl("tab-base")}>
        <ChannelTabContent {...props} guild={guild} channel={channel} user={user} />
    </div>;
    return tab;
}

export function ChannelsTabsContainer(props: ChannelTabsProps) {
    const update = useForceUpdater();
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
        return () => {
            document.removeEventListener("keydown", handleKeybinds);
        };
    }, []);

    if (!openChannels.length) createTab(props);
    if (!isEqualToCurrentTab(props)) setCurrentTabTo(props);

    return <div className={cl("container")}>
        {openChannels.map((ch, i) => <div
            className={cl("tab")}
            style={isTabSelected(ch) ? { backgroundColor: "var(--background-modifier-selected)" } : undefined}
            key={i}
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

