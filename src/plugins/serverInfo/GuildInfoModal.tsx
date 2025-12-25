/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { classNameFactory } from "@utils/css";
import { getGuildAcronym, openImageModal, openUserProfile } from "@utils/discord";
import { classes } from "@utils/misc";
import { ModalRoot, ModalSize, openModal } from "@utils/modal";
import { useAwaiter } from "@utils/react";
import { Guild, User } from "@vencord/discord-types";
import { findByPropsLazy, findComponentByCodeLazy } from "@webpack";
import { FluxDispatcher, GuildChannelStore, GuildMemberStore, GuildRoleStore, GuildStore, IconUtils, Parser, PresenceStore, RelationshipStore, ScrollerThin, SnowflakeUtils, TabBar, Timestamp, useEffect, UserStore, UserUtils, useState, useStateFromStores } from "@webpack/common";

import { settings } from ".";

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
    IgnoredUsers,
    MutualMembers
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
    const [mutualMembersCount, setMutualMembersCount] = useState<number>();

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
                    <Heading className={cl("name")}>{guild.name}</Heading>
                    {guild.description && <Paragraph>{guild.description}</Paragraph>}
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
                    <div style={{ textAlign: "center" }}>
                        <div>
                            Server Info
                        </div>
                    </div>
                </TabBar.Item>
                <TabBar.Item
                    className={cl("tab", { selected: currentTab === Tabs.Friends })}
                    id={Tabs.Friends}
                >
                    <div style={{ textAlign: "center" }}>
                        <div>
                            Friends
                        </div>
                        {friendCount !== undefined ? ` (${friendCount})` : ""}
                    </div>
                </TabBar.Item>
                <TabBar.Item
                    className={cl("tab", { selected: currentTab === Tabs.MutualMembers })}
                    id={Tabs.MutualMembers}
                >
                    <div style={{ textAlign: "center" }}>
                        <div>
                            Mutual Users
                        </div>{mutualMembersCount !== undefined ? ` (${mutualMembersCount})` : ""}
                    </div>
                </TabBar.Item>
                <TabBar.Item
                    className={cl("tab", { selected: currentTab === Tabs.BlockedUsers })}
                    id={Tabs.BlockedUsers}
                >
                    <div style={{ textAlign: "center" }}>
                        <div>
                            Blocked Users
                        </div>
                        {blockedCount !== undefined ? ` (${blockedCount})` : ""}
                    </div>
                </TabBar.Item>
                <TabBar.Item
                    className={cl("tab", { selected: currentTab === Tabs.IgnoredUsers })}
                    id={Tabs.IgnoredUsers}
                >
                    <div style={{ textAlign: "center" }}>
                        <div>
                            Ignored Users
                        </div>
                        {ignoredCount !== undefined ? `(${ignoredCount})` : ""}

                    </div>
                </TabBar.Item>
            </TabBar>

            <div className={cl("tab-content")}>
                {currentTab === Tabs.ServerInfo && <ServerInfoTab guild={guild} />}
                {currentTab === Tabs.Friends && <FriendsTab guild={guild} setCount={setFriendCount} />}
                {currentTab === Tabs.MutualMembers && <MutualMembersTab guild={guild} setCount={setMutualMembersCount} />}
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
                    <Heading>{name}</Heading>
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

    const sortedMembers = members
        .map(id => UserStore.getUser(id) as User & { globalName: string; })
        .sort(
            (a, b) => {
                switch (settings.store.sorting) {
                    case "username":
                        return a.username.localeCompare(b.username);
                    case "displayname":
                        return a?.globalName?.localeCompare(b?.globalName || b.username)
                            || a.username.localeCompare(b?.globalName || b.username);
                    default:
                        return 0;
                }
            }
        );

    return (
        <ScrollerThin fade className={cl("scroller")}>
            {sortedMembers.map(user => (
                <FriendRow
                    key={user.id}
                    user={user}
                    status={PresenceStore.getStatus(user.id) || "offline"}
                    onSelect={() => openUserProfile(user.id)}
                    onContextMenu={() => { }}
                />
            ))}
        </ScrollerThin>
    );
}

interface MemberWithMutuals {
    id: string;
    mutualCount: number;
    mutualGuilds: Array<{
        guild: Guild;
        iconUrl: string | null;
    }>;
}

function getMutualGuilds(id: string): MemberWithMutuals {
    const mutualGuilds: Array<{ guild: Guild; iconUrl: string | null; }> = [];

    for (const guild of Object.values(GuildStore.getGuilds())) {
        if (GuildMemberStore.isMember(guild.id, id)) {
            const iconUrl = guild.icon
                ? IconUtils.getGuildIconURL({
                    id: guild.id,
                    icon: guild.icon,
                    canAnimate: true,
                    size: 20
                }) ?? null
                : null;

            mutualGuilds.push({ guild, iconUrl });
        }
    }

    return {
        id,
        mutualCount: mutualGuilds.length,
        mutualGuilds
    };
}

function MutualServerIcons({ member }: { member: MemberWithMutuals; }) {
    const MAX_ICONS = 3;
    const { mutualGuilds, mutualCount } = member;

    return (
        <div className={cl("mutual-guilds")}>
            {mutualGuilds.slice(0, MAX_ICONS).map(({ guild, iconUrl }) => (
                <div key={guild.id} className={cl("guild-icon")} role="img" aria-label={guild.name}>
                    {iconUrl ? (
                        <img src={iconUrl} alt="" />
                    ) : (
                        <div className={cl("guild-acronym")}>{getGuildAcronym(guild)}</div>
                    )}
                </div>
            ))}
            {mutualCount > MAX_ICONS && (
                <div className={cl("guild-count")}>
                    +{mutualCount - MAX_ICONS}
                </div>
            )}
        </div>
    );
}

function MutualMembersTab({ guild, setCount }: RelationshipProps) {
    const [members, setMembers] = useState<MemberWithMutuals[]>([]);
    const currentUserId = UserStore.getCurrentUser().id;

    useEffect(() => {
        const guildMembers = GuildMemberStore.getMemberIds(guild.id);
        const membersWithMutuals = guildMembers
            .map(id => getMutualGuilds(id))
            // dont show yourself and members that are only in this server
            .filter(member => member.mutualCount > 1 && member.id !== currentUserId);

        // sort by mutual server count (descending)
        membersWithMutuals.sort((a, b) => b.mutualCount - a.mutualCount);

        setMembers(membersWithMutuals);
        setCount(membersWithMutuals.length);
    }, [guild.id]);

    return (
        <ScrollerThin fade className={cl("scroller")}>
            {members
                .map(member => {
                    const user = UserStore.getUser(member.id) as User & { globalName: string; };
                    return { ...member, user };
                })
                .filter(Boolean)
                .sort((a, b) => {
                    switch (settings.store.sorting) {
                        case "username":
                            return a.user.username.localeCompare(b.user.username);
                        case "displayname":
                            return a.user?.globalName?.localeCompare(b.user?.globalName || b.user.username)
                                || a.user.username.localeCompare(b.user?.globalName || b.user.username);
                        default:
                            return 0;
                    }
                })
                .map(member => (
                    <div
                        className={cl("member-row")}
                        key={member.id}
                        onClick={() => openUserProfile(member.id)}
                    >
                        <div className={cl("member-content")}>
                            <FriendRow
                                user={member.user}
                                status={PresenceStore.getStatus(member.id) || "offline"}
                                onSelect={() => { }}
                                onContextMenu={() => { }}
                                mutualGuilds={member.mutualCount}
                            />
                        </div>
                        <div className={cl("member-icons")} onClick={e => e.stopPropagation()}>
                            <MutualServerIcons member={member} />
                        </div>
                    </div>
                ))}
        </ScrollerThin>
    );
}
