/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Flex } from "@components/Flex";
import { Switch } from "@components/Switch";
import { isNonNullish } from "@utils/guards";
import { useForceUpdater } from "@utils/react";
import { findByPropsLazy } from "@webpack";
import { Clickable, Forms, GuildMemberStore, GuildStore, Menu, Popout, RelationshipStore, TextInput, useEffect, UserStore, useState } from "@webpack/common";

export interface Mentions {
    hasEveryone: boolean,
    everyone: boolean,
    userIds: string[],
    roleIds: string[],
    allUsers: boolean,
    allRoles: boolean,
    editSource?: {
        users: Set<string>,
        roles: Set<string>;
    },
}

export interface AllowedMentionsProps {
    mentions: Mentions;
    channel: any;
    trailingSeparator?: boolean;
    setMentionsForChannel: (channelId: string, mentions: Mentions) => void;
}

const replyClasses = findByPropsLazy("replyBar", "replyLabel", "separator");

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

    return nickname ?? globalName ?? username;
}

function getDisplayableRoleName(roleId: string, guildId: string | null) {
    // You *can* mention roles in DMs but is it really worth adding the UI for
    // it in DMs
    const role = guildId ? Object.values(GuildStore.getGuild(guildId).roles).find(r => r.id === roleId)?.name : undefined;

    return role ?? "@deleted-role";
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

function Title({ children, pointer }: { children: string; pointer?: boolean; }) {
    return <Forms.FormTitle style={{ margin: 0, cursor: pointer ? "pointer" : "default" }}>{children}</Forms.FormTitle>;
}

function Separator() {
    return <div className={replyClasses.separator}></div>;
}

function Flyer({
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
    rawIds: string[],
    guildId: string | null,
    getDisplayableName: (userId: string, guildId: string | null) => string | undefined,
    all: boolean,
    setAll: (value: boolean) => void,
}) {
    const [search, setSearch] = useState(undefined as undefined | string);

    return <Popout
        animation={Popout.Animation.SCALE}
        align="center"
        position="top"
        shouldShow={shouldShow}
        onRequestClose={() => setShouldShow(false)}
        renderPopout={() => {
            return <Menu.Menu
                navId={`vc-allowed-mentions-${title}-flyer`}
                onClose={() => setShouldShow(false)}
            >
                <Menu.MenuCheckboxItem
                    id={`vc-allowed-mentions-${title}-flyer-all`}
                    label="All"
                    disabled={ids.size > 0}
                    checked={all}
                    action={() => setAll(!all)}
                />
                <Menu.MenuSeparator />
                <Menu.MenuItem
                    label="Search"
                    id={`vc-allowed-mentions-${title}-flyer-search`}
                    render={() => {
                        return <TextInput
                            placeholder={`Search ${title.toLowerCase()}`}
                            value={search}
                            onChange={value => setSearch(value.trim())}
                        />;
                    }}
                />
                {(isNonNullish(search) ?
                    rawIds.map(id => ({
                        score: fuzzy(search, id),
                        name: getDisplayableName(id, guildId),
                        id: id
                    })
                    ).filter(o => isNonNullish(o.score))
                        .sort((a, b) => b.score! - a.score!)
                    : rawIds.map(id => ({
                        score: 0,
                        name: getDisplayableName(id, guildId),
                        id: id
                    }))
                )
                    .filter(o => isNonNullish(o.name))
                    .map(object => {
                        return <Menu.MenuCheckboxItem
                            id={`vc-allowed-mentions-${title}-flyer-${object.id}`}
                            label={object.name!}
                            disabled={
                                /*
                                    API allows only 100, athough do not disable
                                    already checked ids because that would cause a
                                    soft lock in the menu
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
    </Popout>;
}

export function AllowedMentionsBar({ mentions, channel, trailingSeparator, setMentionsForChannel }: AllowedMentionsProps) {
    const [everyone, setEveryone] = useState(mentions.everyone);
    // When editing a message, it can (potentially) aready have mentioned users/roles
    const [userIds, _setUserIds] = useState(mentions.editSource ? mentions.editSource.users : new Set<string>());
    const [roleIds, _setRoleIds] = useState(mentions.editSource ? mentions.editSource.roles : new Set<string>());
    const [allUsers, setAllUsers] = useState(mentions.allUsers);
    const [allRoles, setAllRoles] = useState(mentions.allRoles);

    useEffect(() => {
        setMentionsForChannel(channel.id, {
            hasEveryone: mentions.hasEveryone,
            everyone,
            userIds: Array.from(userIds),
            roleIds: Array.from(roleIds),
            allUsers,
            allRoles,
            editSource: mentions.editSource,
        });
    }, [
        mentions,
        everyone,
        userIds,
        roleIds,
        allUsers,
        allRoles,
    ]);

    const [shouldShowUsersFlyer, setShouldShowUsersFlyer] = useState(false);
    const [shouldShowRolesFlyer, setShouldShowRolesFlyer] = useState(false);
    const update = useForceUpdater();

    const displayEveryone = mentions.hasEveryone;
    const displayUserIds = mentions.userIds.length > 0;
    const displayRoleIds = mentions.roleIds.length > 0;

    return <Flex style={{ gap: "1rem", alignItems: "center" }}>
        {displayEveryone && <>
            <Title>@everyone / @here</Title>
            <Switch checked={everyone} onChange={setEveryone} />
        </>}
        {displayUserIds && <>
            {displayEveryone && <Separator />}
            <Flyer
                title="Users"
                shouldShow={shouldShowUsersFlyer}
                setShouldShow={setShouldShowUsersFlyer}
                update={update}
                fuzzy={(search, userId) => {
                    const samples = getDisplayableUserNameParts(userId, channel.guild_id)
                        .filter(isNonNullish)
                        .map(name => fuzzySearch(search, name))
                        .filter(isNonNullish) as number[];
                    return samples.length > 0 ? Math.max(...samples) : null;
                }}
                ids={userIds}
                rawIds={mentions.userIds}
                guildId={channel.guild_id}
                getDisplayableName={getDisplayableUserName}
                all={allUsers}
                setAll={setAllUsers}
            />
        </>}
        {displayRoleIds && <>
            {(displayEveryone || displayUserIds) && <Separator />}
            <Flyer
                title="Roles"
                shouldShow={shouldShowRolesFlyer}
                setShouldShow={setShouldShowRolesFlyer}
                update={update}
                fuzzy={(search, roleId) => fuzzySearch(search, getDisplayableRoleName(roleId, channel.guild_id).toLowerCase())}
                ids={roleIds}
                rawIds={mentions.roleIds}
                guildId={channel.guild_id}
                getDisplayableName={getDisplayableRoleName}
                all={allRoles}
                setAll={setAllRoles}
            />
        </>}
        {trailingSeparator && (displayEveryone || displayUserIds || displayRoleIds) && <Separator />}
    </Flex>;
}
