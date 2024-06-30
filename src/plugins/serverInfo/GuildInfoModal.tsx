/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { classNameFactory } from "@api/Styles";
import { openImageModal, openUserProfile } from "@utils/discord";
import { classes } from "@utils/misc";
import { ModalRoot, ModalSize, openModal } from "@utils/modal";
import { useAwaiter } from "@utils/react";
import { GuildChannelType, type GuildRecord, type UserRecord } from "@vencord/discord-types";
import { findByPropsLazy, findComponentByCodeLazy } from "@webpack";
import { FluxDispatcher, Forms, GuildChannelStore, GuildMemberStore, GuildStore, IconUtils, MarkupUtils, PresenceStore, RelationshipStore, ScrollerThin, SnowflakeUtils, TabBar, Timestamp, useEffect, UserActionCreators, UserStore, useState, useStateFromStores } from "@webpack/common";

const IconClasses: Record<string, string> = findByPropsLazy("icon", "acronym", "childWrapper");
const FriendRow = findComponentByCodeLazy(".listName,discriminatorClass");

const cl = classNameFactory("vc-gp-");

export function openGuildInfoModal(guild: GuildRecord) {
    openModal(props => (
        <ModalRoot {...props} size={ModalSize.MEDIUM}>
            <GuildInfoModal guild={guild} />
        </ModalRoot>
    ));
}

const enum Tabs {
    ServerInfo,
    Friends,
    BlockedUsers
}

interface GuildProps {
    guild: GuildRecord;
}

interface RelationshipProps extends GuildProps {
    setCount(count: number): void;
}

const fetched = {
    friends: false,
    blocked: false
};

function renderTimestamp(timestamp: number) {
    return (
        <Timestamp timestamp={new Date(timestamp)} />
    );
}

function GuildInfoModal({ guild }: GuildProps) {
    const [friendCount, setFriendCount] = useState<number>();
    const [blockedCount, setBlockedCount] = useState<number>();

    useEffect(() => {
        fetched.friends = false;
        fetched.blocked = false;
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
                    onClick={() => { openImageModal(bannerUrl); }}
                />
            )}

            <div className={cl("header")}>
                {iconUrl
                    ? <img
                        src={iconUrl}
                        alt=""
                        onClick={() => { openImageModal(iconUrl); }}
                    />
                    : <div aria-hidden className={classes(IconClasses.childWrapper, IconClasses.acronym)}>{guild.acronym}</div>
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
            </TabBar>

            <div className={cl("tab-content")}>
                {currentTab === Tabs.ServerInfo && <ServerInfoTab guild={guild} />}
                {currentTab === Tabs.Friends && <FriendsTab guild={guild} setCount={setFriendCount} />}
                {currentTab === Tabs.BlockedUsers && <BlockedUsersTab guild={guild} setCount={setBlockedCount} />}
            </div>
        </div>
    );
}


function Owner(guildId: string, owner: UserRecord) {
    const ownerAvatarUrl = owner.getAvatarURL(guildId, undefined, true);

    return (
        <div className={cl("owner")}>
            <img src={ownerAvatarUrl} alt="" onClick={() => { openImageModal(ownerAvatarUrl); }} />
            {MarkupUtils.parse(`<@${owner.id}>`)}
        </div>
    );
}

const VerificationLevelName = ["None", "Low", "Medium", "High", "Highest"];

function ServerInfoTab({ guild }: GuildProps) {
    const owner = guild.ownerId
        ? useAwaiter(() => UserActionCreators.getUser(guild.ownerId!), {
            deps: [guild.ownerId],
            fallbackValue: null
        })[0]
        : null;

    const guildChannels = GuildChannelStore.getChannels(guild.id);

    const fields = {
        "Server Owner": owner ? Owner(guild.id, owner) : "Loading...",
        "Created At": renderTimestamp(SnowflakeUtils.extractTimestamp(guild.id)),
        "Joined At": renderTimestamp(guild.joinedAt.getTime()),
        "Vanity Link": guild.vanityURLCode ? (<a>{`discord.gg/${guild.vanityURLCode}`}</a>) : "-", // Making the anchor href valid would cause Discord to reload
        "Preferred Locale": guild.preferredLocale || "-",
        "Verification Level": VerificationLevelName[guild.verificationLevel] ?? "?",
        "Nitro Boosts": `${guild.premiumSubscriberCount} (Level ${guild.premiumTier})`,
        "Channels": guildChannels[GuildChannelType.SELECTABLE].length + guildChannels[GuildChannelType.VOCAL].length, // exclude channel categories
        "Roles": Object.keys(GuildStore.getRoles(guild.id)).length - 1, // - @everyone
    };

    return (
        <div className={cl("info")}>
            {Object.entries(fields).map(([name, node]) =>
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
    const blockedUserIds = Object.keys(RelationshipStore.getRelationships())
        .filter(userId => RelationshipStore.isBlocked(userId));
    return UserList("blocked", guild, blockedUserIds, setCount);
}

function UserList(type: "friends" | "blocked", guild: GuildRecord, userIds: string[], setCount: (count: number) => void) {
    const members: string[] = [];
    const missing: string[] = [];

    for (const userId of userIds) {
        if (GuildMemberStore.isMember(guild.id, userId))
            members.push(userId);
        else
            missing.push(userId);
    }

    // Used for side effects (rerender on member request success)
    useStateFromStores(
        [GuildMemberStore],
        () => GuildMemberStore.getMemberIds(guild.id),
        null,
        (prev, curr) => prev.length === curr.length
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

    useEffect(() => { setCount(members.length); }, [members.length]);

    return (
        <ScrollerThin fade className={cl("scroller")}>
            {members.map(userId =>
                <FriendRow
                    user={UserStore.getUser(userId)}
                    status={PresenceStore.getStatus(userId)}
                    onSelect={() => { openUserProfile(userId); }}
                    onContextMenu={() => { }}
                />
            )}
        </ScrollerThin>
    );
}
