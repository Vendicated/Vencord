/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ModalCloseButton, ModalContent, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import {
    ChannelStore,
    Forms,
    GuildStore,
    NavigationRouter,
    Parser,
    Timestamp,
    useEffect,
    useState,
} from "@webpack/common";

import { getSavedMessages, removeSavedMessage, SavedMessage } from "./data";

function getLocationLabel(msg: SavedMessage): string {
    const channel = ChannelStore.getChannel(msg.channelId);

    if (!msg.guildId) {
        return channel?.name ? channel.name : "Direct Message";
    }

    const guild = GuildStore.getGuild(msg.guildId);
    const guildName = guild?.name ?? "Unknown Server";
    const channelName = channel?.name ? `#${channel.name}` : "unknown-channel";
    return `${guildName} / ${channelName}`;
}

function jumpToMessage(msg: SavedMessage) {
    NavigationRouter.transitionTo(
        `/channels/${msg.guildId ?? "@me"}/${msg.channelId}/${msg.messageId}`
    );
}

function SavedMessageRow({ msg, onRemoved }: { msg: SavedMessage; onRemoved: (id: string) => void; }) {
    return (
        <div className="vc-saved-messages-row">
            <div className="vc-saved-messages-row-header">
                <img
                    className="vc-saved-messages-avatar"
                    src={msg.authorAvatar}
                    alt={msg.authorName}
                    width={24}
                    height={24}
                />
                <span className="vc-saved-messages-author">{msg.authorName}</span>
                <span className="vc-saved-messages-location">{getLocationLabel(msg)}</span>
                <Timestamp timestamp={new Date(msg.timestamp)} />
            </div>

            <div className="vc-saved-messages-content">
                {Parser.parse(msg.content || "*(no text content)*")}
            </div>

            <div className="vc-saved-messages-row-actions">
                <button
                    className="vc-saved-messages-btn"
                    onClick={() => jumpToMessage(msg)}
                >
                    Jump to Message
                </button>
                <button
                    className="vc-saved-messages-btn vc-saved-messages-btn-danger"
                    onClick={async () => {
                        await removeSavedMessage(msg.messageId);
                        onRemoved(msg.messageId);
                    }}
                >
                    Remove
                </button>
            </div>
        </div>
    );
}

function SavedMessagesModalContent() {
    const [messages, setMessages] = useState<SavedMessage[] | null>(null);

    useEffect(() => {
        getSavedMessages().then(setMessages);
    }, []);

    const handleRemoved = (id: string) => {
        setMessages(prev => (prev ? prev.filter(m => m.messageId !== id) : prev));
    };

    if (messages === null) {
        return <Forms.FormText>Loading…</Forms.FormText>;
    }

    if (messages.length === 0) {
        return <Forms.FormText>You haven't saved any messages yet. Right-click a message and choose "Save Message".</Forms.FormText>;
    }

    return (
        <div className="vc-saved-messages-list">
            {messages.map(msg => (
                <SavedMessageRow key={msg.messageId} msg={msg} onRemoved={handleRemoved} />
            ))}
        </div>
    );
}

function SavedMessagesModal(props: ModalProps) {
    return (
        <ModalRoot {...props} size={ModalSize.LARGE}>
            <ModalHeader>
                <Forms.FormTitle tag="h2" style={{ flexGrow: 1 }}>Saved Messages</Forms.FormTitle>
                <ModalCloseButton onClick={props.onClose} />
            </ModalHeader>
            <ModalContent>
                <SavedMessagesModalContent />
            </ModalContent>
        </ModalRoot>
    );
}

export function openSavedMessagesModal() {
    openModal(props => <SavedMessagesModal {...props} />);
}
