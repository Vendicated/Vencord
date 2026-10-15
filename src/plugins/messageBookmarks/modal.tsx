/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2026 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { Button } from "@components/Button";
import { clearBookmarks, MessageBookmark, removeBookmark, useBookmarks } from "@plugins/messageBookmarks/store";
import { RenderModalProps } from "@vencord/discord-types";
import { ChannelStore, ConfirmModal, Forms, GuildStore, Modal, NavigationRouter, openModal, PermissionsBits, PermissionStore, ScrollerThin, showToast, TextInput, Timestamp, Toasts, useEffect, useMemo, useState } from "@webpack/common";

function getChannelLabel(bookmark: MessageBookmark) {
    const channel = ChannelStore.getChannel(bookmark.channelId);
    if (!channel) return "Unavailable channel";
    if (channel.isDM()) return "Direct Message";
    if (channel.isMultiUserDM()) return channel.name || "Group DM";

    return `#${channel.name}`;
}

function getGuildLabel(bookmark: MessageBookmark) {
    if (!bookmark.guildId) return null;

    return GuildStore.getGuild(bookmark.guildId)?.name ?? "Unavailable server";
}

function canJumpToBookmark(bookmark: MessageBookmark) {
    const channel = ChannelStore.getChannel(bookmark.channelId);
    if (!channel) return true;
    if (channel.guild_id && !PermissionStore.can(PermissionsBits.VIEW_CHANNEL, channel)) return false;

    return true;
}

function getSearchText(bookmark: MessageBookmark) {
    return [
        bookmark.authorName,
        bookmark.preview,
        bookmark.authorId,
        bookmark.channelId,
        bookmark.guildId,
        getChannelLabel(bookmark),
        getGuildLabel(bookmark)
    ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
}

function openBookmark(bookmark: MessageBookmark, onClose: () => void) {
    if (!canJumpToBookmark(bookmark)) {
        showToast("That bookmarked message is no longer accessible.", Toasts.Type.FAILURE);
        return;
    }

    onClose();
    NavigationRouter.transitionTo(
        `/channels/${bookmark.guildId ?? "@me"}/${bookmark.channelId}/${bookmark.messageId}`
    );
}

function BookmarkCard({ bookmark, onClose }: { bookmark: MessageBookmark; onClose: () => void; }) {
    const guildLabel = getGuildLabel(bookmark);
    const channelLabel = getChannelLabel(bookmark);

    return (
        <div
            style={{
                border: "1px solid var(--border-subtle)",
                borderRadius: 8,
                padding: 12,
                display: "flex",
                flexDirection: "column",
                gap: 10
            }}
        >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: "var(--header-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {bookmark.authorName || bookmark.authorId}
                    </div>
                    <div style={{ color: "var(--text-muted)", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {guildLabel ? `${guildLabel} - ${channelLabel}` : channelLabel}
                    </div>
                </div>
                <Timestamp timestamp={new Date(bookmark.timestamp)} />
            </div>

            <Forms.FormText style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {bookmark.preview || "No preview available."}
            </Forms.FormText>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Button
                    variant="secondary"
                    onClick={() => openBookmark(bookmark, onClose)}
                    disabled={!canJumpToBookmark(bookmark)}
                >
                    Jump to Message
                </Button>
                <Button
                    variant="dangerSecondary"
                    onClick={async () => {
                        if (await removeBookmark(bookmark.messageId))
                            showToast("Bookmark removed.", Toasts.Type.SUCCESS);
                    }}
                >
                    Remove Bookmark
                </Button>
            </div>
        </div>
    );
}

function EmptyState({ search }: { search: string; }) {
    return (
        <div style={{ padding: "32px 0", textAlign: "center" }}>
            <Forms.FormText>
                {search ? "No bookmarks match your search." : "No bookmarks yet."}
            </Forms.FormText>
        </div>
    );
}

function BookmarksModal(props: RenderModalProps) {
    const [bookmarks, error, pending] = useBookmarks();
    const [query, setQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");

    useEffect(() => {
        const timeout = setTimeout(() => setDebouncedQuery(query.trim().toLowerCase()), 200);
        return () => clearTimeout(timeout);
    }, [query]);

    const filteredBookmarks = useMemo(
        () => bookmarks.filter(bookmark => getSearchText(bookmark).includes(debouncedQuery)),
        [bookmarks, debouncedQuery]
    );

    return (
        <Modal
            {...props}
            size="xl"
            title={`Message Bookmarks${bookmarks.length ? ` (${bookmarks.length})` : ""}`}
            actions={[
                {
                    text: "Clear All",
                    variant: "critical-primary",
                    disabled: !bookmarks.length,
                    onClick() {
                        openModal(modalProps => (
                            <ConfirmModal
                                {...modalProps}
                                title="Clear all bookmarks?"
                                subtitle={`This will permanently remove ${bookmarks.length} bookmark${bookmarks.length === 1 ? "" : "s"} from local storage.`}
                                confirmText="Clear All"
                                onConfirm={async () => {
                                    if (await clearBookmarks())
                                        showToast("All bookmarks cleared.", Toasts.Type.SUCCESS);
                                }}
                            />
                        ));
                    }
                }
            ]}
        >
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <TextInput
                    value={query}
                    onChange={setQuery}
                    placeholder="Search bookmarks"
                />

                <ScrollerThin style={{ maxHeight: "60vh" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {pending && <Forms.FormText>Loading bookmarks...</Forms.FormText>}
                        {!!error && <Forms.FormText style={{ color: "var(--text-feedback-critical)" }}>Failed to load bookmarks.</Forms.FormText>}
                        {!pending && !error && !filteredBookmarks.length && <EmptyState search={debouncedQuery} />}

                        {!!filteredBookmarks.length && filteredBookmarks.map(bookmark => (
                            <BookmarkCard
                                key={bookmark.messageId}
                                bookmark={bookmark}
                                onClose={props.onClose}
                            />
                        ))}
                    </div>
                </ScrollerThin>
            </div>
        </Modal>
    );
}

export function openMessageBookmarksModal() {
    openModal(props => <BookmarksModal {...props} />);
}
