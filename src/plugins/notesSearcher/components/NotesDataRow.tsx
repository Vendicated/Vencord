/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import { openPrivateChannel, openUserProfile } from "@utils/discord";
import { copyWithToast } from "@utils/misc";
import { Alerts, Avatar, Button, ContextMenuApi, Menu, React, Text, TextArea, Tooltip, useState } from "@webpack/common";

import { updateNote } from "../data";
import { UsersCache } from "../types";
import { DeleteIcon, PopupIcon, RefreshIcon, SaveIcon } from "./Icons";
import { LoadingSpinner } from "./LoadingSpinner";

const cl = classNameFactory("vc-notes-searcher-modal-");

export default ({ userId, userNotes: userNotesArg, refreshNotesData, usersCache }: {
    userId: string;
    userNotes: string;
    refreshNotesData(): void;
    usersCache: UsersCache;
}) => {
    let userCache = usersCache.get(userId);

    const pending = !userCache;

    userCache ??= {
        id: userId,
        globalName: "Loading...",
        username: "Loading...",
        avatar: "https://discord.com/assets/0048cbfdd0b3ef186d22.png",
    };

    const [userNotes, setUserNotes] = useState(userNotesArg);

    return (
        <div
            className={cl("user")}
            style={{
                width: "100%",
                height: "80px",
                display: "flex",
                flexDirection: "row",
                justifyContent: "flex-start",
                alignItems: "center",
                backgroundColor: "var(--background-secondary)",
                borderRadius: "12px",
                boxSizing: "border-box",
            }}
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
                            action={() => copyWithToast(userCache!.id)}
                        />
                        {
                            !pending &&
                            (
                                <>
                                    <Menu.MenuItem
                                        id={cl("copy-user-globalname")}
                                        label="Copy Global Name"
                                        action={() => copyWithToast(userCache!.globalName ?? userCache!.username)}
                                    />
                                    <Menu.MenuItem
                                        id={cl("copy-user-username")}
                                        label="Copy Username"
                                        action={() => copyWithToast(userCache!.username)}
                                    />
                                    <Menu.MenuItem
                                        id={cl("copy-user-avatar")}
                                        label="Copy Avatar URL"
                                        action={() => copyWithToast(userCache!.avatar)}
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
                        src={userCache.avatar}
                    />
            }
            <div className={cl("user-info")} style={{
                minWidth: "50px",
                maxWidth: "275px",
                width: "100%",
            }}>
                <Text className={cl("user-info-globalname")} variant="text-lg/bold" style={{
                    textOverflow: "ellipsis",
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    color: "#fff"
                }}>{userCache.globalName}</Text>
                <Text className={cl("user-info-username")} variant="text-md/normal" style={{
                    textOverflow: "ellipsis",
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    color: "#d3d3d3"
                }}>{userCache.username}</Text>
                <Text className={cl("user-info-id")} variant="text-md/normal" style={{
                    textOverflow: "ellipsis",
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    color: "#989898"
                }}>{userCache.id}</Text>
            </div>
            <div className={cl("user-notes-container")} style={{
                display: "grid",
                gridTemplateColumns: "calc(100% - 86px) min-content",
                alignItems: "center",
                justifyContent: "flex-end",
                flexGrow: "1",
                paddingRight: "8px",
                gap: "8px",
            }}>
                <TextArea
                    className={cl("user-text-area")}
                    style={{
                        width: "100%",
                        height: "100%",
                    }}
                    placeholder="Click to add a note"
                    value={userNotes}
                    onChange={setUserNotes}
                    spellCheck={false}
                />
                <div className={cl("user-actions")} style={{
                    display: "grid",
                    gridTemplateColumns: "auto auto",
                    gridTemplateRows: "auto auto",
                    gap: "3px",
                    aspectRatio: "1 / 1",
                    height: "auto",
                    boxSizing: "border-box",
                    overflow: "visible !important",
                }}>
                    <Tooltip text={"Save"}>
                        {({ onMouseLeave, onMouseEnter }) => (
                            <Button
                                className={cl("user-actions-save")}
                                size={Button.Sizes.NONE}
                                color={Button.Colors.GREEN}
                                style={{ width: "32px", height: "32px" }}
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
                                style={{ width: "32px", height: "32px" }}
                                onClick={() => {
                                    Alerts.show({
                                        title: "Delete Notes",
                                        body: `Are you sure you want to delete notes for ${pending ? userId : `${userCache!.globalName} (${userId})`}?`,
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
                                style={{ width: "32px", height: "32px" }}
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
                                style={{ width: "32px", height: "32px" }}
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
};
