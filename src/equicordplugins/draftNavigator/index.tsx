/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import { Button } from "@components/Button";
import ErrorBoundary from "@components/ErrorBoundary";
import { NotesIcon as DraftIcon } from "@components/Icons";
import { EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";
import type { Channel, RenderModalProps } from "@vencord/discord-types";
import { ChannelRouter, ChannelStore, closeModal, DraftStore, DraftType, GuildStore, lodash, Modal, openModal, TextInput, UserStore, useState, useStateFromStores } from "@webpack/common";

const modalKey = "vc-draftNavigator";

interface DraftEntry {
    channelId: string;
    name: string;
    location: string;
    content: string;
    timestamp: number;
    available: boolean;
}

interface DraftRowProps {
    draft: DraftEntry;
    onClose: () => void;
}

function getChannelDetails(channel: Channel | undefined, channelId: string) {
    // keeps drafts visible even when their channels arent loaded
    if (!channel) {
        return { name: `Unknown channel (${channelId})`, location: "Channel unavailable" };
    }

    if (channel.isPrivate()) {
        const recipients = channel.recipients.map(id => {
            const user = UserStore.getUser(id);
            return user?.globalName || user?.username || id;
        }).join(", ");
        return {
            name: channel.name || recipients || "Direct message",
            location: channel.isGroupDM() ? "Group message" : "Direct message"
        };
    }

    const guild = GuildStore.getGuild(channel.guild_id);
    const parent = channel.parent_id ? ChannelStore.getChannel(channel.parent_id) : undefined;
    const location = [guild?.name || "Server", parent?.name].filter(Boolean).join(" / ");
    return { name: `#${channel.name}`, location };
}

function getDrafts(): DraftEntry[] {
    const userId = UserStore.getCurrentUser()?.id;
    if (!userId) return [];
    const drafts: DraftEntry[] = [];
    const userDrafts = DraftStore.getState()[userId] ?? {};
    for (const [channelId, channelDrafts] of Object.entries(userDrafts)) {
        const draft = channelDrafts?.[DraftType.ChannelMessage];
        if (!draft?.draft.trim()) continue;
        const channel = ChannelStore.getChannel(channelId);
        const { name, location } = getChannelDetails(channel, channelId);
        drafts.push({ channelId, name, location, content: draft.draft, timestamp: draft.timestamp, available: !!channel });
    }

    return drafts.sort((a, b) => b.timestamp - a.timestamp || a.channelId.localeCompare(b.channelId));
}

function DraftRow({ draft, onClose }: DraftRowProps) {
    const preview = draft.content.length > 500 ? draft.content.slice(0, 500) + "…" : draft.content;

    function jump() {
        ChannelRouter.transitionToChannel(draft.channelId);
        onClose();
    }

    return (
        <li className="vc-draftNavigator-row">
            <div className="vc-draftNavigator-details">
                <div className="vc-draftNavigator-name">{draft.name}</div>
                <div className="vc-draftNavigator-location">{draft.location}</div>
                <p className="vc-draftNavigator-preview">{preview}</p>
            </div>
            <Button size="small" disabled={!draft.available} aria-label={`Jump to ${draft.name}`} onClick={jump}>
                Jump
            </Button>
        </li>
    );
}

function DraftPanel(props: RenderModalProps) {
    const [search, setSearch] = useState("");
    const drafts = useStateFromStores([DraftStore, ChannelStore, GuildStore, UserStore], getDrafts, [], lodash.isEqual);
    const query = search.trim().toLocaleLowerCase();
    const results = query ? drafts.filter(draft =>
        [draft.name, draft.location, draft.content, draft.channelId].some(value => value.toLocaleLowerCase().includes(query))
    ) : drafts;
    const count = query ? `${results.length} of ${drafts.length}` : drafts.length;
    const emptyMessage = drafts.length ? "No matching drafts." : "No unsent drafts.";

    return (
        <Modal
            {...props}
            size="md"
            title="Draft Navigator"
            actions={[{ text: "Close", variant: "secondary", onClick: props.onClose }]}
        >
            <div className="vc-draftNavigator-panel">
                <TextInput
                    autoFocus
                    aria-label="Search drafts"
                    placeholder="Search channels, servers, or draft text"
                    value={search}
                    onChange={setSearch}
                />
                <div className="vc-draftNavigator-count" role="status">
                    {count} {drafts.length === 1 ? "draft" : "drafts"}
                </div>
                <ul className="vc-draftNavigator-list" aria-label="Unsent drafts">
                    {results.map(draft => <DraftRow key={draft.channelId} draft={draft} onClose={props.onClose} />)}
                </ul>
                {results.length === 0 ? <div className="vc-draftNavigator-empty">{emptyMessage}</div> : null}
            </div>
        </Modal>
    );
}

function openDraftNavigator() {
    openModal(props => <ErrorBoundary><DraftPanel {...props} /></ErrorBoundary>, { modalKey });
}

const DraftChatBarButton = ErrorBoundary.wrap<Parameters<ChatBarButtonFactory>[0]>(({ isAnyChat }) => {
    if (!isAnyChat) return null;
    return (
        <ChatBarButton tooltip="Draft Navigator" onClick={openDraftNavigator}>
            <DraftIcon width={20} height={20} />
        </ChatBarButton>
    );
}, { noop: true });

export default definePlugin({
    name: "DraftNavigator",
    description: "Search unsent drafts, preview their text, and jump to the channel.",
    authors: [EquicordDevs.rot],
    tags: ["Chat", "Utility"],
    dependencies: ["ChatInputButtonAPI"],

    chatBarButton: {
        icon: DraftIcon,
        render: props => <DraftChatBarButton {...props} />
    },

    toolboxActions: {
        "Open Draft Navigator": openDraftNavigator
    },

    settingsAboutComponent: ErrorBoundary.wrap(() => <Button onClick={openDraftNavigator}>Open Draft Navigator</Button>, { noop: true }),

    stop() {
        closeModal(modalKey);
    }
});
