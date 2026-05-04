/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { Alerts, Button, Forms, Menu, MessageActions, RestAPI, showToast, TextInput, Toasts, UserStore, useEffect, useState } from "@webpack/common";

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

const MESSAGE_PAGE_SIZE = 100;
const FETCH_DELAY_MS = 250;
const DELETE_DELAY_MS = 1250;
const MAX_HISTORY_PAGES = 10000;
const MAX_RETRIES = 5;

type ChannelMessage = {
    id: string;
    channel_id?: string;
    channelId?: string;
    author?: {
        id?: string;
    };
    deleted?: boolean;
};

type LoadProgress = {
    found: number;
    pages: number;
};

type ShouldCancel = () => boolean;

let rangeStart: { channelId: string; messageId: string; } | null = null;

function isCancelled(shouldCancel?: ShouldCancel): boolean {
    return shouldCancel?.() === true;
}

function getCurrentUserId(): string | null {
    const user = UserStore.getCurrentUser();
    return user?.id != null ? String(user.id) : null;
}

function compareIds(a: string, b: string): number {
    try {
        const left = BigInt(a);
        const right = BigInt(b);

        if (left === right) return 0;
        return left > right ? 1 : -1;
    } catch {
        return a.localeCompare(b);
    }
}

function getRangeBounds(a: string, b: string): [string, string] {
    return compareIds(a, b) <= 0 ? [a, b] : [b, a];
}

function isIdInRange(id: string, low: string, high: string): boolean {
    return compareIds(id, low) >= 0 && compareIds(id, high) <= 0;
}

function nextSnowflake(id: string): string {
    try {
        return (BigInt(id) + 1n).toString();
    } catch {
        return id;
    }
}

function sortMessages(messages: ChannelMessage[]): ChannelMessage[] {
    return [...messages].sort((a, b) => compareIds(a.id, b.id));
}

function isOwnUndeletedMessage(message: ChannelMessage, userId: string, channelId: string): boolean {
    if (!message?.id || message.deleted) return false;
    if (String(message.author?.id) !== userId) return false;

    const messageChannelId = message.channel_id ?? message.channelId;
    return messageChannelId == null || String(messageChannelId) === channelId;
}

function normalizeMessagesResponse(response: any): ChannelMessage[] {
    const body = Array.isArray(response)
        ? response
        : Array.isArray(response?.body)
            ? response.body
            : Array.isArray(response?.messages)
                ? response.messages
                : [];

    return body
        .filter((message: any) => message?.id != null)
        .map((message: any) => ({
            ...message,
            id: String(message.id),
            channel_id: message.channel_id != null ? String(message.channel_id) : message.channel_id,
            channelId: message.channelId != null ? String(message.channelId) : message.channelId,
            author: message.author
                ? {
                    ...message.author,
                    id: message.author.id != null ? String(message.author.id) : message.author.id,
                }
                : message.author,
        }));
}

function getOldestMessage(messages: ChannelMessage[]): ChannelMessage | null {
    return messages.reduce<ChannelMessage | null>((oldest, message) => {
        if (!oldest) return message;
        return compareIds(message.id, oldest.id) < 0 ? message : oldest;
    }, null);
}

function getRetryDelay(error: any, fallback: number): number {
    const retryAfter = Number(error?.body?.retry_after ?? error?.retry_after ?? error?.response?.body?.retry_after);

    if (Number.isFinite(retryAfter) && retryAfter > 0) {
        return Math.ceil(retryAfter * 1000) + 250;
    }

    return fallback;
}

async function fetchChannelPage(channelId: string, before?: string, shouldCancel?: ShouldCancel): Promise<ChannelMessage[]> {
    const url = `/channels/${channelId}/messages?limit=${MESSAGE_PAGE_SIZE}${before ? `&before=${before}` : ""}`;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        if (isCancelled(shouldCancel)) return [];

        try {
            return normalizeMessagesResponse(await RestAPI.get({ url }));
        } catch (error) {
            if (isCancelled(shouldCancel)) return [];
            if (attempt === MAX_RETRIES) throw error;
            await sleep(getRetryDelay(error, 750 * (attempt + 1)));
        }
    }

    return [];
}

async function loadMyMessages(
    channelId: string,
    maxOwnMessages?: number,
    onProgress?: (progress: LoadProgress) => void,
    shouldCancel?: ShouldCancel
): Promise<ChannelMessage[]> {
    const userId = getCurrentUserId();
    if (!userId) return [];

    const found = new Map<string, ChannelMessage>();
    let before: string | undefined;

    for (let page = 0; page < MAX_HISTORY_PAGES; page++) {
        if (isCancelled(shouldCancel)) break;

        const pageMessages = await fetchChannelPage(channelId, before, shouldCancel);

        if (isCancelled(shouldCancel)) break;
        if (pageMessages.length === 0) break;

        for (const message of pageMessages) {
            if (isOwnUndeletedMessage(message, userId, channelId)) {
                found.set(message.id, message);
            }
        }

        if (!isCancelled(shouldCancel)) {
            onProgress?.({ found: found.size, pages: page + 1 });
        }

        const oldestMessage = getOldestMessage(pageMessages);
        if (!oldestMessage || oldestMessage.id === before) break;

        before = oldestMessage.id;

        if (maxOwnMessages != null && found.size >= maxOwnMessages) break;
        if (pageMessages.length < MESSAGE_PAGE_SIZE) break;

        if (isCancelled(shouldCancel)) break;
        await sleep(FETCH_DELAY_MS);
    }

    return sortMessages([...found.values()]);
}

async function loadMyMessagesInRange(
    channelId: string,
    startId: string,
    endId: string,
    onProgress?: (progress: LoadProgress) => void,
    shouldCancel?: ShouldCancel
): Promise<ChannelMessage[]> {
    const userId = getCurrentUserId();
    if (!userId) return [];

    const [low, high] = getRangeBounds(startId, endId);
    const found = new Map<string, ChannelMessage>();
    let before: string | undefined = nextSnowflake(high);

    for (let page = 0; page < MAX_HISTORY_PAGES; page++) {
        if (isCancelled(shouldCancel)) break;

        const pageMessages = await fetchChannelPage(channelId, before, shouldCancel);

        if (isCancelled(shouldCancel)) break;
        if (pageMessages.length === 0) break;

        for (const message of pageMessages) {
            if (isIdInRange(message.id, low, high) && isOwnUndeletedMessage(message, userId, channelId)) {
                found.set(message.id, message);
            }
        }

        if (!isCancelled(shouldCancel)) {
            onProgress?.({ found: found.size, pages: page + 1 });
        }

        const oldestMessage = getOldestMessage(pageMessages);
        if (!oldestMessage || oldestMessage.id === before) break;
        if (compareIds(oldestMessage.id, low) < 0) break;

        before = oldestMessage.id;

        if (pageMessages.length < MESSAGE_PAGE_SIZE) break;

        if (isCancelled(shouldCancel)) break;
        await sleep(FETCH_DELAY_MS);
    }

    return sortMessages([...found.values()]);
}

async function deleteMessageWithRetry(channelId: string, messageId: string): Promise<boolean> {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            await MessageActions.deleteMessage(channelId, messageId);
            return true;
        } catch (error: any) {
            if (attempt === MAX_RETRIES) {
                console.error("BulkDelete delete failed:", error);
                return false;
            }

            const retryAfter = Number(
                error?.body?.retry_after ??
                error?.retry_after ??
                error?.response?.body?.retry_after ??
                error?.response?.retry_after
            );

            let delayMs = getRetryDelay(error, 1000 * (attempt + 1));

            if (error?.status === 429 || retryAfter > 0) {
                if (Number.isFinite(retryAfter) && retryAfter > 0) {
                    delayMs = Math.max(delayMs, Math.ceil(retryAfter * 1000) + 500);
                }

                console.warn(`Rate limited! Waiting ${delayMs}ms before retry...`);
            }

            await sleep(delayMs);
        }
    }

    return false;
}

async function deleteBatch(channelId: string, messages: ChannelMessage[]) {
    const userId = getCurrentUserId();

    if (!userId) {
        showToast("Could not find current user.", Toasts.Type.FAILURE);
        return;
    }

    const uniqueMessages = sortMessages([
        ...new Map(
            messages
                .filter(message => isOwnUndeletedMessage(message, userId, channelId))
                .map(message => [message.id, message])
        ).values(),
    ]);

    if (uniqueMessages.length === 0) {
        showToast("No deletable messages found.", Toasts.Type.FAILURE);
        return;
    }

    showToast(`Deleting ${uniqueMessages.length} message${uniqueMessages.length === 1 ? "" : "s"}…`, Toasts.Type.MESSAGE);

    let deleted = 0;
    let failed = 0;

    for (const message of uniqueMessages) {
        const success = await deleteMessageWithRetry(channelId, message.id);

        if (success) {
            deleted++;
        } else {
            failed++;
        }

        await sleep(DELETE_DELAY_MS);
    }

    if (failed > 0) {
        showToast(`Deleted ${deleted} of ${uniqueMessages.length} messages. ${failed} failed.`, Toasts.Type.FAILURE);
    } else {
        showToast(`Deleted ${deleted} message${deleted === 1 ? "" : "s"}.`, Toasts.Type.SUCCESS);
    }
}

async function deleteLastN(channelId: string, count: number) {
    try {
        showToast(`Loading up to ${count} of your recent messages…`, Toasts.Type.MESSAGE);
        const messages = await loadMyMessages(channelId, count);
        await deleteBatch(channelId, messages.slice(-count));
    } catch (error) {
        console.error("BulkDelete load failed:", error);
        showToast("Failed to load messages.", Toasts.Type.FAILURE);
    }
}

function isMessageFromUser(message: any): boolean {
    const userId = getCurrentUserId();
    return userId != null && String(message?.author?.id) === userId;
}

function DeleteAllModal({ modalProps, channelId }: { modalProps: ModalProps; channelId: string; }) {
    const [loading, setLoading] = useState(true);
    const [messages, setMessages] = useState<ChannelMessage[]>([]);
    const [found, setFound] = useState(0);
    const [pages, setPages] = useState(0);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        setLoading(true);
        setMessages([]);
        setFound(0);
        setPages(0);
        setError(null);

        loadMyMessages(channelId, undefined, progress => {
            if (cancelled) return;

            setFound(progress.found);
            setPages(progress.pages);
        }, () => cancelled)
            .then(loadedMessages => {
                if (cancelled) return;

                setMessages(loadedMessages);
                setFound(loadedMessages.length);
                setLoading(false);
            })
            .catch(loadError => {
                console.error("BulkDelete load all failed:", loadError);

                if (cancelled) return;

                setError("Failed to load channel history.");
                setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [channelId]);

    return (
        <ModalRoot {...modalProps} size={ModalSize.SMALL}>
            <ModalHeader>
                <Forms.FormTitle tag="h4">Delete All Your Messages</Forms.FormTitle>
            </ModalHeader>
            <ModalContent>
                {loading ? (
                    <Forms.FormText>
                        Scanning channel history… Found <strong>{found}</strong> of your messages so far across <strong>{pages}</strong> page{pages === 1 ? "" : "s"}.
                    </Forms.FormText>
                ) : error ? (
                    <Forms.FormText style={{ color: "var(--text-danger)" }}>
                        {error}
                    </Forms.FormText>
                ) : messages.length === 0 ? (
                    <Forms.FormText>You have no deletable messages in this channel.</Forms.FormText>
                ) : (
                    <Forms.FormText>
                        Found <strong>{messages.length}</strong> of your messages in this channel. Delete all of them? This cannot be undone.
                    </Forms.FormText>
                )}
            </ModalContent>
            <ModalFooter>
                {!loading && !error && messages.length > 0 && (
                    <Button
                        color={Button.Colors.RED}
                        onClick={() => {
                            modalProps.onClose();
                            Alerts.show({
                                title: "Delete All Your Messages",
                                body: `Delete all ${messages.length} of your messages in this channel? This cannot be undone.`,
                                confirmText: "Delete All",
                                cancelText: "Cancel",
                                onConfirm: () => deleteBatch(channelId, messages),
                            });
                        }}
                    >
                        Delete All
                    </Button>
                )}
                <Button color={Button.Colors.PRIMARY} look={Button.Looks.LINK} onClick={modalProps.onClose}>
                    {loading ? "Cancel" : "Close"}
                </Button>
            </ModalFooter>
        </ModalRoot>
    );
}

function RangeDeleteModal({
    modalProps,
    channelId,
    startId,
    endId,
}: {
    modalProps: ModalProps;
    channelId: string;
    startId: string;
    endId: string;
}) {
    const [loading, setLoading] = useState(true);
    const [messages, setMessages] = useState<ChannelMessage[]>([]);
    const [found, setFound] = useState(0);
    const [pages, setPages] = useState(0);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        setLoading(true);
        setMessages([]);
        setFound(0);
        setPages(0);
        setError(null);

        loadMyMessagesInRange(channelId, startId, endId, progress => {
            if (cancelled) return;

            setFound(progress.found);
            setPages(progress.pages);
        }, () => cancelled)
            .then(loadedMessages => {
                if (cancelled) return;

                setMessages(loadedMessages);
                setFound(loadedMessages.length);
                setLoading(false);
            })
            .catch(loadError => {
                console.error("BulkDelete range load failed:", loadError);

                if (cancelled) return;

                setError("Failed to load selected range.");
                setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [channelId, startId, endId]);

    return (
        <ModalRoot {...modalProps} size={ModalSize.SMALL}>
            <ModalHeader>
                <Forms.FormTitle tag="h4">Delete Message Range</Forms.FormTitle>
            </ModalHeader>
            <ModalContent>
                {loading ? (
                    <Forms.FormText>
                        Scanning selected range… Found <strong>{found}</strong> of your messages so far across <strong>{pages}</strong> page{pages === 1 ? "" : "s"}.
                    </Forms.FormText>
                ) : error ? (
                    <Forms.FormText style={{ color: "var(--text-danger)" }}>
                        {error}
                    </Forms.FormText>
                ) : messages.length === 0 ? (
                    <Forms.FormText>No deletable messages from you were found in this range.</Forms.FormText>
                ) : (
                    <Forms.FormText>
                        Found <strong>{messages.length}</strong> of your messages in this range. Delete them? This cannot be undone.
                    </Forms.FormText>
                )}
            </ModalContent>
            <ModalFooter>
                {!loading && !error && messages.length > 0 && (
                    <Button
                        color={Button.Colors.RED}
                        onClick={() => {
                            modalProps.onClose();
                            deleteBatch(channelId, messages);
                        }}
                    >
                        Delete
                    </Button>
                )}
                <Button color={Button.Colors.PRIMARY} look={Button.Looks.LINK} onClick={modalProps.onClose}>
                    {loading ? "Cancel" : "Close"}
                </Button>
            </ModalFooter>
        </ModalRoot>
    );
}

function CustomAmountModal({ modalProps, channelId }: { modalProps: ModalProps; channelId: string; }) {
    const [value, setValue] = useState("20");
    const count = parseInt(value, 10);
    const valid = !isNaN(count) && count >= 1 && count <= 1000;

    return (
        <ModalRoot {...modalProps} size={ModalSize.SMALL}>
            <ModalHeader>
                <Forms.FormTitle tag="h4">Custom Delete Amount</Forms.FormTitle>
            </ModalHeader>
            <ModalContent>
                <Forms.FormText style={{ marginBottom: 8 }}>
                    How many of your recent messages in this channel should be deleted?
                </Forms.FormText>
                <TextInput
                    value={value}
                    onChange={(newValue: string) => setValue(newValue.replace(/\D/g, ""))}
                    placeholder="e.g. 20"
                    autoFocus
                />
                {value !== "" && !valid && (
                    <Forms.FormText style={{ color: "var(--text-danger)", marginTop: 4 }}>
                        Enter a number between 1 and 1000.
                    </Forms.FormText>
                )}
            </ModalContent>
            <ModalFooter>
                <Button
                    color={Button.Colors.RED}
                    disabled={!valid}
                    onClick={() => {
                        modalProps.onClose();
                        Alerts.show({
                            title: "Bulk Delete Messages",
                            body: `Delete up to ${count} of your most recent messages in this channel? This cannot be undone.`,
                            confirmText: "Delete",
                            cancelText: "Cancel",
                            onConfirm: () => deleteLastN(channelId, count),
                        });
                    }}
                >
                    Delete
                </Button>
                <Button color={Button.Colors.PRIMARY} look={Button.Looks.LINK} onClick={modalProps.onClose}>
                    Cancel
                </Button>
            </ModalFooter>
        </ModalRoot>
    );
}

const DELETE_COUNTS = [5, 10, 25, 50] as const;

const messageContextMenuPatch: NavContextMenuPatchCallback = (children, { message }) => {
    const channelId = message?.channel_id ?? message?.channelId;
    const messageId = message?.id;

    if (!channelId || !messageId) return;

    const stringChannelId = String(channelId);
    const stringMessageId = String(messageId);
    const isFromUser = isMessageFromUser(message);
    const rangeActive = rangeStart != null && rangeStart.channelId === stringChannelId && rangeStart.messageId !== stringMessageId;

    children.push(
        <Menu.MenuSeparator />,
        <Menu.MenuItem id="bulk-delete" label="Bulk Delete">
            {DELETE_COUNTS.map(count => (
                <Menu.MenuItem
                    key={`bulk-delete-${count}`}
                    id={`bulk-delete-${count}`}
                    label={`Last ${count} of my messages`}
                    color="danger"
                    action={() =>
                        Alerts.show({
                            title: "Bulk Delete Messages",
                            body: `Delete up to ${count} of your most recent messages in this channel? This cannot be undone.`,
                            confirmText: "Delete",
                            cancelText: "Cancel",
                            onConfirm: () => deleteLastN(stringChannelId, count),
                        })
                    }
                />
            ))}
            <Menu.MenuItem
                id="bulk-delete-custom"
                label="Custom amount…"
                color="danger"
                action={() =>
                    openModal(modalProps => (
                        <CustomAmountModal modalProps={modalProps} channelId={stringChannelId} />
                    ))
                }
            />
            <Menu.MenuItem
                id="bulk-delete-all"
                label="Delete all of your messages"
                color="danger"
                action={() =>
                    openModal(modalProps => (
                        <DeleteAllModal modalProps={modalProps} channelId={stringChannelId} />
                    ))
                }
            />
            <Menu.MenuSeparator />
            {rangeActive ? (
                <>
                    <Menu.MenuItem
                        id="bulk-delete-range-confirm"
                        label="Delete range to here"
                        color="danger"
                        action={() => {
                            const start = rangeStart;
                            rangeStart = null;

                            if (!start) return;

                            openModal(modalProps => (
                                <RangeDeleteModal
                                    modalProps={modalProps}
                                    channelId={stringChannelId}
                                    startId={start.messageId}
                                    endId={stringMessageId}
                                />
                            ));
                        }}
                    />
                    <Menu.MenuItem
                        id="bulk-delete-range-clear"
                        label="Clear range start"
                        action={() => {
                            rangeStart = null;
                            showToast("Range start cleared.", Toasts.Type.MESSAGE);
                        }}
                    />
                </>
            ) : (
                <Menu.MenuItem
                    id="bulk-delete-range-start"
                    label={rangeStart != null && rangeStart.channelId === stringChannelId && rangeStart.messageId === stringMessageId
                        ? "Range start: this message ✓"
                        : "Set as range start"
                    }
                    disabled={!isFromUser}
                    action={() => {
                        if (!isFromUser) {
                            showToast("You can only set your own messages as range start.", Toasts.Type.FAILURE);
                            return;
                        }

                        rangeStart = { channelId: stringChannelId, messageId: stringMessageId };
                        showToast("Range start set — right-click another message to delete the range.", Toasts.Type.MESSAGE);
                    }}
                />
            )}
        </Menu.MenuItem>
    );
};

export default definePlugin({
    name: "BulkDelete",
    description: "Delete multiple of your own messages at once by count, custom amount, range, or full channel scan.",
    authors: [{ name: "JxstColin", id: 777422426333642753n }],
    tags: ["Chat", "Utility"],

    contextMenus: {
        message: messageContextMenuPatch,
    },
});