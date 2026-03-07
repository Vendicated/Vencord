/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BaseText } from "@components/BaseText";
import { Card } from "@components/Card";
import { HeadingPrimary } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { SettingsTab, wrapTab } from "@components/settings";
import { classNameFactory } from "@utils/css";
import { copyWithToast, openUserProfile } from "@utils/discord";
import { Avatar, Clickable, ContextMenuApi, Menu, React, TextInput, Tooltip, UserStore } from "@webpack/common";

import { Data, IStorageUser } from "./data";

const cl = classNameFactory("vc-i-remember-you-");

function tooltipText(user: IStorageUser) {
    const { updatedAt } = user.extra || {};
    const updatedAtContent = updatedAt ? new Intl.DateTimeFormat().format(updatedAt) : null;
    return `${user.username ?? user.tag}, updated at ${updatedAtContent}`;
}

function UsersCollectionRows({ usersCollection }: { usersCollection: Data["usersCollection"]; }) {
    if (Object.keys(usersCollection).length === 0) return (
        <BaseText>
            It's empty right now
        </BaseText>
    );

    return (
        <>
            {Object.entries(usersCollection)
                .map(([_key, { users, name }]) => ({ name, users: Object.values(users) }))
                .sort((a, b) => b.users.length - a.users.length)
                .map(({ name, users }) => (
                    <aside key={name}>
                        <div className={cl("header-container")}>
                            <HeadingPrimary className={cl("header-name")}>{name}</HeadingPrimary>
                            <div className={cl("header-btns")}>
                                {users.map(u => <UserRow key={u.id} user={u} />)}
                            </div>
                        </div>
                    </aside>
                ))}
        </>
    );
}

function UserRow({ user, allowOwner = true }: { user: IStorageUser, allowOwner?: boolean; }) {
    return (
        <div key={user.id} className={cl("user-row")}>
            <div className={cl("user")}>
                <Clickable onClick={() => openUserProfile(user.id)}>
                    <span className={cl("user-avatar")}>
                        <Avatar src={user.iconURL} size="SIZE_24" />
                    </span>
                </Clickable>
                <div className={cl("user-tooltip")}>
                    <Tooltip text={tooltipText(user)}>
                        {props =>
                            <Paragraph {...props} className={cl("user-username")}>
                                {user.tag} {allowOwner && user.extra?.isOwner && "(owner)"}
                            </Paragraph>
                        }
                    </Tooltip>
                    <span
                        className={cl("user-id")}
                        onContextMenu={e => {
                            e.preventDefault();
                            const userObj = UserStore.getUser(user.id);
                            if (userObj) {
                                ContextMenuApi.openContextMenu(e, () => (
                                    <Menu.Menu
                                        navId="user-context-menu"
                                        onClose={ContextMenuApi.closeContextMenu}
                                        aria-label="User Options"
                                    >
                                        <Menu.MenuItem
                                            id="copy-user-id"
                                            label="Copy User ID"
                                            action={() => copyWithToast(user.id, "User ID copied to clipboard")}
                                        />
                                        <Menu.MenuItem
                                            id="view-profile"
                                            label="View Profile"
                                            action={() => openUserProfile(user.id)}
                                        />
                                    </Menu.Menu>
                                ));
                            }
                        }}
                    >
                        <Clickable onClick={() => copyWithToast(user.id, "User ID copied to clipboard")}>
                            <Paragraph>
                                {user.id}
                            </Paragraph>
                        </Clickable>
                    </span>
                </div>
            </div>
        </div>
    );
}

function SearchElement({ usersCollection }: { usersCollection: Data["usersCollection"]; }) {
    const [current, setCurrent] = React.useState("");
    const list = Object.values(usersCollection).flatMap(col => Object.values(col.users)) as IStorageUser[];

    return (
        <section className={cl("search")}>
            <TextInput placeholder="Filter by tag, username" name="Filter" onChange={setCurrent} />
            {current && (
                <div className={cl("search-user")}>
                    {list.filter(user => user.tag.includes(current) || user.username.includes(current))
                        .map(user => <UserRow key={user.id} user={user} allowOwner={false} />)}
                </div>
            )}
        </section>
    );
}

export function DataUI({ usersCollection }: { usersCollection: Data["usersCollection"]; }) {
    return (
        <SettingsTab>
            <Card>
                <Paragraph>
                    Provides a list of users you have mentioned or replied to, or those who own the servers you belong to (owner*), or are members of your guild
                </Paragraph>
                <SearchElement usersCollection={usersCollection} />
            </Card>
            <div className={cl("rows")}>
                <UsersCollectionRows usersCollection={usersCollection} />
            </div>
        </SettingsTab>
    );
}

export default wrapTab(DataUI, "IRememberYouTab");
