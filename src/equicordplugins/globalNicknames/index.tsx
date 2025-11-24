/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { DataStore } from "@api/index";
import { definePluginSettings } from "@api/Settings";
import { Button } from "@components/Button";
import ErrorBoundary from "@components/ErrorBoundary";
import { Heading } from "@components/Heading";
import { EquicordDevs } from "@utils/constants";
import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, openModal } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";
import { Message, User } from "@vencord/discord-types";
import { findComponentByCodeLazy } from "@webpack";
import { Menu, React, TextInput, UserStore } from "@webpack/common";

const UserBoxIcon = findComponentByCodeLazy("0-3-3H5Zm10 6a3");

type NicknamesData = Record<string, string>;

let nicknames: NicknamesData = {};

const settings = definePluginSettings({
    enableMessages: {
        type: OptionType.BOOLEAN,
        description: "Show global nicknames in chat messages.",
        default: true,
        restartNeeded: true
    },
    enableMemberList: {
        type: OptionType.BOOLEAN,
        description: "Show global nicknames in the member list.",
        default: true,
        restartNeeded: true
    },
    enableVoiceChannels: {
        type: OptionType.BOOLEAN,
        description: "Show global nicknames in voice channels.",
        default: true,
        restartNeeded: true
    },
    enableTypingIndicator: {
        type: OptionType.BOOLEAN,
        description: "Show global nicknames in the typing indicator.",
        default: true,
        restartNeeded: true
    }
});

function NicknameModal({ modalProps, user }: { modalProps: ModalProps; user: User; }) {
    const [value, setValue] = React.useState(nicknames[user.id] ?? "");

    return (
        <ModalRoot {...modalProps}>
            <ModalHeader>
                <Heading tag="h2" style={{ flexGrow: 1, margin: 0 }}>
                    Change Nickname
                </Heading>
                <ModalCloseButton onClick={modalProps.onClose} />
            </ModalHeader>
            <ModalContent>
                <div style={{ marginBottom: 20 }}>
                    <Heading tag="h3" style={{ marginBottom: 8, fontSize: "14px", fontWeight: 600 }}>
                        Nickname
                    </Heading>
                    <TextInput
                        value={value}
                        onChange={setValue}
                        placeholder={user.globalName ?? user.username}
                        style={{ width: "100%" }}
                    />
                </div>
            </ModalContent>
            <ModalFooter>
                <Button
                    variant="primary"
                    onClick={async () => {
                        const trimmed = value.trim();
                        if (trimmed) {
                            nicknames[user.id] = trimmed;
                        } else {
                            delete nicknames[user.id];
                        }
                        await DataStore.set("GlobalNicknames", nicknames);
                        modalProps.onClose();
                    }}
                >
                    Save
                </Button>
                <Button
                    variant="secondary"
                    style={{ marginRight: "8px" }}
                    onClick={modalProps.onClose}
                >
                    Cancel
                </Button>
            </ModalFooter>
        </ModalRoot>
    );
}

const userContextPatch: NavContextMenuPatchCallback = (children, { user }) => {
    if (!user) return;

    const currentUser = UserStore.getCurrentUser();
    if (!currentUser || user.id === currentUser.id) return;

    children.push(
        <Menu.MenuSeparator />,
        nicknames[user.id] ? (
            <Menu.MenuItem
                id="remove-nickname"
                label="Remove Nickname"
                color="danger"
                icon={UserBoxIcon}
                action={async () => {
                    delete nicknames[user.id];
                    await DataStore.set("GlobalNicknames", nicknames);
                }}
            />
        ) : (
            <Menu.MenuItem
                id="change-nickname"
                label="Change Nickname"
                icon={UserBoxIcon}
                action={() => openModal(props => (
                    <ErrorBoundary>
                        <NicknameModal modalProps={props} user={user} />
                    </ErrorBoundary>
                ))}
            />
        )
    );
};

export default definePlugin({
    name: "GlobalNicknames",
    description: "Set custom nicknames for any user globally.",
    authors: [EquicordDevs.Prism],
    dependencies: ["ContextMenuAPI"],
    settings,

    patches: [
        {
            find: '="SYSTEM_TAG"',
            predicate: () => settings.store.enableMessages,
            replacement: {
                match: /children:(.+?),"data-text":/,
                replace: 'children:$self.patchMessageName(arguments[0])??($1),"data-text":'
            }
        },
        {
            find: "let{colorRoleName:",
            predicate: () => settings.store.enableMemberList,
            replacement: {
                match: /,name:(null!=\i\?\i:\i),colorStrings/,
                replace: ",name:$self.patchName($1,arguments[0].user)||($1),colorStrings"
            }
        },
        {
            find: ",connectUserDragSource:",
            predicate: () => settings.store.enableVoiceChannels,
            replacement: {
                match: /nick:(\i),collapsed/,
                replace: "nick:$self.patchName($1,arguments[0].user)||$1,collapsed"
            }
        },
        {
            find: "#{intl::THREE_USERS_TYPING}",
            predicate: () => settings.store.enableTypingIndicator,
            replacement: {
                match: /(\i\.\i\.getName\(\i\.guild_id,\i\.id),(\i)\)\)/,
                replace: "$1,$self.patchTypingName($2)))"
            }
        }
    ],

    async start() {
        const data = await DataStore.get<NicknamesData>("GlobalNicknames");
        nicknames = data ?? {};
    },

    patchMessageName(props: { message: Message; }): string | null {
        const userId = props?.message?.author?.id;
        return userId ? nicknames[userId] ?? null : null;
    },

    patchName(_: string, user: User): string | null {
        return nicknames[user.id] ?? null;
    },

    patchTypingName(user: User): User {
        const nickname = nicknames[user.id];
        if (!nickname) return user;
        return { ...user, globalName: nickname, username: nickname } as User;
    },

    contextMenus: {
        "user-context": userContextPatch
    }
});
