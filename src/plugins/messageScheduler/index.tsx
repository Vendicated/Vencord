/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChatBarButton } from "@api/ChatButtons";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { getCurrentChannel, sendMessage } from "@utils/discord";
import { closeModal, ModalContent, ModalHeader, ModalRoot, ModalSize, openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { Button, Forms, Menu, Popout, React, TextInput } from "@webpack/common";

const scheduledMessages: {
    id: string;
    message: string;
    sendAt: number;
    channelId: string;
}[] = [];

function ActualMessages({ onClose }: { onClose: () => void; }) {
    const [_, forceUpdate] = React.useState(0);

    React.useEffect(() => {
        const interval = setInterval(() => {
            forceUpdate(prev => prev + 1);
        }, 1000);

        return () => clearInterval(interval);
    }, []);
    return (
        <Menu.Menu
            navId="vc-scheduled-messages"
            onClose={onClose}
        >
            {scheduledMessages.length === 0 && (
                <Menu.MenuItem
                    id="vc-no-scheduled"
                    label="No scheduled messages"
                    action={() => { }}
                    disabled
                />
            )}

            {scheduledMessages.map(msg => {
                const timeLeft = Math.max(0, Math.floor((msg.sendAt - Date.now()) / 1000));
                const label = `${msg.channelId} — in ${timeLeft}s`;

                return (
                    <Menu.MenuGroup
                        label={label}
                        key={`scheduled-${msg.id}`}
                    >
                        <Menu.MenuItem
                            id={`scheduled-msg-${msg.id}`}
                            label={`Message: ${msg.message}`}
                            disabled
                            action={() => { }}
                        />
                        <Menu.MenuItem
                            id={`cancel-msg-${msg.id}`}
                            label="Cancel"
                            color="danger"
                            action={() => {
                                const index = scheduledMessages.findIndex(m => m.id === msg.id);
                                if (index !== -1) {
                                    scheduledMessages.splice(index, 1);
                                    forceUpdate(x => x + 1);
                                }
                            }}
                        />
                    </Menu.MenuGroup>
                );
            })}
        </Menu.Menu>
    );
}

const Listen = () => {
    const buttonRef = React.useRef<HTMLDivElement>(null);
    const [showMenu, setShowMenu] = React.useState(false);
    const handleClick = () => {
        openSchedulerModa2l();
        setShowMenu(false);
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        setShowMenu(true);
    };

    return (
        <Popout
            targetElementRef={buttonRef}
            shouldShow={showMenu}
            onRequestClose={() => setShowMenu(false)}
            position="bottom"
            align="right"
            animation={Popout.Animation.NONE}
            renderPopout={() => <ActualMessages onClose={() => setShowMenu(false)} />}
        >
            {() => (
                <div ref={buttonRef} style={{ display: "inline-block" }}>
                    <ChatBarButton
                        tooltip="Schedule Message (Right-click for scheduled messages)"
                        onClick={handleClick}
                        onContextMenu={handleContextMenu}
                    >
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            style={{ scale: "1.2" }}
                        >
                            <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm1-13h-2v6h6v-2h-4z" />
                        </svg>
                    </ChatBarButton>
                </div>
            )}
        </Popout>
    );
};

function Scheduler(props: any) {
    const [message, setMessage] = React.useState("");
    const [selectedDate, setSelectedDate] = React.useState("");
    const [selectedChannelId, setSelectedChannelId] = React.useState("");

    return (
        <ErrorBoundary>
            <ModalRoot {...props} size={ModalSize.MEDIUM}>
                <ModalHeader>
                    <Forms.FormTitle tag="h5">Schedule a Message</Forms.FormTitle>
                </ModalHeader>
                <ModalContent>
                    <TextInput
                        placeholder="Message"
                        value={message}
                        onChange={setMessage}
                    />
                    <input
                        type="datetime-local"
                        value={selectedDate}
                        onChange={e => setSelectedDate(e.target.value)}
                        style={{
                            width: "95%",
                            padding: "8px 10px",
                            margin: "10px 0",
                            borderRadius: "4px",
                            backgroundColor: "#0000",
                            color: "#fff",
                            fontSize: "14px",
                            outline: "none"
                        }}
                    />

                    <TextInput
                        placeholder="Channel Id"
                        value={selectedChannelId}
                        onChange={setSelectedChannelId}
                    />

                    <Button
                        color={Button.Colors.TRANSPARENT}
                        onClick={() => {
                            const currentChannel = getCurrentChannel();
                            if (currentChannel) setSelectedChannelId(currentChannel.id);
                        }}
                    >
                        Use Current Channel
                    </Button>

                    <Button
                        color={Button.Colors.TRANSPARENT}
                        onClick={() => {
                            if (!message || !selectedDate || !selectedChannelId) return;

                            const sendAt = new Date(selectedDate).getTime();
                            const id = crypto.randomUUID();
                            scheduledMessages.push({
                                id,
                                message,
                                sendAt,
                                channelId: selectedChannelId
                            });

                            closeModal(props.transitionState?.modalKey);
                        }}
                    >
                        Schedule
                    </Button>
                </ModalContent>
            </ModalRoot>
        </ErrorBoundary>
    );
}

function openSchedulerModa2l() {
    openModal(props => <Scheduler {...props} />);
}

setInterval(() => {
    const now = Date.now();

    for (const msg of [...scheduledMessages]) {
        if (msg.sendAt <= now) {
            sendMessage(msg.channelId, { content: msg.message });
            scheduledMessages.splice(scheduledMessages.indexOf(msg), 1);
        }
    }
}, 1000);

export default definePlugin({
    name: "MessageScheduler",
    description: "Allows you to schedule whenever to send a message into a specific channel using channel id's. Shows an icon on the message bar and right clicking it shows you the scheduled messages.",
    authors: [Devs.crimson],
    renderChatBarButton: () => <Listen />
});
