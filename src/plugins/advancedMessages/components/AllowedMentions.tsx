/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./AllowedMentions.css";

import { Flex } from "@components/Flex";
import { Switch } from "@components/Switch";
import { isNonNullish } from "@utils/guards";
import { proxyLazy } from "@utils/lazy";
import { useForceUpdater } from "@utils/react";
import { findByPropsLazy, wreq } from "@webpack";
import { Clickable, Forms, GuildMemberStore, GuildStore, Menu, Popout as DiscordPopout, React, RelationshipStore, TextInput, useEffect, UserStore, useState } from "@webpack/common";
import { Channel } from "discord-types/general";
import { CSSProperties, ReactNode } from "react";

import { AllowedMentions, AllowedMentionsParsables, EditAllowedMentionsStore, SendAllowedMentionsStore } from "../stores";

export interface AllowedMentionsProps {
    mentions: AllowedMentions,
    channel: Channel;
    trailingSeparator?: boolean;
}

const replyClasses = findByPropsLazy("replyBar", "replyLabel", "separator");
const AtIcon = proxyLazy(() => {
    for (const id in wreq.m) {
        const module = wreq.m[id].toString();
        if (module.includes(".replaceIcon") && module.includes(".AtIcon")) {
            return wreq(id as any).default;
        }
    }
});

function getDisplayableUserNameParts(userId: string, guildId: string | null) {
    // @ts-ignore discord-types doesn't have globalName
    const { globalName, username } = UserStore.getUser(userId) ?? {};
    const nickname = guildId ? GuildMemberStore.getNick(guildId, userId) : RelationshipStore.getNickname(userId);

    return [nickname, globalName as string, username];
}

function getDisplayableUserName(userId: string, guildId: string | null) {
    const [nickname, globalName, username] = getDisplayableUserNameParts(userId, guildId);

    // Displayed name priority
    // Guild/Friend Nickname > Global Name > Username

    // User id if not cached in any stores
    return nickname ?? globalName ?? username ?? userId;
}

function getDisplayableRoleName(roleId: string, guildId: string | null) {
    // You *can* mention roles in DMs but is it really worth adding the UI for
    // it in DMs
    const role = guildId ? Object.values(GuildStore.getGuild(guildId).roles).find(r => r.id === roleId)?.name : undefined;

    // Role id if not cached or not from current guild
    return role ?? roleId;
}

function fuzzySearch(searchQuery: string, searchString: string) {
    let searchIndex = 0;
    let score = 0;

    for (let i = 0; i < searchString.length; i++) {
        if (searchString[i] === searchQuery[searchIndex]) {
            score++;
            searchIndex++;
        } else {
            score--;
        }

        if (searchIndex === searchQuery.length) {
            return score;
        }
    }

    return null;
}

function Title({ children, pointer, style }: { children: ReactNode; pointer?: boolean; style?: CSSProperties; }) {
    return <Forms.FormTitle style={{ margin: 0, cursor: pointer ? "pointer" : "default", ...style }}>{children}</Forms.FormTitle>;
}

function Separator() {
    return <div className={replyClasses.separator}></div>;
}

function Popout({
    title,
    shouldShow,
    setShouldShow,
    update,
    fuzzy,
    ids,
    rawIds,
    guildId,
    getDisplayableName,
    all,
    setAll,
}: {
    title: string,
    shouldShow: boolean,
    setShouldShow: (value: boolean) => void,
    update: () => void,
    fuzzy: (search: string, id: string) => number | null,
    ids: Set<string>,
    rawIds: Set<string>,
    guildId: string | null,
    getDisplayableName: (userId: string, guildId: string | null) => string | undefined,
    all: boolean,
    setAll: (value: boolean) => void,
}) {
    const [search, setSearch] = useState(undefined as undefined | string);

    return <DiscordPopout
        animation={DiscordPopout.Animation.SCALE}
        align="center"
        position="top"
        shouldShow={shouldShow}
        onRequestClose={() => setShouldShow(false)}
        renderPopout={() => {
            return <Menu.Menu
                navId={`vc-allowed-mentions-${title}-popout`}
                onClose={() => setShouldShow(false)}
                className="vc-allowed-mentions-popout-menu"
            >
                <Menu.MenuCheckboxItem
                    id={`vc-allowed-mentions-${title}-popout-all`}
                    label="All"
                    disabled={ids.size > 0}
                    checked={all}
                    action={() => setAll(!all)}
                />
                <Menu.MenuSeparator />
                <Menu.MenuItem
                    label="Search"
                    id={`vc-allowed-mentions-${title}-popout-search`}
                    render={() => {
                        return <TextInput
                            placeholder={`Search ${title.toLowerCase()}`}
                            type="text"
                            maxLength={32}
                            role="combobox"
                            value={search}
                            disabled={all}
                            onChange={value => setSearch(value.trim())}
                            style={{ margin: "2px 0", padding: "6px 8px" }}
                            onKeyDown={e => {
                                if (e.key === "Escape") {
                                    setSearch(undefined);
                                } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                                    // Some random event listener is blocking
                                    // left & right arrow keys so you can't
                                    // navigate the text with arrow keys unless
                                    // you do e.stopPropogation
                                    e.stopPropagation();
                                } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                                    // Pressing up/down arrow keys leads to a messy
                                    // UI state, blurring the text input fixes it.
                                    // (kinda)
                                    e.currentTarget.blur();
                                }
                            }}
                        />;
                    }}
                />
                {(isNonNullish(search) ?
                    Array.from(rawIds).map(id => ({
                        score: fuzzy(search, id),
                        name: getDisplayableName(id, guildId),
                        id: id
                    })
                    ).filter(o => isNonNullish(o.score))
                        .sort((a, b) => b.score! - a.score!)
                    : Array.from(rawIds).map(id => ({
                        score: 0,
                        name: getDisplayableName(id, guildId),
                        id: id
                    }))
                )
                    .map(object => {
                        return <Menu.MenuCheckboxItem
                            id={`vc-allowed-mentions-${title}-popout-${object.id}`}
                            label={object.name!}
                            disabled={
                                /*
                                    API allows only 100, athough do not disable
                                    already checked ids because that would cause a
                                    hard lock in the menu
                                */
                                all || (ids.size >= 100 && !ids.has(object.id))
                            }
                            checked={ids.has(object.id)}
                            action={() => {
                                ids.has(object.id) ? ids.delete(object.id) : ids.add(object.id);
                                update();
                            }}
                        />;
                    })}
            </Menu.Menu>;
        }}
    >
        {
            (_, { isShown }) => {
                return <Clickable onClick={() => setShouldShow(!isShown)}>
                    <Title pointer>{title}</Title>
                </Clickable>;
            }
        }
    </DiscordPopout>;
}

export function AllowedMentionsBar({ mentions, channel, trailingSeparator }: AllowedMentionsProps) {
    const store = mentions.meta.isEdit ? EditAllowedMentionsStore : SendAllowedMentionsStore;

    const [everyone, setEveryone] = useState(mentions.parse.has("everyone"));
    const [allUsers, setAllUsers] = useState(mentions.parse.has("users"));
    const [allRoles, setAllRoles] = useState(mentions.parse.has("roles"));
    const [repliedUser, setRepliedUser] = useState(mentions.repliedUser);
    const [users] = useState(mentions.users ?? new Set<string>());
    const [roles] = useState(mentions.roles ?? new Set<string>());

    useEffect(() => {
        store.set(channel.id, {
            parse: new Set(
                (
                    [
                        [everyone, "everyone"],
                        [allUsers, "users"],
                        [allRoles, "roles"]
                    ] satisfies [boolean, AllowedMentionsParsables][]
                )
                    .filter(([b]) => b)
                    .map(([, v]) => v)
            ),
            users: allUsers ? undefined : users,
            roles: allRoles ? undefined : roles,
            repliedUser,
            meta: mentions.meta
        });
    }, [
        mentions,
        everyone,
        allUsers,
        allRoles,
        repliedUser,
        users,
        roles,
    ]);

    const [shouldShowUsersPopout, setShouldShowUsersPopout] = useState(false);
    const [shouldShowRolesPopout, setShouldShowRolesPopout] = useState(false);
    const update = useForceUpdater();

    const displayEveryone = mentions.meta.hasEveryone;
    const displayReply = mentions.meta.isReply;
    const displayUserIds = mentions.meta.userIds.size > 0;
    const displayRoleIds = mentions.meta.roleIds.size > 0;

    return <Flex style={{ gap: "1rem", alignItems: "center" }}>
        {displayEveryone && <>
            <Title>@everyone / @here</Title>
            <Switch checked={everyone} onChange={setEveryone} />
        </>}
        {displayUserIds && <>
            {displayEveryone && <Separator />}
            <Popout
                title="Users"
                shouldShow={shouldShowUsersPopout}
                setShouldShow={setShouldShowUsersPopout}
                update={update}
                fuzzy={(search, userId) => {
                    const samples = getDisplayableUserNameParts(userId, channel.guild_id)
                        .filter(isNonNullish)
                        .map(name => fuzzySearch(search, name))
                        .filter(isNonNullish) as number[];
                    return samples.length > 0 ? Math.max(...samples) : null;
                }}
                ids={users}
                rawIds={mentions.meta.userIds}
                guildId={channel.guild_id}
                getDisplayableName={getDisplayableUserName}
                all={allUsers}
                setAll={setAllUsers}
            />
        </>}
        {displayRoleIds && <>
            {(displayEveryone || displayUserIds) && <Separator />}
            <Popout
                title="Roles"
                shouldShow={shouldShowRolesPopout}
                setShouldShow={setShouldShowRolesPopout}
                update={update}
                fuzzy={(search, roleId) => fuzzySearch(search, getDisplayableRoleName(roleId, channel.guild_id).toLowerCase())}
                ids={roles}
                rawIds={mentions.meta.roleIds}
                guildId={channel.guild_id}
                getDisplayableName={getDisplayableRoleName}
                all={allRoles}
                setAll={setAllRoles}
            />
        </>}
        {displayReply && <>
            {(displayEveryone || displayUserIds || displayRoleIds) && <Separator />}
            <Clickable
                onClick={() => setRepliedUser(!repliedUser)}
            >
                <Title
                    style={{ color: repliedUser ? "var(--text-link)" : "inherit", display: "flex", gap: "0.2rem", userSelect: "none" }}
                    pointer
                >
                    <AtIcon width="16" height="16" />
                    {repliedUser ? "ON" : "OFF"}
                </Title>
            </Clickable>
        </>}
        {trailingSeparator && (displayEveryone || displayUserIds || displayRoleIds) && <Separator />}
    </Flex>;
}
