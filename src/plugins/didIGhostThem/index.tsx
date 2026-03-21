/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import {
    ChannelStore,
    FluxDispatcher,
    MessageStore,
    ReadStateStore,
    SnowflakeUtils,
    UserStore,
    useStateFromStores } from "@webpack/common";

// only use cached msgs to avoid api abuse
const cache = new Map<string, { id: string; name: string; content: string; }>();

function stripMarkdown(s: string) {
    return s
        .replace(/<a?:(\w+):\d+>/g, ":$1:")
        .replace(/<@!?\d+>/g, "@user")
        .replace(/<#\d+>/g, "#channel")
        .replace(/https?:\/\/\S+/g, "[link]")
        .replace(/\*{1,2}(.+?)\*{1,2}/g, "$1")
        .replace(/~~(.+?)~~/g, "$1");
}

function getInfo(channelId: string) {
    const msg = MessageStore.getLastMessage(channelId);
    if (msg?.author) return {
        id: msg.author.id,
        name: (msg.author as any).globalName ?? msg.author.username,
        content: msg.content ?? "",
        hasAttachment: (msg.attachments?.length ?? 0) > 0
    };
    const c = cache.get(channelId);
    if (c) return { ...c, hasAttachment: false };
    return null;
}

function timeAgo(ts: number) {
    const d = Date.now() - ts;
    const m = Math.floor(d / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

function onMessage({ message, channelId }: any) {
    if (!message?.author) return;
    const ch = ChannelStore.getChannel(channelId);
    if (!ch?.isDM()) return;
    cache.set(channelId, {
        id: message.author.id,
        name: message.author.global_name ?? message.author.username,
        content: message.content ?? ""
    });
}

function onLoad({ channelId }: any) {
    if (cache.has(channelId)) return;
    const msg = MessageStore.getLastMessage(channelId);
    if (msg?.author) cache.set(channelId, {
        id: msg.author.id,
        name: (msg.author as any).globalName ?? msg.author.username,
        content: msg.content ?? ""
    });
}

function init() {
    for (const ch of ChannelStore.getSortedPrivateChannels()) {
        if (!ch.isDM() || cache.has(ch.id)) continue;
        const msg = MessageStore.getLastMessage(ch.id);
        if (msg?.author) cache.set(ch.id, {
            id: msg.author.id,
            name: (msg.author as any).globalName ?? msg.author.username,
            content: msg.content ?? ""
        });
    }
}

function GhostSubtitle({ channel }: { channel: any; }) {
    useStateFromStores([MessageStore, ReadStateStore], () =>
        (MessageStore.getLastMessage(channel.id)?.id ?? "") + ReadStateStore.lastMessageId(channel.id)
    );

    const me = UserStore.getCurrentUser();
    if (!me) return null;

    const info = getInfo(channel.id);
    if (!info) {
        if (!channel.lastMessageId) return null;
        const ts = SnowflakeUtils.extractTimestamp(channel.lastMessageId);
        return <div className="vc-ghost-sub vc-ghost-unknown">{timeAgo(ts)}</div>;
    }

    const isMe = info.id === me.id;
    const unread = ReadStateStore.hasUnread(channel.id);
    const who = isMe ? "You" : info.name;

    let preview = stripMarkdown(info.content);
    preview = preview.length > 20 ? preview.slice(0, 20) + "…" : preview;
    if (!preview) preview = info.hasAttachment ? "sent a file" : "sent something";

    const cls = isMe ? "vc-ghost-you" : unread ? "vc-ghost-unread" : "vc-ghost-ghosting";

    return (
        <div className={`vc-ghost-sub ${cls}`}>
            {!isMe && !unread && "👻 "}{unread && !isMe && "💬 "}{who}: {preview}
        </div>
    );
}

// <wtl2026>
export default definePlugin({
    name: "DidIGhostThem",
    description: "shows who sent the last message in your dms",
    authors: [Devs.wtl],
    patches: [{
        find: "PrivateChannel.renderAvatar",
        replacement: {
            match: /subText:(\i\.isSystemDM\(\)\?.+?:null)/,
            replace: "subText:[$1,$self.GhostSubtitle({channel:arguments[0]?.channel})]"
        }
    }],

    GhostSubtitle,

    start() {
        FluxDispatcher.subscribe("MESSAGE_CREATE", onMessage);
        FluxDispatcher.subscribe("LOAD_MESSAGES_SUCCESS", onLoad);
        init();
        setTimeout(init, 5000);
    },
    stop() {
        FluxDispatcher.unsubscribe("MESSAGE_CREATE", onMessage);
        FluxDispatcher.unsubscribe("LOAD_MESSAGES_SUCCESS", onLoad);
        cache.clear();
    }
});
