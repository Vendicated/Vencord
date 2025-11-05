/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import { ModalCloseButton, ModalContent, ModalHeader, ModalRoot, ModalSize } from "@utils/modal";
import { findByPropsLazy } from "@webpack";
import { Avatar, Button, ChannelStore, MessageStore, React, Text, UserStore } from "@webpack/common";

const cl = classNameFactory("vc-boo-");

function formatMessageDate(timestamp: string | Date): string {
    const date = new Date(timestamp);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const year = String(date.getFullYear()).slice(-2);
    return `${month}/${day}/${year}`;
}

const SelectedChannelActionCreators = findByPropsLazy("selectPrivateChannel");

interface GhostedUsersModalProps {
    modalProps: any;
    ghostedChannels: string[];
    onClose: () => void;
    onClearGhost: (channelId: string) => void;
}

export function GhostedUsersModal({ modalProps, ghostedChannels: initialChannels, onClose, onClearGhost }: GhostedUsersModalProps) {
    const [ghostedChannels, setGhostedChannels] = React.useState(initialChannels);

    const handleChannelClick = (channelId: string) => {
        const channel = ChannelStore.getChannel(channelId);
        if (channel) {
            SelectedChannelActionCreators.selectPrivateChannel(channelId);
            onClose();
        }
    };

    const handleClearClick = (e: React.MouseEvent, channelId: string) => {
        e.stopPropagation();
        onClearGhost(channelId);
        // update local state to remove the cleared channel
        setGhostedChannels(prev => prev.filter(id => id !== channelId));
    };

    return (
        <ModalRoot {...modalProps} size={ModalSize.MEDIUM}>
            <ModalHeader>
                <Text
                    variant="heading-lg/semibold"
                    style={{ flexGrow: 1 }}
                >
                    Ghosted Users ({ghostedChannels.length})
                </Text>
                <ModalCloseButton onClick={onClose} />
            </ModalHeader>
            <ModalContent>
                <div style={{ padding: "16px 0" }}>
                    {ghostedChannels.length === 0 ? (
                        <Text variant="text-md/normal">No ghosts here!</Text>
                    ) : (
                        ghostedChannels.map(channelId => {
                            const channel = ChannelStore.getChannel(channelId);
                            if (!channel) return null;

                            const lastMessage = MessageStore.getMessages(channelId)?.last();
                            const lastMessageDate = lastMessage?.timestamp ? formatMessageDate(lastMessage.timestamp) : "";

                            const isGroupDM = channel.recipients?.length > 1;
                            let displayName: string;
                            let avatarSrc: string;

                            if (isGroupDM && lastMessage) {
                                // group dms show the last sender
                                const lastSender = UserStore.getUser(lastMessage.author.id);
                                displayName = lastSender?.username || "Unknown User";
                                avatarSrc = lastSender?.getAvatarURL(undefined, 128, true) || "";
                            } else {
                                // logic for one on one dms
                                const recipientId = channel.recipients?.[0];
                                const user = UserStore.getUser(recipientId);
                                displayName = user?.username || "Unknown User";
                                avatarSrc = user?.getAvatarURL(undefined, 128, true) || "";
                            }

                            return (
                                <div
                                    key={channelId}
                                    onClick={() => handleChannelClick(channelId)}
                                    className={cl("ghosted-entry")}
                                >
                                    <Avatar
                                        src={avatarSrc}
                                        size="SIZE_40"
                                        aria-label={displayName}
                                    />
                                    <div className={cl("user-info")}>
                                        <Text variant="text-md/normal">
                                            {displayName}
                                        </Text>
                                        {lastMessageDate && (
                                            <Text variant="text-xs/normal" style={{ color: "var(--text-muted)" }}>
                                                {lastMessageDate}
                                            </Text>
                                        )}
                                    </div>
                                    <Button
                                        size={Button.Sizes.SMALL}
                                        color={Button.Colors.PRIMARY}
                                        onClick={e => handleClearClick(e, channelId)}
                                    >
                                        Clear
                                    </Button>
                                </div>
                            );
                        })
                    )}
                </div>
            </ModalContent>
        </ModalRoot>
    );
}
