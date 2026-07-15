/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { classNameFactory } from "@utils/css";
import { getGuildAcronym, openImageModal, openUserProfile } from "@utils/discord";
import { classes } from "@utils/misc";
import { useAwaiter } from "@utils/react";
import { Guild, RenderModalProps, User } from "@vencord/discord-types";
import { findComponentByCodeLazy, findCssClassesLazy } from "@webpack";
import { Button, FluxDispatcher, Forms, GuildChannelStore, GuildMemberStore, GuildRoleStore, GuildStore, IconUtils, Modal, openModal, Parser, PresenceStore, RelationshipStore, ScrollerThin, SnowflakeUtils, TabBar, Timestamp, useEffect, useMemo, UserStore, UserUtils, useState, useStateFromStores } from "@webpack/common";

const IconClasses = findCssClassesLazy("icon", "acronym", "childWrapper");
const FriendRow = findComponentByCodeLazy("discriminatorClass:", ".isMobileOnline", "avatarSrc:");

const cl = classNameFactory("vc-gp-");

export function openGuildInfoModal(guild: Guild) {
    openModal(props => <GuildInfoModal guild={guild} modalProps={props} />);
}

const enum Tabs {
    ServerInfo,
    Friends,
    Overlap,
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

const requestSize = 100;
const dispatchDelay = 120;
const settleDelay = 1500;

function renderTimestamp(timestamp: number) {
    return (
        <Timestamp timestamp={new Date(timestamp)} />
    );
}

function GuildInfoModal({ guild, modalProps }: GuildProps & { modalProps: RenderModalProps; }) {
    const [friendCount, setFriendCount] = useState<number>();
    const [overlapCount, setOverlapCount] = useState<number>();
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
        <Modal
            {...modalProps}
            size="lg"
            title={
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
            }
        >
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
                    className={cl("tab", { selected: currentTab === Tabs.Overlap })}
                    id={Tabs.Overlap}
                >
                    Overlap{overlapCount !== undefined ? ` (${overlapCount})` : ""}
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
                {currentTab === Tabs.Overlap && <OverlapTab guild={guild} setCount={setOverlapCount} />}
                {currentTab === Tabs.BlockedUsers && <BlockedUsersTab guild={guild} setCount={setBlockedCount} />}
                {currentTab === Tabs.IgnoredUsers && <IgnoredUserTab guild={guild} setCount={setIgnoredCount} />}
            </div>
        </Modal>
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

function chunk<T>(arr: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
}

function computeOverlap(guildId: string, memberIds: string[], otherGuildIds: string[]) {
    const me = UserStore.getCurrentUser();
    const results: { id: string; count: number; }[] = [];
    for (const id of memberIds) {
        // ignoring self and bots
        if (id === me?.id) continue;
        const user = UserStore.getUser(id);
        if (user?.bot) continue; 

        let count = 1; // the current guild itself
        for (const otherId of otherGuildIds) {
            if (GuildMemberStore.getMember(otherId, id)) count++;
        }
        if (count > 1) results.push({ id, count });
    }
    results.sort((a, b) => b.count - a.count);
    return results;
}

function sameOverlap(a: { id: string; count: number; }[], b: { id: string; count: number; }[]) {
    return a.length === b.length && a.every((v, i) => v.id === b[i].id && v.count === b[i].count);
}

type CheckStatus = "idle" | "checking" | "done";

function OverlapTab({ guild, setCount }: RelationshipProps) {
    const otherGuildIds = useMemo(
        () => Object.keys(GuildStore.getGuilds()).filter(id => id !== guild.id),
        [guild.id]
    );

    const memberIds = useStateFromStores(
        [GuildMemberStore],
        () => GuildMemberStore.getMemberIds(guild.id),
        null,
        (old, curr) => old.length === curr.length
    );

    const [status, setStatus] = useState<CheckStatus>("idle");
    const [progress, setProgress] = useState(0);

    const overlap = useStateFromStores(
        [GuildMemberStore],
        () => computeOverlap(guild.id, memberIds, otherGuildIds),
        [memberIds, otherGuildIds],
        sameOverlap
    );

    useEffect(() => setCount(overlap.length), [overlap.length]);

    useEffect(() => {
        setStatus("idle");
        setProgress(0);
    }, [guild.id]);

    async function runCheck() {
        if (status === "checking" || memberIds.length === 0 || otherGuildIds.length === 0) return;

        setStatus("checking");
        setProgress(0);

        const batches = otherGuildIds.flatMap(otherId =>
            chunk(memberIds, requestSize).map(userIds => ({ guildId: otherId, userIds }))
        );
        const total = batches.length;
        let received = 0;

        const onChunk = (data: any) => {
            const responseGuildId = data?.guildId ?? data?.guild_id;
            if (batches.some(b => b.guildId === responseGuildId)) {
                received = Math.min(received + 1, total);
                setProgress(Math.round((received / total) * 100));
            }
        };
        FluxDispatcher.subscribe("GUILD_MEMBERS_CHUNK", onChunk);

        for (const { guildId: otherId, userIds } of batches) {
            FluxDispatcher.dispatch({
                type: "GUILD_MEMBERS_REQUEST",
                guildIds: [otherId],
                userIds
            });
            await new Promise(r => setTimeout(r, dispatchDelay));
        }

        await new Promise(r => setTimeout(r, settleDelay));

        FluxDispatcher.unsubscribe("GUILD_MEMBERS_CHUNK", onChunk);
        setProgress(100);
        setStatus("done");
    }

    return (
        <div className={cl("overlap-wrapper")}>
            <div className={cl("overlap-controls")}>
                <Button
                    size={Button.Sizes.SMALL}
                    disabled={status === "checking" || memberIds.length === 0}
                    onClick={runCheck}
                >
                    {status === "checking"
                        ? `Checking… ${progress}%`
                        : status === "done"
                            ? "Check Again"
                            : "Check Now"}
                </Button>

                {status === "checking" && (
                    <div className={cl("overlap-progress-track")}>
                        <div className={cl("overlap-progress-fill")} style={{ width: `${progress}%` }} />
                    </div>
                )}

                <Forms.FormText className={cl("overlap-hint")}>
                    Checks the {memberIds.length} members currently loaded for this server against your {otherGuildIds.length} other servers.
                </Forms.FormText>
            </div>

            {status === "idle" && (
                <Forms.FormText className={cl("overlap-empty")}>Click "Check Now" to look for overlap.</Forms.FormText>
            )}

            {status !== "idle" && overlap.length === 0 && (
                <Forms.FormText className={cl("overlap-empty")}>
                    {status === "checking" ? "Checking…" : "No overlap found among the members currently loaded for this server."}
                </Forms.FormText>
            )}

            {overlap.length > 0 && (
                <ScrollerThin fade className={cl("scroller")}>
                    {overlap.map(({ id, count }) =>
                        <div key={id} className={cl("overlap-row")}>
                            <FriendRow
                                user={UserStore.getUser(id)}
                                status={PresenceStore.getStatus(id) || "offline"}
                                onSelect={() => openUserProfile(id)}
                                onContextMenu={() => { }}
                            />
                            <span className={cl("overlap-badge")}>{count} servers</span>
                        </div>
                    )}
                </ScrollerThin>
            )}
        </div>
    );
}
