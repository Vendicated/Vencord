/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { ChannelStore, Menu, Modal, React, RestAPI, UserStore, openModal } from "@webpack/common";
import { RenderModalProps } from "@vencord/discord-types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RawMessage {
    id: string;
    content: string;
    author: {
        id: string;
        username: string;
        discriminator?: string;
        global_name?: string;
        bot?: boolean;
    };
    timestamp: string;
    edited_timestamp: string | null;
    attachments: Array<{
        id: string;
        filename: string;
        url: string;
        size: number;
        content_type?: string;
    }>;
    embeds: any[];
    reactions?: Array<{
        emoji: { id: string | null; name: string; };
        count: number;
    }>;
    referenced_message?: RawMessage | null;
    type: number;
    pinned: boolean;
    mention_everyone: boolean;
    mentions: Array<{ id: string; username: string; }>;
    sticker_items?: Array<{ id: string; name: string; }>;
    components?: any[];
}

interface ExportedMessage {
    id: string;
    content: string;
    author: {
        id: string;
        username: string;
        globalName?: string;
        isBot?: boolean;
    };
    timestamp: string;
    editedAt?: string;
    pinned?: boolean;
    mentionEveryone?: boolean;
    mentions?: Array<{ id: string; username: string; }>;
    attachments?: Array<{
        id: string;
        filename: string;
        url: string;
        sizeBytes: number;
        contentType?: string;
    }>;
    stickers?: Array<{ id: string; name: string; }>;
    embeds?: any[];
    reactions?: Array<{ emoji: string; count: number; }>;
    replyTo?: string;
    type?: number;
}

interface ExportFilters {
    // User filter — comma-separated user IDs or usernames
    userIds: string;
    // Date range
    after: string;   // ISO date string e.g. "2024-01-01"
    before: string;
    // Content
    keyword: string;
    onlyPinned: boolean;
    onlyWithAttachments: boolean;
    excludeBots: boolean;
    onlySelf: boolean;
    // Message type
    excludeSystemMessages: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getChannelLabel(channel: any): string {
    if (channel.type === 1) {
        // DM: grab recipient
        const recipientId = channel.recipients?.[0];
        const recipient = recipientId ? UserStore.getUser(recipientId) : null;
        return recipient ? `DM_${recipient.username}` : `DM_${channel.id}`;
    }
    if (channel.type === 3) {
        // Group DM
        return channel.name ? `Group_${channel.name}` : `Group_${channel.id}`;
    }
    // Server channel
    return channel.name ?? channel.id;
}

function formatMessage(msg: RawMessage): ExportedMessage {
    const author: ExportedMessage["author"] = { id: msg.author.id, username: msg.author.username };
    if (msg.author.global_name) author.globalName = msg.author.global_name;
    if (msg.author.bot) author.isBot = true;

    const m: ExportedMessage = {
        id: msg.id,
        content: msg.content,
        author,
        timestamp: msg.timestamp,
    };

    if (msg.edited_timestamp) m.editedAt = msg.edited_timestamp;
    if (msg.pinned) m.pinned = true;
    if (msg.mention_everyone) m.mentionEveryone = true;
    if (msg.mentions?.length) m.mentions = msg.mentions.map(u => ({ id: u.id, username: u.username }));
    if (msg.attachments?.length) {
        m.attachments = msg.attachments.map(a => {
            const att: any = { id: a.id, filename: a.filename, url: a.url, sizeBytes: a.size };
            if (a.content_type) att.contentType = a.content_type;
            return att;
        });
    }
    if (msg.sticker_items?.length) m.stickers = msg.sticker_items.map(s => ({ id: s.id, name: s.name }));
    if (msg.embeds?.length) m.embeds = msg.embeds;
    if (msg.reactions?.length) {
        m.reactions = msg.reactions.map(r => ({
            emoji: r.emoji.id ? `<:${r.emoji.name}:${r.emoji.id}>` : (r.emoji.name ?? "?"),
            count: r.count,
        }));
    }
    if (msg.referenced_message?.id) m.replyTo = msg.referenced_message.id;
    if (msg.type !== 0) m.type = msg.type;

    return m;
}

function applyFilters(messages: ExportedMessage[], filters: ExportFilters): ExportedMessage[] {
    const me = UserStore.getCurrentUser();

    // Parse user IDs/names filter
    const userTargets = filters.userIds
        .split(",")
        .map(s => s.trim().toLowerCase())
        .filter(Boolean);

    const afterDate = filters.after ? new Date(filters.after).getTime() : null;
    const beforeDate = filters.before ? new Date(filters.before + "T23:59:59").getTime() : null;
    const keyword = filters.keyword.trim().toLowerCase();

    return messages.filter(msg => {
        // User filter
        if (filters.onlySelf && me) {
            if (msg.author.id !== me.id) return false;
        } else if (userTargets.length > 0) {
            const matchesUser = userTargets.some(
                t => msg.author.id === t ||
                    msg.author.username.toLowerCase() === t ||
                    (msg.author.globalName?.toLowerCase() === t)
            );
            if (!matchesUser) return false;
        }

        // Bot filter
        if (filters.excludeBots && msg.author.isBot) return false;

        // Date range
        const msgTime = new Date(msg.timestamp).getTime();
        if (afterDate && msgTime < afterDate) return false;
        if (beforeDate && msgTime > beforeDate) return false;

        // Pinned only
        if (filters.onlyPinned && !msg.pinned) return false;

        // Attachments only
        if (filters.onlyWithAttachments && !msg.attachments?.length) return false;

        // Keyword
        if (keyword && !msg.content.toLowerCase().includes(keyword)) return false;

        // Exclude system messages (type 0 = normal, type 19 = reply, type 20 = thread start)
        const normalTypes = new Set([0, 19, 20]);
        if (filters.excludeSystemMessages && !normalTypes.has(msg.type ?? 0)) return false;

        return true;
    });
}

async function fetchAllMessages(channelId: string): Promise<ExportedMessage[]> {
    const messages: ExportedMessage[] = [];
    let before: string | undefined = undefined;
    let hasMore = true;

    while (hasMore) {
        const params: Record<string, string> = { limit: "100" };
        if (before) params.before = before;

        const query = new URLSearchParams(params).toString();
        const res = await RestAPI.get({ url: `/channels/${channelId}/messages?${query}` });

        if (!res?.body?.length) {
            hasMore = false;
            break;
        }

        const batch: RawMessage[] = res.body;
        messages.push(...batch.map(formatMessage));

        if (batch.length < 100) {
            hasMore = false;
        } else {
            before = batch[batch.length - 1].id;
        }

        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 300));
    }

    // Chronological order (oldest first)
    return messages.reverse();
}

function downloadJSON(data: object, filename: string): void {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function showToast(message: string): void {

    try {
        (window as any).Vencord?.Util?.showToast?.(message);
    } catch {
        console.log(`[ChannelExport] ${message}`);
    }
}

// ─── Export logic ─────────────────────────────────────────────────────────────

async function runExport(channelId: string, filters: ExportFilters): Promise<void> {
    const channel = ChannelStore.getChannel(channelId);
    if (!channel) {
        showToast("Could not find channel.");
        return;
    }

    const me = UserStore.getCurrentUser();
    showToast("Fetching messages… this may take a while.");

    try {
        const allMessages = await fetchAllMessages(channelId);
        const filtered = applyFilters(allMessages, filters);

        const channelInfo: Record<string, any> = {
            id: channel.id,
            name: getChannelLabel(channel),
            type: channel.type,
        };
        if (channel.guild_id) channelInfo.guildId = channel.guild_id;

        const appliedFilters: Record<string, any> = {};
        if (filters.userIds) appliedFilters.userIds = filters.userIds;
        if (filters.onlySelf) appliedFilters.onlySelf = true;
        if (filters.after) appliedFilters.after = filters.after;
        if (filters.before) appliedFilters.before = filters.before;
        if (filters.keyword) appliedFilters.keyword = filters.keyword;
        if (filters.onlyPinned) appliedFilters.onlyPinned = true;
        if (filters.onlyWithAttachments) appliedFilters.onlyWithAttachments = true;
        if (filters.excludeBots) appliedFilters.excludeBots = true;
        if (!filters.excludeSystemMessages) appliedFilters.excludeSystemMessages = false;

        const exportData = {
            exportedAt: new Date().toISOString(),
            exportedBy: me
                ? `${me.username} (${me.id})`
                : "unknown",
            channel: channelInfo,
            filters: appliedFilters,
            totalFetched: allMessages.length,
            exportedCount: filtered.length,
            messages: filtered,
        };

        const safeName = getChannelLabel(channel).replace(/[^a-zA-Z0-9_\-]/g, "_");
        const date = new Date().toISOString().slice(0, 10);
        const filename = `export_${safeName}_${date}.json`;

        downloadJSON(exportData, filename);
        showToast(`Exported ${filtered.length} / ${allMessages.length} messages to ${filename}`);
    } catch (err) {
        console.error("[ChannelExport] Export failed:", err);
        showToast("Export failed. Check the console for details.");
    }
}

// ─── Filter Modal ─────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "6px 8px",
    borderRadius: "4px",
    border: "1px solid var(--background-modifier-accent)",
    background: "var(--background-secondary)",
    color: "var(--text-normal)",
    fontSize: "14px",
    boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
    display: "block",
    color: "var(--text-muted)",
    fontSize: "12px",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: "4px",
};

const rowStyle: React.CSSProperties = {
    display: "flex",
    gap: "12px",
};

const checkboxRowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    color: "var(--text-normal)",
    fontSize: "14px",
    cursor: "pointer",
    userSelect: "none",
};

function Field({ label, children }: { label: string; children: React.ReactNode; }) {
    return (
        <div style={{ marginBottom: "12px" }}>
            <label style={labelStyle}>{label}</label>
            {children}
        </div>
    );
}

function CheckField({
    label,
    checked,
    onChange,
}: {
    label: string;
    checked: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <label style={checkboxRowStyle}>
            <input
                type="checkbox"
                checked={checked}
                onChange={e => onChange(e.target.checked)}
                style={{ accentColor: "var(--brand-experiment)", width: "16px", height: "16px" }}
            />
            {label}
        </label>
    );
}

function ExportFilterModal({
    modalProps,
    channelId,
}: {
    modalProps: RenderModalProps;
    channelId: string;
}) {
    const [filters, setFilters] = React.useState<ExportFilters>({
        userIds: "",
        after: "",
        before: "",
        keyword: "",
        onlyPinned: false,
        onlyWithAttachments: false,
        excludeBots: false,
        onlySelf: false,
        excludeSystemMessages: true,
    });

    const [isExporting, setIsExporting] = React.useState(false);

    const set = <K extends keyof ExportFilters>(key: K, value: ExportFilters[K]) =>
        setFilters(f => ({ ...f, [key]: value }));

    const channel = ChannelStore.getChannel(channelId);
    const channelName = channel ? getChannelLabel(channel) : channelId;

    async function handleExport() {
        setIsExporting(true);
        modalProps.onClose();
        await runExport(channelId, filters);
        setIsExporting(false);
    }

    return (
        <Modal
            {...modalProps}
            size="md"
            title="Export Messages"
            subtitle={`#${channelName}`}
            actions={[
                {
                    text: "Cancel",
                    variant: "secondary",
                    onClick: () => modalProps.onClose(),
                },
                {
                    text: "Export to JSON",
                    variant: "primary",
                    onClick: handleExport,
                    disabled: isExporting,
                    loading: isExporting,
                },
            ]}
        >

            {/* User filters */}
            <div style={{
                background: "var(--background-secondary)",
                borderRadius: "8px",
                padding: "12px",
                marginBottom: "12px",
            }}>
                <div style={{ color: "var(--header-primary)", fontWeight: 600, fontSize: "13px", marginBottom: "10px" }}>
                    Author Filters
                </div>

                <Field label="User IDs or usernames (comma-separated)">
                    <input
                        style={{ ...inputStyle, opacity: filters.onlySelf ? 0.4 : 1 }}
                        placeholder="e.g. 123456789, john_doe, jane"
                        value={filters.userIds}
                        disabled={filters.onlySelf}
                        onChange={e => set("userIds", e.target.value)}
                    />
                    <div style={{ color: "var(--text-muted)", fontSize: "11px", marginTop: "3px" }}>
                        Matches by exact user ID or username. Leave empty to include all users.
                    </div>
                </Field>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
                    <CheckField label="Only my messages" checked={filters.onlySelf} onChange={v => set("onlySelf", v)} />
                    <CheckField label="Exclude bots" checked={filters.excludeBots} onChange={v => set("excludeBots", v)} />
                </div>
            </div>

            {/* Date range */}
            <div style={{
                background: "var(--background-secondary)",
                borderRadius: "8px",
                padding: "12px",
                marginBottom: "12px",
            }}>
                <div style={{ color: "var(--header-primary)", fontWeight: 600, fontSize: "13px", marginBottom: "10px" }}>
                    Date Range
                </div>
                <div style={rowStyle}>
                    <div style={{ flex: 1 }}>
                        <Field label="After (from)">
                            <input
                                type="date"
                                style={inputStyle}
                                value={filters.after}
                                onChange={e => set("after", e.target.value)}
                            />
                        </Field>
                    </div>
                    <div style={{ flex: 1 }}>
                        <Field label="Before (until)">
                            <input
                                type="date"
                                style={inputStyle}
                                value={filters.before}
                                onChange={e => set("before", e.target.value)}
                            />
                        </Field>
                    </div>
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: "11px", marginTop: "-4px" }}>
                    Leave blank to include all dates. "Before" includes the full selected day.
                </div>
            </div>

            {/* Content filters */}
            <div style={{
                background: "var(--background-secondary)",
                borderRadius: "8px",
                padding: "12px",
                marginBottom: "12px",
            }}>
                <div style={{ color: "var(--header-primary)", fontWeight: 600, fontSize: "13px", marginBottom: "10px" }}>
                    Content Filters
                </div>

                <Field label="Keyword / phrase">
                    <input
                        style={inputStyle}
                        placeholder="e.g. hello world"
                        value={filters.keyword}
                        onChange={e => set("keyword", e.target.value)}
                    />
                    <div style={{ color: "var(--text-muted)", fontSize: "11px", marginTop: "3px" }}>
                        Case-insensitive. Only messages whose content contains this text will be exported.
                    </div>
                </Field>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
                    <CheckField label="Only pinned messages" checked={filters.onlyPinned} onChange={v => set("onlyPinned", v)} />
                    <CheckField label="Only messages with attachments" checked={filters.onlyWithAttachments} onChange={v => set("onlyWithAttachments", v)} />
                    <CheckField label="Exclude system messages (join/leave/pins…)" checked={filters.excludeSystemMessages} onChange={v => set("excludeSystemMessages", v)} />
                </div>
            </div>

            {/* Info box */}
            <div style={{
                background: "var(--background-modifier-accent)",
                borderRadius: "6px",
                padding: "10px 12px",
                color: "var(--text-muted)",
                fontSize: "12px",
                lineHeight: "1.5",
            }}>
                All messages are fetched first, then filters are applied locally.
                Channels with many messages may take a while. Do not close Discord during export.
            </div>
        </Modal>
    );
}

function openExportModal(channelId: string) {
    openModal(modalProps => (
        <ExportFilterModal modalProps={modalProps} channelId={channelId} />
    ));
}

// ─── Plugin ───────────────────────────────────────────────────────────────────

export default definePlugin({
    name: "ChannelExport",
    description: "Export messages from any channel, DM, or group chat to JSON. Right-click a channel to open the export dialog with filters.",
    authors: [Devs.Doshibadev],

    contextMenus: {
        // Server channel
        "channel-context": (children: any[], { channel }: any) => {
            if (!channel?.id) return;
            children.push(
                <Menu.MenuSeparator key="export-sep" />,
                <Menu.MenuItem
                    key="vc-channel-export"
                    id="vc-channel-export"
                    label="Export Messages…"
                    action={() => openExportModal(channel.id)}
                />
            );
        },

        // DM
        "user-context": (children: any[], props: any) => {
            const channelId = props?.channel?.id;
            if (!channelId) return;
            children.push(
                <Menu.MenuSeparator key="export-sep-dm" />,
                <Menu.MenuItem
                    key="vc-channel-export-dm"
                    id="vc-channel-export-dm"
                    label="Export DM Messages…"
                    action={() => openExportModal(channelId)}
                />
            );
        },

        // Group DM
        "gdm-context": (children: any[], { channel }: any) => {
            if (!channel?.id) return;
            children.push(
                <Menu.MenuSeparator key="export-sep-gdm" />,
                <Menu.MenuItem
                    key="vc-channel-export-gdm"
                    id="vc-channel-export-gdm"
                    label="Export Group Chat Messages…"
                    action={() => openExportModal(channel.id)}
                />
            );
        },
    },
});
