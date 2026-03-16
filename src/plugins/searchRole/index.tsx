/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { getCurrentGuild } from "@utils/discord";
import { ModalContent, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { Avatar, Button, ChannelStore, FluxDispatcher, GuildChannelStore, GuildMemberStore, GuildRoleStore, IconUtils, Menu, NavigationRouter, Parser, RestAPI, ScrollerThin, Select, showToast, Text, TextInput, Timestamp, Toasts, UserStore, useEffect, useMemo, useState } from "@webpack/common";

const MAX_AUTHORS = 50;

const HAS_OPTIONS = [
    { value: "image", label: "Image" },
    { value: "video", label: "Video" },
    { value: "file", label: "File" },
    { value: "embed", label: "Embed" },
    { value: "link", label: "Link" },
];

interface SearchMessage {
    id: string;
    channel_id: string;
    author: { id: string; username: string; };
    content: string;
    timestamp: string;
}

interface SearchResponse {
    messages: SearchMessage[][];
    total_results: number;
}

function SearchResultsModal({ modalProps, guildId, authorIds, roleName, truncated }: {
    modalProps: ModalProps;
    guildId: string;
    authorIds: string[];
    roleName: string;
    truncated: boolean;
}) {
    const [messages, setMessages] = useState<SearchMessage[]>([]);
    const [totalResults, setTotalResults] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [channelIds, setChannelIds] = useState<string[]>([]);
    const [content, setContent] = useState("");
    const [has, setHas] = useState<string[]>([]);

    const channelOptions = useMemo(() =>
        GuildChannelStore.getSelectableChannels(guildId).map(({ channel }) => ({
            value: channel.id,
            label: channel.isNSFW() ? "🔞 #" + channel.name + " (NSFW)" : "#" + channel.name,
            disabled: channel.isNSFW(),
        })),
        [guildId]
    );

    async function runSearch(offset: number) {
        setLoading(true);
        if (offset === 0) {
            setMessages([]);
            setTotalResults(null);
        }
        setError(null);
        try {
            const query: Record<string, any> = { author_id: authorIds, offset };
            if (channelIds.length) query.channel_id = channelIds;
            if (content.trim()) query.content = content.trim();
            if (has.length) query.has = has;
            const { body } = await RestAPI.get({
                url: `/guilds/${guildId}/messages/search`,
                query,
            });
            const result = body as SearchResponse;
            setMessages(prev => offset === 0 ? result.messages.flat() : [...prev, ...result.messages.flat()]);
            setTotalResults(result.total_results);
        } catch (e: any) {
            setError(e?.body?.message ?? e?.message ?? "Unknown error");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { runSearch(0); }, [has, channelIds]);

    function toggleChannel(id: string) {
        setChannelIds(prev => prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]);
    }

    function toggleHas(value: string) {
        setHas(prev =>
            prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
        );
    }

    return (
        <ModalRoot {...modalProps} size={ModalSize.LARGE}>
            <ModalHeader>
                <Text variant="heading-lg/semibold">
                    {"Messages from @" + roleName}
                    {totalResults !== null && ` — ${totalResults} result${totalResults !== 1 ? "s" : ""}`}
                    {truncated && ` (first ${MAX_AUTHORS} members only)`}
                </Text>
            </ModalHeader>
            <ModalContent>
                <div style={{ padding: "12px 0 8px", display: "flex", flexDirection: "column", gap: "8px", borderBottom: "1px solid var(--background-modifier-accent)" }}>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <div style={{ flex: "1 1 180px" }}>
                            <Select
                                options={channelOptions}
                                placeholder={channelIds.length ? `${channelIds.length} channel${channelIds.length !== 1 ? "s" : ""} selected` : "All channels"}
                                isSelected={v => channelIds.includes(v)}
                                select={toggleChannel}
                                serialize={v => String(v)}
                                clearable={channelIds.length > 0}
                                clear={() => setChannelIds([])}
                            />
                            {channelIds.length > 0 && (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "6px" }}>
                                    {channelIds.map(id => {
                                        const opt = channelOptions.find(o => o.value === id);
                                        return (
                                            <div key={id} style={{ display: "flex", alignItems: "center", gap: "4px", background: "var(--background-secondary)", borderRadius: "4px", padding: "2px 8px", fontSize: "12px" }}>
                                                <span style={{ color: "var(--text-normal)" }}>{opt?.label ?? id}</span>
                                                <span
                                                    role="button"
                                                    style={{ cursor: "pointer", color: "var(--text-muted)", fontWeight: "bold" }}
                                                    onClick={() => toggleChannel(id)}
                                                >×</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        <div style={{ flex: "2 1 200px", display: "flex", gap: "6px" }}>
                            <div style={{ flex: 1 }}>
                                <TextInput
                                    placeholder="Search message content..."
                                    value={content}
                                    onChange={setContent}
                                    onKeyDown={(e: React.KeyboardEvent) => {
                                        if (e.key === "Enter") runSearch(0);
                                    }}
                                />
                            </div>
                            <Button size={Button.Sizes.MEDIUM} onClick={() => runSearch(0)}>
                                Search
                            </Button>
                        </div>
                    </div>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        <Text variant="text-xs/medium" style={{ color: "var(--text-muted)" }}>Has:</Text>
                        {HAS_OPTIONS.map(opt => (
                            <Button
                                key={opt.value}
                                size={Button.Sizes.SMALL}
                                look={Button.Looks.FILLED}
                                color={has.includes(opt.value) ? Button.Colors.BRAND : Button.Colors.PRIMARY}
                                onClick={() => toggleHas(opt.value)}
                            >
                                {opt.label}
                            </Button>
                        ))}
                    </div>
                </div>

                {error && (
                    <Text variant="text-md/normal" style={{ color: "var(--text-danger)", padding: "8px 0" }}>
                        {"Error: " + error}
                    </Text>
                )}

                <ScrollerThin orientation="auto" style={{ maxHeight: "60vh" }}>
                    {messages.map(msg => {
                        const user = UserStore.getUser(msg.author.id);
                        const channel = ChannelStore.getChannel(msg.channel_id);
                        return (
                            <div
                                key={msg.id}
                                style={{
                                    padding: "8px 4px",
                                    borderBottom: "1px solid var(--background-modifier-accent)",
                                    display: "flex",
                                    gap: "12px",
                                    alignItems: "flex-start",
                                }}
                            >
                                <Avatar
                                    src={user ? IconUtils.getUserAvatarURL(user, false, 32) : undefined}
                                    size="SIZE_32"
                                    aria-hidden
                                />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: "flex", gap: "6px", alignItems: "baseline", marginBottom: "2px", flexWrap: "wrap" }}>
                                        <Text variant="text-md/semibold">
                                            {user?.username ?? msg.author.username}
                                        </Text>
                                        {channel && (
                                            <Text variant="text-xs/normal" style={{ color: "var(--text-muted)" }}>
                                                {"#" + channel.name}
                                            </Text>
                                        )}
                                        <Text variant="text-xs/normal" style={{ color: "var(--text-muted)" }}>
                                            <Timestamp timestamp={new Date(msg.timestamp)} />
                                        </Text>
                                        <Button
                                            size={Button.Sizes.TINY}
                                            look={Button.Looks.LINK}
                                            style={{ marginLeft: "auto", padding: "0 4px" }}
                                            onClick={() => {
                                                modalProps.onClose();
                                                NavigationRouter.transitionTo(`/channels/${guildId}/${msg.channel_id}/${msg.id}`);
                                            }}
                                        >
                                            Jump
                                        </Button>
                                    </div>
                                    <Text variant="text-sm/normal">
                                        {msg.content
                                            ? Parser.parse(msg.content)
                                            : <em style={{ opacity: 0.5 }}>No text content</em>
                                        }
                                    </Text>
                                </div>
                            </div>
                        );
                    })}
                    {loading && (
                        <Text variant="text-md/normal" style={{ textAlign: "center", padding: "16px", color: "var(--text-muted)" }}>
                            Loading...
                        </Text>
                    )}
                    {!loading && totalResults !== null && messages.length < totalResults && (
                        <Button
                            style={{ margin: "12px auto", display: "block" }}
                            onClick={() => runSearch(messages.length)}
                        >
                            {`Load More (${messages.length} / ${totalResults} fetched)`}
                        </Button>
                    )}
                    {!loading && totalResults === 0 && (
                        <Text variant="text-md/normal" style={{ textAlign: "center", padding: "16px", color: "var(--text-muted)" }}>
                            No messages found.
                        </Text>
                    )}
                </ScrollerThin>
            </ModalContent>
        </ModalRoot>
    );
}

export default definePlugin({
    name: "SearchRole",
    description: "Search for messages from all users with a specific role. Right-click a role badge (requires Developer Mode enabled in Discord settings).",
    authors: [{ name: "Your Name", id: 0n }],

    contextMenus: {
        "dev-context"(children, { id }: { id: string; }) {
            const guild = getCurrentGuild();
            if (!guild) return;

            const role = GuildRoleStore.getRole(guild.id, id);
            if (!role) return;

            children.push(
                <Menu.MenuItem
                    id="vc-search-role-messages"
                    label="Search Messages from Role"
                    action={() => {
                        const allWithRole = GuildMemberStore.getMemberIds(guild.id)
                            .filter(userId => {
                                const member = GuildMemberStore.getMember(guild.id, userId);
                                return member?.roles?.includes(role.id);
                            });

                        if (allWithRole.length === 0) {
                            FluxDispatcher.dispatch({
                                type: "GUILD_MEMBERS_REQUEST",
                                guildIds: [guild.id],
                                roles: [role.id],
                                limit: 100
                            });
                            showToast("Fetching role members — please try again in a moment", Toasts.Type.MESSAGE);
                            return;
                        }

                        const truncated = allWithRole.length > MAX_AUTHORS;
                        const authorIds = allWithRole.slice(0, MAX_AUTHORS);

                        openModal(modalProps => (
                            <SearchResultsModal
                                modalProps={modalProps}
                                guildId={guild.id}
                                authorIds={authorIds}
                                roleName={role.name}
                                truncated={truncated}
                            />
                        ));
                    }}
                />
            );
        }
    }
});
