/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Flex } from "@components/Flex";
import { Switch } from "@components/Switch";
import { useForceUpdater } from "@utils/react";
import { findByPropsLazy } from "@webpack";
import { Clickable, Forms, GuildMemberStore, GuildStore, Menu, Popout, RelationshipStore, useEffect, UserStore, useState } from "@webpack/common";

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

function getDisplayableUserName(userId: string, guildId: string | null) {
    // @ts-ignore discord-types doesn't have globalName
    const { globalName, username } = UserStore.getUser(userId);
    const nickname = guildId ? GuildMemberStore.getNick(guildId, userId) : RelationshipStore.getNickname(userId);

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
    ids: Set<string>,
    rawIds: string[],
    guildId: string | null,
    getDisplayableName: (userId: string, guildId: string | null) => string,
    all: boolean,
    setAll: (value: boolean) => void,
}) {
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
                {rawIds.map(userId => {
                    return <Menu.MenuCheckboxItem
                        id={`vc-allowed-mentions-${title}-flyer-${userId}`}
                        label={getDisplayableName(userId, guildId)}
                        disabled={
                            /*
                                API allows only 100, athough do not disable
                                already checked ids because that would cause a
                                soft lock in the menu
                            */
                            all || (ids.size >= 100 && !ids.has(userId))
                        }
                        checked={ids.has(userId)}
                        action={() => {
                            ids.has(userId) ? ids.delete(userId) : ids.add(userId);
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
