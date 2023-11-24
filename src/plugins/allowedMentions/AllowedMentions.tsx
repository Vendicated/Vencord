/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./AllowedMentions.css";

import { Flex } from "@components/Flex";
import { isNonNullish } from "@utils/guards";
import { useForceUpdater } from "@utils/react";
import { findByPropsLazy } from "@webpack";
import { Clickable, Forms, GuildMemberStore, GuildStore, Menu, Popout as DiscordPopout, RelationshipStore, TextInput, useEffect, UserStore, useState } from "@webpack/common";
import { Channel } from "discord-types/general";
import { CSSProperties, ReactNode } from "react";

export type AllowedMentionsParsables = "everyone" | "users" | "roles";

export interface AllowedMentions {
    parse: Set<AllowedMentionsParsables>;
    users?: Set<string>;
    roles?: Set<string>;
    meta: {
        hasEveryone: boolean;
        userIds: Set<string>;
        roleIds: Set<string>;
        tooManyUsers: boolean;
        tooManyRoles: boolean;
    };
}

export interface EditAttachments {
    attachments: File[];
}

export interface AllowedMentionsProps {
    mentions: AllowedMentions,
    channel: Channel;
    trailingSeparator?: boolean;
}

const replyClasses = findByPropsLazy("replyBar", "replyLabel", "separator");
export const AllowedMentionsStore = {
    store: new Map<string, AllowedMentions>(),
    callbacks: new Map<string, (mentions: AllowedMentions) => void>,
    get(channelId: string) {
        return this.store.get(channelId);
    },
    set(channelId: string, mentions: AllowedMentions, dispatch: boolean) {
        this.store.set(channelId, mentions);
        dispatch && this.callbacks.get(channelId)?.(mentions);
    },
    delete(channelId: string) {
        return this.store.delete(channelId);
    },
    clear() {
        return this.store.clear();
    },
    subscribe(channelId: string, callback: (mentions: AllowedMentions) => void) {
        return this.callbacks.set(channelId, callback);
    },
    unsubscribe(channelId: string) {
        return this.callbacks.delete(channelId);
    }
};

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

function AtIcon({ width, height }: { width: number, height: number; }) {
    return <svg width={width} height={height} viewBox="0 0 24 24">
        <path
            fill="currentColor"
            d="M12 2C6.486 2 2 6.486 2 12C2 17.515 6.486 22 12 22C14.039 22 15.993
            21.398 17.652 20.259L16.521 18.611C15.195 19.519 13.633 20 12 20C7.589
            20 4 16.411 4 12C4 7.589 7.589 4 12 4C16.411 4 20 7.589 20 12V12.782C20
            14.17 19.402 15 18.4 15L18.398 15.018C18.338 15.005 18.273 15 18.209
            15H18C17.437 15 16.6 14.182 16.6 13.631V12C16.6 9.464 14.537 7.4 12
            7.4C9.463 7.4 7.4 9.463 7.4 12C7.4 14.537 9.463 16.6 12 16.6C13.234 16.6
            14.35 16.106 15.177 15.313C15.826 16.269 16.93 17 18 17L18.002
            16.981C18.064 16.994 18.129 17 18.195 17H18.4C20.552 17 22 15.306 22
            12.782V12C22 6.486 17.514 2 12 2ZM12 14.599C10.566 14.599 9.4 13.433 9.4
            11.999C9.4 10.565 10.566 9.399 12 9.399C13.434 9.399 14.6 10.565 14.6
            11.999C14.6 13.433 13.434 14.599 12 14.599Z"
        />
    </svg>;
}

function Title({ children, pointer, style }: { children: ReactNode; pointer?: boolean; style?: CSSProperties; }) {
    return <Forms.FormTitle style={{ margin: 0, cursor: pointer ? "pointer" : "default", ...style }}>{children}</Forms.FormTitle>;
}

function TitleSwitch({ state, setState, children }: { state: boolean, setState: (value: boolean) => void; children: ReactNode; }) {
    return <Clickable onClick={() => setState(!state)}>
        <Title
            style={{ ...(state ? { color: "var(--text-link)" } : {}), display: "flex", gap: "0.2rem", userSelect: "none" }}
            pointer
        >
            {children}
        </Title>
    </Clickable>;
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
                    checked={all}
                    action={() => {
                        // If all are selected, deselect them,
                        // otherwise select the remaining ones.
                        if (ids.size === rawIds.size) {
                            ids.clear();
                            setAll(false);
                            update();
                        } else {
                            rawIds.forEach(id => ids.add(id));
                            setAll(true);
                            update();
                        }
                    }}
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
                            checked={all || ids.has(object.id)}
                            action={() => {
                                all || ids.has(object.id) ? ids.delete(object.id) : ids.add(object.id);
                                setAll(ids.size === rawIds.size);
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
    const [users, setUsers] = useState(new Set(mentions.users));
    const [roles, setRoles] = useState(new Set(mentions.users));
    const [everyone, setEveryone] = useState(mentions.parse.has("everyone"));
    const [allUsers, setAllUsers] = useState(users.size === mentions.meta.userIds.size);
    const [allRoles, setAllRoles] = useState(roles.size === mentions.meta.roleIds.size);

    useEffect(() => {
        AllowedMentionsStore.subscribe(
            channel.id,
            mentions => {
                allUsers && mentions.users && setUsers(new Set(mentions.users));
                allRoles && mentions.roles && setRoles(new Set(mentions.roles));
            }
        );

        return () => { AllowedMentionsStore.unsubscribe(channel.id); };
    });

    useEffect(() => {
        AllowedMentionsStore.set(
            channel.id,
            {
                parse: new Set(
                    [
                        everyone && "everyone",
                        allUsers && "users",
                        allRoles && "roles"
                    ].filter(v => v) as AllowedMentionsParsables[]
                ),
                users: allUsers || users.size === 0 ? undefined : users,
                roles: allRoles || roles.size === 0 ? undefined : roles,
                meta: {
                    ...mentions.meta,
                    tooManyUsers: users.size > 100,
                    tooManyRoles: roles.size > 100,
                }
            },
            false
        );
    }, [
        mentions,
        everyone,
        allUsers,
        allRoles,
        users,
        roles,
    ]);

    const [shouldShowUsersPopout, setShouldShowUsersPopout] = useState(false);
    const [shouldShowRolesPopout, setShouldShowRolesPopout] = useState(false);
    const update = useForceUpdater();

    const displayEveryone = mentions.meta.hasEveryone;
    const displayUserIds = mentions.meta.userIds.size > 0;
    const displayRoleIds = mentions.meta.roleIds.size > 0;

    return <Flex style={{ gap: "1rem", alignItems: "center" }}>
        {displayEveryone && <>
            <TitleSwitch state={everyone} setState={setEveryone}>
                <AtIcon width={16} height={16} />
                everyone /
                <AtIcon width={16} height={16} />
                here
            </TitleSwitch>
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
        {trailingSeparator && (displayEveryone || displayUserIds || displayRoleIds) && <Separator />}
    </Flex>;
}
