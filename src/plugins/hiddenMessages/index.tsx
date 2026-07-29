/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import { Flex } from "@components/Flex";
import { FormSwitch } from "@components/FormSwitch";
import { HeadingSecondary } from "@components/Heading";
import { sendMessage } from "@utils/discord";
import definePlugin, { IconComponent } from "@utils/types";
import type { RenderModalProps } from "@vencord/discord-types";
import {
    ChannelStore,
    FluxDispatcher,
    MessageActions,
    Modal,
    openModal,
    PendingReplyStore,
    showToast,
    TextArea,
    TextInput,
    Toasts,
    useEffect,
    useState
} from "@webpack/common";

import { hasHiddenMessage, hideMessage, requiresPassword, revealMessage, selfTest } from "./crypto";

// ponytail: session tombstones match Vencord's temporary logger; persist them if logger persistence is added.
const revokedMessages = new Set<string>();
const activeUnlocks = new Map<string, () => void>();

function revokeMessage(messageId: string) {
    revokedMessages.add(messageId);
    activeUnlocks.get(messageId)?.();
    activeUnlocks.delete(messageId);
}
const LockIcon: IconComponent = ({ height = 20, width = 20, className }) => (
    <svg
        aria-hidden="true"
        className={className}
        fill="currentColor"
        height={height}
        viewBox="0 0 24 24"
        width={width}
    >
        <path d="M17 8h-1V6a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2Zm-7-2a2 2 0 1 1 4 0v2h-4v-2Zm3 10.73V18h-2v-1.27a2 2 0 1 1 2 0Z" />
    </svg>
);

function UnlockModal({ content, initialRevealed = "", messageId, modalProps }: {
    content: string;
    initialRevealed?: string;
    messageId: string;
    modalProps: RenderModalProps;
}) {
    const [password, setPassword] = useState("");
    const [revealed, setRevealed] = useState(initialRevealed);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        const close = () => {
            setRevealed("");
            modalProps.onClose();
        };
        activeUnlocks.set(messageId, close);
        return () => {
            if (activeUnlocks.get(messageId) === close) activeUnlocks.delete(messageId);
        };
    }, [messageId, modalProps.onClose]);

    async function unlock() {
        if (revokedMessages.has(messageId)) return modalProps.onClose();
        setBusy(true);
        setError("");
        try {
            const plaintext = await revealMessage(content, password);
            if (revokedMessages.has(messageId)) return modalProps.onClose();
            setRevealed(plaintext);
        } catch (e) {
            setRevealed("");
            setError((e as Error).message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <Modal
            {...modalProps}
            title={revealed ? "Hidden Message Unlocked" : "Unlock Hidden Message"}
            subtitle="The password is checked locally and is never stored or sent."
            actions={[
                { text: "Close", variant: "secondary", onClick: modalProps.onClose },
                ...revealed ? [] : [{
                    text: busy ? "Unlocking…" : "Unlock",
                    variant: "primary" as const,
                    disabled: !password || busy,
                    onClick: unlock
                }]
            ]}
        >
            <Flex flexDirection="column" gap={12}>
                {!revealed && (
                    <section>
                        <HeadingSecondary>Password</HeadingSecondary>
                        <TextInput
                            autoFocus
                            type="password"
                            value={password}
                            onChange={setPassword}
                            onKeyDown={e => e.key === "Enter" && password && !busy && unlock()}
                            placeholder="Enter password"
                        />
                    </section>
                )}
                {error && <div style={{ color: "var(--text-danger)" }}>{error}</div>}
                {revealed && (
                    <div style={{
                        background: "var(--background-secondary)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: 8,
                        color: "var(--text-normal)",
                        padding: 14,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word"
                    }}>
                        {revealed}
                    </div>
                )}
            </Flex>
        </Modal>
    );
}

async function openUnlockModal(content: string, messageId: string) {
    if (revokedMessages.has(messageId)) return;

    if (!requiresPassword(content)) {
        try {
            const revealed = await revealMessage(content);
            if (revokedMessages.has(messageId)) return;
            openModal(modalProps => (
                <UnlockModal content={content} initialRevealed={revealed} messageId={messageId} modalProps={modalProps} />
            ));
        } catch {
            showToast("Hidden message is damaged", Toasts.Type.FAILURE);
        }
        return;
    }

    openModal(modalProps => <UnlockModal content={content} messageId={messageId} modalProps={modalProps} />);
}

function ComposeModal({ channelId, modalProps }: { channelId: string; modalProps: RenderModalProps; }) {
    const [publicMessage, setPublicMessage] = useState("");
    const [hiddenMessage, setHiddenMessage] = useState("");
    const [password, setPassword] = useState("");
    const [noPassword, setNoPassword] = useState(false);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    async function send() {
        setBusy(true);
        setError("");
        try {
            const content = await hideMessage(publicMessage, hiddenMessage, noPassword ? null : password);
            if (content.length > 2000)
                throw new Error(`Encrypted message is ${content.length - 2000} characters over Discord's limit.`);

            await sendMessage(
                channelId,
                { content },
                false,
                MessageActions.getSendMessageOptionsForReply(PendingReplyStore.getPendingReply(channelId))
            );
            FluxDispatcher.dispatch({ type: "DELETE_PENDING_REPLY", channelId });
            modalProps.onClose();
            showToast("Encrypted hidden message sent", Toasts.Type.SUCCESS);
        } catch (e) {
            setError((e as Error).message || "Could not send hidden message");
        } finally {
            setBusy(false);
        }
    }

    return (
        <Modal
            {...modalProps}
            title="Send Hidden Message"
            subtitle={noPassword ? "Everyone sees the public message. Plugin users can unlock the hidden message instantly." : "Everyone sees the public message. Plugin users need your password to unlock it."}
            actions={[
                { text: "Cancel", variant: "secondary", onClick: modalProps.onClose },
                {
                    text: busy ? "Encrypting…" : "Send",
                    variant: "primary",
                    disabled: !publicMessage.trim() || !hiddenMessage.trim() || (!noPassword && !password) || busy,
                    onClick: send
                }
            ]}
        >
            <Flex flexDirection="column" gap={14}>
                <section>
                    <HeadingSecondary>Message everyone will see</HeadingSecondary>
                    <TextArea
                        autoFocus
                        autosize
                        maxLength={1900}
                        value={publicMessage}
                        onChange={setPublicMessage}
                        placeholder="Hey everyone!"
                    />
                </section>
                <section>
                    <HeadingSecondary>Hidden message</HeadingSecondary>
                    <TextArea
                        autosize
                        value={hiddenMessage}
                        onChange={setHiddenMessage}
                        placeholder="I'm hiding this message!"
                    />
                </section>
                <FormSwitch
                    title="No Password Mode"
                    description="Anyone with HiddenMessages can unlock it instantly."
                    value={noPassword}
                    onChange={setNoPassword}
                />
                {!noPassword && (
                    <section>
                        <HeadingSecondary>Password</HeadingSecondary>
                        <TextInput
                            type="password"
                            value={password}
                            onChange={setPassword}
                            placeholder="Use a long, unique password"
                        />
                    </section>
                )}
                {error && <div style={{ color: "var(--text-danger)" }}>{error}</div>}
                <div style={{ color: "var(--text-muted)", fontSize: 12 }}>
                    AES-256-GCM · {noPassword ? "embedded random key" : "PBKDF2-SHA-256"} · random nonce
                </div>
            </Flex>
        </Modal>
    );
}

const ComposeButton: ChatBarButtonFactory = ({ isAnyChat, channel }) => {
    if (!isAnyChat) return null;
    return (
        <ChatBarButton
            tooltip="Send Hidden Message"
            onClick={() => openModal(modalProps => <ComposeModal channelId={channel.id} modalProps={modalProps} />)}
            buttonProps={{ "aria-haspopup": "dialog" }}
        >
            <LockIcon />
        </ChatBarButton>
    );
};

export default definePlugin({
    name: "HiddenMessages",
    description: "Encrypt hidden text inside an otherwise normal Discord message. Credits: Marmo1133.",
    authors: [{ name: "MermoTEC", id: 839177393913856051 }],
    tags: ["Chat", "Privacy"],
    dependencies: ["MessagePopoverAPI", "ChatInputButtonAPI"],

    chatBarButton: {
        icon: LockIcon,
        render: ComposeButton
    },

    messagePopoverButton: {
        icon: LockIcon,
        render(message) {
            if (revokedMessages.has(message.id) || !hasHiddenMessage(message.content)) return null;
            const channel = ChannelStore.getChannel(message.channel_id);
            if (!channel) return null;
            return {
                label: "Unlock Hidden Message",
                icon: LockIcon,
                message,
                channel,
                onClick: () => openUnlockModal(message.content, message.id)
            };
        }
    },

    flux: {
        MESSAGE_DELETE({ id }: { id: string; }) {
            revokeMessage(id);
        },
        MESSAGE_DELETE_BULK({ ids }: { ids: string[]; }) {
            ids.forEach(revokeMessage);
        }
    },

    selfTest
});
