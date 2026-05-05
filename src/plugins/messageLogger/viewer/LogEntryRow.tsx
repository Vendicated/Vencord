/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { removeEntry } from "@plugins/messageLogger/persistence";
import { PersistedMessage } from "@plugins/messageLogger/types";
import { Logger } from "@utils/Logger";
import { ChannelRouter, ChannelStore, ContextMenuApi, IconUtils, Menu, MessageActions, MessageStore, Text, Timestamp, UserStore } from "@webpack/common";

const logger = new Logger("MessageLogger");

export interface LogEntryRowProps {
    entry: PersistedMessage;
    density: "compact" | "comfortable";
}

function formatChannelLabel(channelId: string): string {
    const channel = ChannelStore.getChannel(channelId);
    if (!channel) return "#unknown";
    if (channel.name) return `#${channel.name}`;
    const recipients = (channel as any).recipients as string[] | undefined;
    if (recipients?.length) {
        const [recipientId] = recipients;
        const u = UserStore.getUser(recipientId);
        return u ? `@${u.username}` : "@unknown";
    }
    return "#unknown";
}

function getAvatarUrl(message: any, size: number): string {
    const { author } = message;
    if (!author) return IconUtils.getDefaultAvatarURL("0");
    if (author.id && author.avatar) {
        const realUser = UserStore.getUser(author.id);
        if (realUser) return IconUtils.getUserAvatarURL(realUser, false, size);
    }
    return IconUtils.getDefaultAvatarURL(author.id ?? author.discriminator ?? "0");
}

function jumpToEntry(entry: PersistedMessage): void {
    const channel = ChannelStore.getChannel(entry.channelId);
    if (!channel) return;
    ChannelRouter.transitionToChannel(entry.channelId);
    if (!MessageStore.getMessage(entry.channelId, entry.id)) {
        logger.debug("Jumped to channel for entry", entry.id, "but message is not in MessageStore (likely a phase-1 ghost or evicted)");
    }
    MessageActions.jumpToMessage({
        channelId: entry.channelId,
        messageId: entry.id,
        flash: true,
        jumpType: "INSTANT" as any,
    });
}

function renderRowMenu(entry: PersistedMessage, ev: React.MouseEvent): void {
    const channelAccessible = ChannelStore.getChannel(entry.channelId) != null;
    ContextMenuApi.openContextMenu(ev, () => (
        <Menu.Menu
            navId="vc-ml-row-menu"
            onClose={ContextMenuApi.closeContextMenu}
        >
            <Menu.MenuItem
                id="vc-ml-row-jump"
                label="Jump to message"
                disabled={!channelAccessible}
                action={() => jumpToEntry(entry)}
            />
            <Menu.MenuItem
                id="vc-ml-row-remove"
                label="Remove from log"
                color="danger"
                action={() => { void removeEntry(entry.id); }}
            />
        </Menu.Menu>
    ));
}

export function LogEntryRow({ entry, density }: LogEntryRowProps) {
    const author = (entry.message as any).author ?? {};
    const displayName = author.global_name || author.username || "Unknown";
    const avatarSize = density === "comfortable" ? 40 : 32;
    const contentLimit = density === "comfortable" ? 240 : 120;

    let preview = (entry.message as any).content ?? "";
    if (!entry.deleted && entry.editHistory?.length) {
        const last = entry.editHistory[entry.editHistory.length - 1];
        preview = `edited from "${last.content}" → "${preview}"`;
    }
    if (preview.length > contentLimit) preview = preview.slice(0, contentLimit - 1) + "…";
    if (!preview) preview = "(no text content)";

    return (
        <div
            onClick={() => jumpToEntry(entry)}
            onContextMenu={ev => renderRowMenu(entry, ev)}
            style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                padding: density === "comfortable" ? "10px 16px" : "6px 16px",
                cursor: "pointer",
                borderBottom: "1px solid var(--background-modifier-accent)",
                color: entry.deleted ? "var(--text-muted)" : "var(--text-normal)",
            }}
        >
            <img
                src={getAvatarUrl(entry.message, avatarSize)}
                alt=""
                width={avatarSize}
                height={avatarSize}
                style={{ borderRadius: "50%", flexShrink: 0 }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                    <Text variant="text-md/semibold" style={{ color: "var(--header-primary)" }}>{displayName}</Text>
                    <Text variant="text-xs/normal" style={{ color: "var(--text-muted)" }}>{formatChannelLabel(entry.channelId)}</Text>
                    <Text variant="text-xs/normal" style={{ color: "var(--text-muted)" }}>
                        <Timestamp timestamp={new Date(entry.capturedAt)} />
                    </Text>
                    {entry.deleted && (
                        <Text variant="text-xs/semibold" style={{ color: "var(--status-danger)" }}>DELETED</Text>
                    )}
                </div>
                <Text
                    variant={density === "comfortable" ? "text-md/normal" : "text-sm/normal"}
                    style={{
                        marginTop: 2,
                        textDecoration: entry.deleted ? "line-through" : undefined,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                    }}
                >
                    {preview}
                </Text>
            </div>
        </div>
    );
}
