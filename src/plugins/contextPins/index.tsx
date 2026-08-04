/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { Button } from "@components/Button";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import type { Message, RenderModalProps } from "@vencord/discord-types";
import {
    ChannelStore,
    closeModal,
    ConfirmModal,
    GuildStore,
    Menu,
    Modal,
    openModal,
    Toasts,
} from "@webpack/common";

import ContextPinsModal from "./components/ContextPinsModal";
import PinEditorModal, { PinEditorTarget } from "./components/PinEditorModal";
import {
    ContextPinsConflictError,
    ContextPinsStorageError,
    deletePin,
    getPin,
    getStorageState,
    makePinKey,
    PinSnapshot,
    startStorage,
    stopStorage,
    StoredPin,
} from "./storage";

const logger = new Logger("ContextPins");
const activeModalKeys = new Set<string>();

function showToast(message: string, type = Toasts.Type.SUCCESS) {
    Toasts.show({ message, type, id: Toasts.genId() });
}

function getAuthorName(message: Message) {
    return message.author.globalName || message.author.username || "Unknown user";
}

function getChannelName(message: Message) {
    const channel = ChannelStore.getChannel(message.channel_id);
    if (channel?.name) return channel.name;
    if (channel?.isGroupDM()) return "Group DM";
    if (channel?.isPrivate()) return "Direct Message";
    return "Unknown channel";
}

function createSnapshot(message: Message): PinSnapshot {
    const channel = ChannelStore.getChannel(message.channel_id);
    const guildId = channel?.guild_id ?? null;

    return {
        messageId: message.id,
        channelId: message.channel_id,
        guildId,
        content: message.content || "",
        authorId: message.author.id,
        authorName: getAuthorName(message),
        channelName: getChannelName(message),
        guildName: guildId ? GuildStore.getGuild(guildId)?.name ?? null : null,
        messageTimestamp: message.timestamp.getTime(),
        attachmentCount: message.attachments.length,
        embedCount: message.embeds.length,
        stickerCount: message.stickerItems.length,
    };
}

function trackModal(render: (modalProps: RenderModalProps, onClose: () => void) => React.ReactNode) {
    let modalKey = "";
    modalKey = openModal(modalProps => {
        const onClose = () => {
            activeModalKeys.delete(modalKey);
            modalProps.onClose();
        };

        return render(modalProps, onClose);
    });
    activeModalKeys.add(modalKey);
    return modalKey;
}

function openManager() {
    trackModal((modalProps, onClose) => (
        <ErrorBoundary>
            <Modal {...modalProps} onClose={onClose} title="Context Pins" size="xl">
                <ContextPinsModal
                    modalProps={{ ...modalProps, onClose }}
                    onEdit={openEditorForPin}
                    onDelete={openDeleteConfirmation}
                />
            </Modal>
        </ErrorBoundary>
    ));
}

function openEditor(target: PinEditorTarget) {
    trackModal((modalProps, onClose) => (
        <ErrorBoundary>
            <PinEditorModal
                modalProps={{ ...modalProps, onClose }}
                target={target}
            />
        </ErrorBoundary>
    ));
}

function openEditorForMessage(message: Message) {
    if (getStorageState() !== "ready") {
        showToast("Context Pins is still loading. Try again in a moment.", Toasts.Type.FAILURE);
        return;
    }

    const key = makePinKey(message.channel_id, message.id);
    const existing = getPin(key);
    openEditor({
        key,
        snapshot: createSnapshot(message),
        note: existing?.note ?? "",
        tags: existing?.tags ?? [],
        expectedRevision: existing?.revision ?? null,
    });
}

function openEditorForPin(pin: StoredPin) {
    openEditor({
        key: makePinKey(pin.channelId, pin.messageId),
        snapshot: pin,
        note: pin.note,
        tags: pin.tags,
        expectedRevision: pin.revision,
    });
}

function openDeleteConfirmation(pin: StoredPin) {
    trackModal((modalProps, onClose) => (
        <ErrorBoundary>
            <ConfirmModal
                {...modalProps}
                onClose={onClose}
                title="Remove Context Pin"
                subtitle="This only removes the local pin. The Discord message will not be changed."
                confirmText="Remove pin"
                cancelText="Cancel"
                onConfirm={async setError => {
                    try {
                        await deletePin(makePinKey(pin.channelId, pin.messageId), pin.revision);
                        showToast("Context Pin removed.");
                    } catch (error) {
                        if (error instanceof ContextPinsConflictError) {
                            setError(error.message);
                        } else {
                            logger.error("Failed to remove pin", error);
                            setError("Context Pin could not be removed. Check the console for details.");
                        }
                        throw error;
                    }
                }}
            />
        </ErrorBoundary>
    ));
}

const messageContextMenuPatch: NavContextMenuPatchCallback = (
    children,
    { message }: { message?: Message; }
) => {
    if (!message) return;

    const storageState = getStorageState();
    const ready = storageState === "ready";
    const pin = ready ? getPin(makePinKey(message.channel_id, message.id)) : undefined;

    children.push(
        <Menu.MenuItem
            id="vc-context-pins-menu"
            label="Context Pins"
        >
            {storageState === "loading" && (
                <Menu.MenuItem
                    id="vc-context-pins-loading"
                    label="Context Pins is loading..."
                    disabled
                />
            )}
            {storageState === "error" && (
                <Menu.MenuItem
                    id="vc-context-pins-error"
                    label="Context Pins unavailable"
                    disabled
                />
            )}
            {ready && !pin && (
                <Menu.MenuItem
                    id="vc-context-pins-save"
                    label="Save to Context Pins"
                    action={() => openEditorForMessage(message)}
                />
            )}
            {ready && pin && (
                <>
                    <Menu.MenuItem
                        id="vc-context-pins-edit"
                        label="Edit Context Pin"
                        action={() => openEditorForMessage(message)}
                    />
                    <Menu.MenuItem
                        id="vc-context-pins-remove"
                        label="Remove from Context Pins"
                        color="danger"
                        action={() => openDeleteConfirmation(pin)}
                    />
                </>
            )}
            <Menu.MenuItem
                id="vc-context-pins-manage"
                label="Manage Context Pins"
                action={openManager}
            />
        </Menu.MenuItem>
    );
};

const settings = definePluginSettings({
    managePins: {
        type: OptionType.COMPONENT,
        component: () => (
            <Button onClick={openManager}>
                Manage Context Pins
            </Button>
        ),
    },
});

export default definePlugin({
    name: "ContextPins",
    description: "Saves Discord messages as local bookmarks with notes and tags",
    tags: ["Chat", "Utility"],
    authors: [Devs.rexy0345, Devs.reticla],
    settings,

    start() {
        void startStorage().catch(error => {
            if (!(error instanceof ContextPinsStorageError)) logger.error("Failed to initialize", error);
        });
    },

    stop() {
        for (const modalKey of activeModalKeys) closeModal(modalKey);
        activeModalKeys.clear();
        stopStorage();
    },

    contextMenus: {
        message: messageContextMenuPatch,
    },
});
