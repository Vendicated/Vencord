/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { classNameFactory } from "@api/Styles";
import { getGuildAcronym, openImageModal, openUserProfile } from "@utils/discord";
import { classes } from "@utils/misc";
import { ModalRoot, ModalSize, openModal } from "@utils/modal";
import { useAwaiter } from "@utils/react";
import { Guild, User } from "@vencord/discord-types";
import { findByPropsLazy, findComponentByCodeLazy } from "@webpack";
import { FluxDispatcher, Forms, GuildChannelStore, GuildMemberStore, GuildRoleStore, IconUtils, Parser, PresenceStore, RelationshipStore, ScrollerThin, SnowflakeUtils, TabBar, Timestamp, useEffect, UserStore, UserUtils, useState, useStateFromStores } from "@webpack/common";

const IconClasses = findByPropsLazy("icon", "acronym", "childWrapper");
const FriendRow = findComponentByCodeLazy("discriminatorClass:", ".isMobileOnline", "getAvatarURL");

const cl = classNameFactory("vc-gp-");

export function openGuildInfoModal(guild: Guild) {
    openModal(props =>
        <ModalRoot {...props} size={ModalSize.MEDIUM}>
            <GuildInfoModal guild={guild} />
        </ModalRoot>
    );
}

const enum Tabs {
    ServerInfo,
    Friends,
    BlockedUsers,
    IgnoredUsers
}

interface GuildProps {
    guild: Guild;
}

interface RelationshipProps extends GuildProps {
    setCount(count: number): void;
}

const fetched = {
    friends: false,
    blocked: false,
    ignored: false
};

function renderTimestamp(timestamp: number) {
    return (
        <Timestamp timestamp={new Date(timestamp)} />
    );
}

function GuildInfoModal({ guild }: GuildProps) {
    const [friendCount, setFriendCount] = useState<number>();
    const [blockedCount, setBlockedCount] = useState<number>();
    const [ignoredCount, setIgnoredCount] = useState<number>();

    useEffect(() => {
        fetched.friends = false;
        fetched.blocked = false;
        fetched.ignored = false;
    }, []);

    const [currentTab, setCurrentTab] = useState(Tabs.ServerInfo);

    const bannerUrl = guild.banner && IconUtils.getGuildBannerURL(guild, true)!.replace(/\?size=\d+$/, "?size=1024");

    const iconUrl = guild.icon && IconUtils.getGuildIconURL({
        id: guild.id,
        icon: guild.icon,
        canAnimate: true,
        size: 512
    });

    return (
        <div className={cl("root")}>
            {bannerUrl && currentTab === Tabs.ServerInfo && (
                <img
                    className={cl("banner")}
                    src={bannerUrl}
                    alt=""
                    onClick={() => openImageModal({
                        url: bannerUrl,
                        width: 1024
                    })}
                />
            )}

            <div className={cl("header")}>
                {iconUrl
                    ? <img
                        className={cl("icon")}
                        src={iconUrl}
                        alt=""
                        onClick={() => openImageModal({
                            url: iconUrl,
                            height: 512,
                            width: 512,
                        })}
                    />
                    : <div aria-hidden className={classes(IconClasses.childWrapper, IconClasses.acronym)}>{getGuildAcronym(guild)}</div>
                }

                <div className={cl("name-and-description")}>
                    <Forms.FormTitle tag="h5" className={cl("name")}>{guild.name}</Forms.FormTitle>
                    {guild.description && <Forms.FormText>{guild.description}</Forms.FormText>}
                </div>
            </div>

            <TabBar
                type="top"
                look="brand"
                className={cl("tab-bar")}
                selectedItem={currentTab}
                onItemSelect={setCurrentTab}
            >
                <TabBar.Item
                    className={cl("tab", { selected: currentTab === Tabs.ServerInfo })}
                    id={Tabs.ServerInfo}
                >
                    Server Info
                </TabBar.Item>
                <TabBar.Item
                    className={cl("tab", { selected: currentTab === Tabs.Friends })}
                    id={Tabs.Friends}
                >
                    Friends{friendCount !== undefined ? ` (${friendCount})` : ""}
                </TabBar.Item>
                <TabBar.Item
                    className={cl("tab", { selected: currentTab === Tabs.BlockedUsers })}
                    id={Tabs.BlockedUsers}
                >
                    Blocked Users{blockedCount !== undefined ? ` (${blockedCount})` : ""}
                </TabBar.Item>
                <TabBar.Item
                    className={cl("tab", { selected: currentTab === Tabs.IgnoredUsers })}
                    id={Tabs.IgnoredUsers}
                >
                    Ignored Users{ignoredCount !== undefined ? ` (${ignoredCount})` : ""}
                </TabBar.Item>
            </TabBar>

            <div className={cl("tab-content")}>
                {currentTab === Tabs.ServerInfo && <ServerInfoTab guild={guild} />}
                {currentTab === Tabs.Friends && <FriendsTab guild={guild} setCount={setFriendCount} />}
                {currentTab === Tabs.BlockedUsers && <BlockedUsersTab guild={guild} setCount={setBlockedCount} />}
                {currentTab === Tabs.IgnoredUsers && <IgnoredUserTab guild={guild} setCount={setIgnoredCount} />}
            </div>
        </div>
    );
}


function Owner(guildId: string, owner: User) {
    const guildAvatar = GuildMemberStore.getMember(guildId, owner.id)?.avatar;
    const ownerAvatarUrl =
        guildAvatar
            ? IconUtils.getGuildMemberAvatarURLSimple({
                userId: owner!.id,
                avatar: guildAvatar,
                guildId,
                canAnimate: true
            })
            : IconUtils.getUserAvatarURL(owner, true);

    return (
        <div className={cl("owner")}>
            <img
                className={cl("owner-avatar")}
                src={ownerAvatarUrl}
                alt=""
                onClick={() => openImageModal({
                    url: ownerAvatarUrl,
                    height: 512,
                    width: 512
                })}
            />
            {Parser.parse(`<@${owner.id}>`)}
        </div>
    );
}

function ServerInfoTab({ guild }: GuildProps) {
    const [owner] = useAwaiter(() => UserUtils.getUser(guild.ownerId), {
        deps: [guild.ownerId],
        fallbackValue: null
    });

    const Fields = {
        "Server Owner": owner ? Owner(guild.id, owner) : "Loading...",
        "Created At": renderTimestamp(SnowflakeUtils.extractTimestamp(guild.id)),
        "Joined At": guild.joinedAt ? renderTimestamp(guild.joinedAt.getTime()) : "-", // Not available in lurked guild
        "Vanity Link": guild.vanityURLCode ? (<a>{`discord.gg/${guild.vanityURLCode}`}</a>) : "-", // Making the anchor href valid would cause Discord to reload
        "Preferred Locale": guild.preferredLocale || "-",
        "Verification Level": ["None", "Low", "Medium", "High", "Highest"][guild.verificationLevel] || "?",
        "Server Boosts": `${guild.premiumSubscriberCount ?? 0} (Level ${guild.premiumTier ?? 0})`,
        "Channels": GuildChannelStore.getChannels(guild.id)?.count - 1 || "?", // - null category
        "Roles": GuildRoleStore.getSortedRoles(guild.id).length - 1, // - @everyone
    };

    return (
        <div className={cl("info")}>
            {Object.entries(Fields).map(([name, node]) =>
                <div className={cl("server-info-pair")} key={name}>
                    <Forms.FormTitle tag="h5">{name}</Forms.FormTitle>
                    {typeof node === "string" ? <span>{node}</span> : node}
                </div>
            )}
        </div>
    );
}

function FriendsTab({ guild, setCount }: RelationshipProps) {
    return UserList("friends", guild, RelationshipStore.getFriendIDs(), setCount);
}

function BlockedUsersTab({ guild, setCount }: RelationshipProps) {
    const blockedIds = RelationshipStore.getBlockedIDs();
    return UserList("blocked", guild, blockedIds, setCount);
}

function IgnoredUserTab({ guild, setCount }: RelationshipProps) {
    const ignoredIds = RelationshipStore.getIgnoredIDs();
    return UserList("ignored", guild, ignoredIds, setCount);
}


function UserList(type: "friends" | "blocked" | "ignored", guild: Guild, ids: string[], setCount: (count: number) => void) {
    const missing = [] as string[];
    const members = [] as string[];

    for (const id of ids) {
        if (GuildMemberStore.isMember(guild.id, id))
            members.push(id);
        else
            missing.push(id);
    }

    // Used for side effects (rerender on member request success)
    useStateFromStores(
        [GuildMemberStore],
        () => GuildMemberStore.getMemberIds(guild.id),
        null,
        (old, curr) => old.length === curr.length
    );

    useEffect(() => {
        if (!fetched[type] && missing.length) {
            fetched[type] = true;
            FluxDispatcher.dispatch({
                type: "GUILD_MEMBERS_REQUEST",
                guildIds: [guild.id],
                userIds: missing
            });
        }
    }, []);

    useEffect(() => setCount(members.length), [members.length]);

    return (
        <ScrollerThin fade className={cl("scroller")}>
            {members.map(id =>
                <FriendRow
                    key={id}
                    user={UserStore.getUser(id)}
                    status={PresenceStore.getStatus(id) || "offline"}
                    onSelect={() => openUserProfile(id)}
                    onContextMenu={() => { }}
                />
            )}
        </ScrollerThin>
    );
}
