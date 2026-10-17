/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import ErrorBoundary from "@components/ErrorBoundary";
import { classNameFactory } from "@utils/css";
import { RenderModalProps } from "@vencord/discord-types";
import { ChannelStore, closeModal, Modal, openModal, showToast, useState } from "@webpack/common";

import { clearAllScheduledMessages, getChannelDisplayInfo, getScheduledMessages, removeScheduledMessage } from "../utils";
import { CalendarIcon, TimerIcon } from "./Icons";

const cl = classNameFactory("vc-scheduled-msg-");

interface ViewScheduledModalProps {
    rootProps: RenderModalProps;
    close: () => void;
}

function ViewScheduledModalInner({ rootProps, close }: ViewScheduledModalProps) {
    const [messages, setMessages] = useState(getScheduledMessages());

    const handleDelete = async (id: string) => {
        await removeScheduledMessage(id);
        setMessages(getScheduledMessages());
        showToast({ text: "Scheduled message removed", variant: "success" });
    };

    const handleClearAll = async () => {
        await clearAllScheduledMessages();
        setMessages([]);
        showToast({ text: "All scheduled messages cleared", variant: "success" });
    };

    const actions = [
        {
            text: "Close",
            variant: "secondary",
            onClick: close
        }
    ];

    if (messages.length > 0) {
        actions.unshift({
            text: "Clear All",
            variant: "dangerPrimary",
            onClick: handleClearAll
        });
    }

    return (
        <Modal
            {...rootProps}
            size="md"
            title="Scheduled Messages"
            actions={actions}
        >
            {!messages.length ? (
                <div className={cl("empty-state")}>
                    <CalendarIcon width={48} height={48} />
                    <span>No scheduled messages</span>
                </div>
            ) : (
                <div className={cl("message-list")}>
                    {messages.map(msg => {
                        const { name, avatar } = getChannelDisplayInfo(msg.channelId);
                        const channel = ChannelStore.getChannel(msg.channelId);
                        if (!channel) return null;

                        const isDM = channel.isPrivate();
                        const displayContent = msg.content.length > 200
                            ? msg.content.slice(0, 200) + "..."
                            : msg.content;

                        return (
                            <div key={msg.id} className={cl("message-item")}>
                                <div className={cl("message-info")}>
                                    <div className={cl("message-header")}>
                                        {avatar && <img src={avatar} className={cl("message-avatar")} alt="" />}
                                        <span className={cl("message-channel")}>
                                            {isDM ? name : `#${name}`}
                                        </span>
                                    </div>
                                    <div className={cl("message-time")}>
                                        <TimerIcon width={14} height={14} />
                                        <span>{new Date(msg.scheduledTime).toLocaleString()}</span>
                                    </div>
                                    <div className={cl("message-content")}>{displayContent}</div>
                                </div>
                                <Button
                                    size="small"
                                    variant="dangerPrimary"
                                    onClick={() => handleDelete(msg.id)}
                                >
                                    Delete
                                </Button>
                            </div>
                        );
                    })}
                </div>
            )}
        </Modal>
    );
}

export const ViewScheduledModal = ErrorBoundary.wrap(ViewScheduledModalInner, { noop: true });

export function openViewScheduledModal(): void {
    const key = openModal(props => (
        <ViewScheduledModal rootProps={props} close={() => closeModal(key)} />
    ));
}
