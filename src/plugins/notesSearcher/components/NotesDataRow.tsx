/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import { openPrivateChannel, openUserProfile } from "@utils/discord";
import { copyWithToast } from "@utils/misc";
import { LazyComponent, useAwaiter } from "@utils/react";
import { Alerts, Avatar, Button, ContextMenuApi, Menu, React, Text, TextArea, Tooltip, UserUtils, useState } from "@webpack/common";

import { updateNote, usersCache } from "../data";
import { DeleteIcon, PopupIcon, RefreshIcon, SaveIcon } from "./Icons";
import { LoadingSpinner } from "./LoadingSpinner";

const cl = classNameFactory("vc-notes-searcher-modal-");

type UserInfo = {
    id: string;
    globalName: string;
    username: string;
    avatar: string;
};

export default LazyComponent(() => React.memo(({ userId, userNotes: userNotesArg, refreshNotesData }: {
    userId: string;
    userNotes: string;
    refreshNotesData(): void;
}) => {
    const awaitedResult = useAwaiter(async () => {
        const user = await UserUtils.getUser(userId);

        usersCache.set(userId, {
            globalName: (user as any).globalName ?? user.username,
            username: user.username,
        });

        return {
            id: userId,
            globalName: (user as any).globalName ?? user.username,
            username: user.username,
            avatar: user.getAvatarURL(void 0, void 0, false),
        } as UserInfo;
    });

    let userInfo = awaitedResult[0];
    const pending = awaitedResult[2];

    userInfo ??= {
        id: userId,
        globalName: pending ? "Loading..." : "Unable to load",
        username: pending ? "Loading..." : "Unable to load",
        avatar: "https://discord.com/assets/0048cbfdd0b3ef186d22.png",
    } as const;

    const [userNotes, setUserNotes] = useState(userNotesArg);

    return (
        <div
            className={cl("user")}
            onContextMenu={event => {
                ContextMenuApi.openContextMenu(event, () =>
                    <Menu.Menu
                        navId={cl("user-context-menu")}
                        onClose={ContextMenuApi.closeContextMenu}
                        aria-label="User Notes Data"
                    >
                        <Menu.MenuItem
                            id={cl("open-user-profile")}
                            label="Open User Profile"
                            action={() => openUserProfile(userId)}
                        />
                        <Menu.MenuItem
                            id={cl("open-user-chat")}
                            label="Open User Chat"
                            action={() => openPrivateChannel(userId)}
                        />
                        <Menu.MenuItem
                            id={cl("copy-user-id")}
                            label="Copy ID"
                            action={() => copyWithToast(userInfo!.id)}
                        />
                        {
                            !pending &&
                            (
                                <>
                                    <Menu.MenuItem
                                        id={cl("copy-user-globalname")}
                                        label="Copy Global Name"
                                        action={() => copyWithToast(userInfo!.globalName)}
                                    />
                                    <Menu.MenuItem
                                        id={cl("copy-user-username")}
                                        label="Copy Username"
                                        action={() => copyWithToast(userInfo!.username)}
                                    />
                                    <Menu.MenuItem
                                        id={cl("copy-user-avatar")}
                                        label="Copy Avatar URL"
                                        action={() => copyWithToast(userInfo!.avatar)}
                                    />
                                </>
                            )
                        }
                        <Menu.MenuItem
                            id={cl("copy-user-notes")}
                            label="Copy Notes"
                            action={() => copyWithToast(userNotes)}
                        />
                    </Menu.Menu>
                );
            }}
        >
            {
                pending ? <LoadingSpinner /> :
                    <Avatar
                        className={cl("user-avatar")}
                        size="SIZE_56"
                        src={userInfo.avatar}
                    />
            }
            <div className={cl("user-info")}>
                <Text className={cl("user-info-globalname")} variant="text-lg/bold">{userInfo.globalName}</Text>
                <Text className={cl("user-info-username")} variant="text-md/normal">{userInfo.username}</Text>
                <Text className={cl("user-info-id")} variant="text-md/normal">{userInfo.id}</Text>
            </div>
            <div className={cl("user-notes-container")}>
                <TextArea
                    className={cl("user-text-area")}
                    placeholder="Click to add a note"
                    value={userNotes}
                    onChange={setUserNotes}
                    spellCheck={false}
                />
                <div className={cl("user-actions")}>
                    <Tooltip text={"Save"}>
                        {({ onMouseLeave, onMouseEnter }) => (
                            <Button
                                className={cl("user-actions-save")}
                                size={Button.Sizes.NONE}
                                color={Button.Colors.GREEN}
                                onClick={() => {
                                    updateNote(userId, userNotes);
                                    refreshNotesData();
                                }}
                                onMouseLeave={onMouseLeave}
                                onMouseEnter={onMouseEnter}
                            >
                                <SaveIcon />
                            </Button>
                        )}
                    </Tooltip>
                    <Tooltip text={"Delete"}>
                        {({ onMouseLeave, onMouseEnter }) => (
                            <Button
                                className={cl("user-actions-delete")}
                                size={Button.Sizes.NONE}
                                color={Button.Colors.RED}
                                onClick={() => {
                                    Alerts.show({
                                        title: "Delete Notes",
                                        body: `Are you sure you want to delete notes for ${pending ? userId : `${userInfo!.globalName} (${userId})`}?`,
                                        confirmColor: Button.Colors.RED,
                                        confirmText: "Delete",
                                        cancelText: "Cancel",
                                        onConfirm: () => {
                                            updateNote(userId, "");
                                            refreshNotesData();
                                        },
                                    });
                                }}
                                onMouseLeave={onMouseLeave}
                                onMouseEnter={onMouseEnter}
                            >
                                <DeleteIcon />
                            </Button>
                        )}
                    </Tooltip>
                    <Tooltip text={"Undo text area changes"}>
                        {({ onMouseLeave, onMouseEnter }) => (
                            <Button
                                className={cl("user-actions-refresh")}
                                size={Button.Sizes.NONE}
                                color={Button.Colors.LINK}
                                onClick={() => setUserNotes(userNotesArg)}
                                onMouseLeave={onMouseLeave}
                                onMouseEnter={onMouseEnter}
                            >
                                <RefreshIcon />
                            </Button>
                        )}
                    </Tooltip>
                    <Tooltip text={"Open User Profile"}>
                        {({ onMouseLeave, onMouseEnter }) => (
                            <Button
                                className={cl("user-actions-popup")}
                                size={Button.Sizes.NONE}
                                color={Button.Colors.PRIMARY}
                                onClick={async () => {
                                    openUserProfile(userId);
                                }}
                                onMouseLeave={onMouseLeave}
                                onMouseEnter={onMouseEnter}
                            >
                                <PopupIcon />
                            </Button>
                        )}
                    </Tooltip>
                </div>
            </div>
        </div>
    );
}));
