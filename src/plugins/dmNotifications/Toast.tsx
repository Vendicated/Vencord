/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import type { Channel, Message } from "@vencord/discord-types";
import {
    GuildStore,
    IconUtils,
    NavigationRouter,
    Parser,
    SelectedChannelStore,
    useEffect,
    useMemo,
    UserStore,
    useState
} from "@webpack/common";

import ReplyBar from "./ReplyBar";
import { removeToast } from "./store";

interface Props {
    id: number;
    message: Message;
    channel: Channel;
    duration: number;
    showReplyBar: boolean;
    closeOnReply: boolean;
}

function getContext(channel: Channel): { label: string; sub?: string; } {
    if (channel.isDM()) return { label: "Direct Message" };
    if (channel.isGroupDM?.() || channel.isMultiUserDM?.()) return { label: channel.name || "Group DM" };
    const guild = channel.guild_id ? GuildStore.getGuild(channel.guild_id) : null;
    return { label: `#${channel.name}`, sub: guild?.name };
}

function Toast({ id, message, channel, duration, showReplyBar, closeOnReply }: Props) {
    const [closing, setClosing] = useState(false);
    const [hovered, setHovered] = useState(false);
    const [elapsed, setElapsed] = useState(0);

    const close = () => {
        if (closing) return;
        setClosing(true);
        setTimeout(() => removeToast(id), 220);
    };

    useEffect(() => {
        if (hovered || duration <= 0) return;
        const start = Date.now() - elapsed;
        const interval = setInterval(() => {
            const e = Date.now() - start;
            if (e >= duration * 1000) close();
            else setElapsed(e);
        }, 50);
        return () => clearInterval(interval);
    }, [hovered]);

    const avatar = useMemo(() => IconUtils.getUserAvatarURL(message.author, true), [message.author]);
    const context = useMemo(() => getContext(channel), [channel]);

    const content = useMemo(() => {
        if (!message.content) {
            if (message.attachments?.length) return <i>sent an attachment</i>;
            if (message.embeds?.length) return <i>sent an embed</i>;
            if ((message as any).sticker_items?.length) return <i>sent a sticker</i>;
            return null;
        }
        try {
            return Parser.parse(message.content, true, {
                channelId: message.channel_id,
                messageId: message.id,
                allowLinks: true,
                allowEmojiLinks: true,
                viewingChannelId: SelectedChannelStore.getChannelId()
            });
        } catch {
            return message.content;
        }
    }, [message.content]);

    function openChannel() {
        const path = channel.guild_id
            ? `/channels/${channel.guild_id}/${channel.id}`
            : `/channels/@me/${channel.id}`;
        NavigationRouter.transitionTo(path);
    }

    return (
        <div
            className={`vc-dmn-toast${closing ? " vc-dmn-toast-closing" : ""}`}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <div className="vc-dmn-toast-surface">
                <div className="vc-dmn-toast-clickable" onClick={openChannel}>
                    <img className="vc-dmn-avatar" src={avatar} alt="" />
                    <div className="vc-dmn-body">
                        <div className="vc-dmn-header">
                            <span className="vc-dmn-username">{UserStore.getUser(message.author.id)?.username ?? message.author.username}</span>
                            <span className="vc-dmn-context">{context.label}{context.sub ? ` · ${context.sub}` : ""}</span>
                        </div>
                        <div className="vc-dmn-content">{content}</div>
                    </div>
                    <button
                        className="vc-dmn-close"
                        onClick={e => { e.stopPropagation(); close(); }}
                        aria-label="Dismiss"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M18.4 4L12 10.4L5.6 4L4 5.6L10.4 12L4 18.4L5.6 20L12 13.6L18.4 20L20 18.4L13.6 12L20 5.6L18.4 4Z" />
                        </svg>
                    </button>
                </div>

                {duration > 0 && (
                    <div
                        className="vc-dmn-progress"
                        style={{ width: `${Math.max(0, 100 - (elapsed / (duration * 1000)) * 100)}%` }}
                    />
                )}
            </div>

            {showReplyBar && (
                <ReplyBar
                    channel={channel}
                    replyTo={message}
                    onSent={() => { if (closeOnReply) close(); }}
                />
            )}
        </div>
    );
}

export default ErrorBoundary.wrap(Toast, { noop: true });
