/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { close_switcher, jump_to } from "@plugins/dmSearch/api/navigation";
import { settings } from "@plugins/dmSearch/settings";
import { ChannelMeta, MessageHit, SearchTab } from "@plugins/dmSearch/types";
import { avatar_url } from "@plugins/dmSearch/utils/avatar";
import { channel_info } from "@plugins/dmSearch/utils/channel";
import { fmt_bytes, fmt_time } from "@plugins/dmSearch/utils/format";
import { highlight } from "@plugins/dmSearch/utils/highlight";
import { ChannelStore, UserStore } from "@webpack/common";

interface Props {
    hit: MessageHit;
    query: string;
    tab: SearchTab;
    channel_meta: ChannelMeta | undefined;
    on_keep_open: () => void;
}

export function HitRow({ hit, query, tab, channel_meta, on_keep_open }: Props) {
    const channel = ChannelStore.getChannel(hit.channel_id);
    const me = UserStore.getCurrentUser?.();
    const is_self = !!me && hit.author?.id === me.id;
    const info = channel_info(hit.channel_id, channel_meta);
    const author = hit.author?.global_name || hit.author?.username || "Unknown";
    const is_bot = !!hit.author?.bot;

    const open = () => {
        if (settings.store.keepOpenAfterJump) {
            on_keep_open();
        } else {
            close_switcher();
        }
        void jump_to(hit.channel_id, hit.id, channel?.guild_id, channel_meta);
    };

    return (
        <div
            className="vc-dms-row"
            onMouseDown={e => {
                e.preventDefault();
                e.stopPropagation();
            }}
            onClick={e => {
                e.preventDefault();
                e.stopPropagation();
                open();
            }}
        >
            <img
                className="vc-dms-avatar"
                src={avatar_url(hit.author?.id, hit.author?.avatar)}
                alt=""
                loading="lazy"
            />
            <div className="vc-dms-body">
                <div className="vc-dms-meta">
                    <span className="vc-dms-author">{author}</span>
                    {info.kind === "dm" && <span className="vc-dms-tag">DM</span>}
                    {info.kind === "dm" && is_self && <span className="vc-dms-context">to {info.target}</span>}
                    {info.kind === "group" && <span className="vc-dms-tag">GROUP</span>}
                    {info.kind === "group" && <span className="vc-dms-context">{info.target}</span>}
                    {info.kind === "server" && <span className="vc-dms-context">{info.target}</span>}
                    {info.kind === "server" && info.server && <span className="vc-dms-context-muted">{info.server}</span>}
                    {is_bot && <span className="vc-dms-bot-tag">BOT</span>}
                    <span className="vc-dms-time">{fmt_time(hit.timestamp)}</span>
                </div>
                <Body hit={hit} query={query} tab={tab} />
            </div>
        </div>
    );
}

function Body({ hit, query, tab }: { hit: MessageHit; query: string; tab: SearchTab; }) {
    if (tab === "media") return <MediaBody hit={hit} query={query} />;
    if (tab === "files") return <FilesBody hit={hit} query={query} />;
    return <TextBody content={hit.content} query={query} />;
}

function TextBody({ content, query }: { content: string; query: string; }) {
    if (!content) {
        return <div className="vc-dms-text"><span className="vc-dms-muted">[no text]</span></div>;
    }
    return <div className="vc-dms-text">{highlight(content, query)}</div>;
}

function MediaBody({ hit, query }: { hit: MessageHit; query: string; }) {
    const items = (hit.attachments ?? []).filter(a =>
        a.content_type?.startsWith?.("image/") || a.content_type?.startsWith?.("video/")
    );
    return (
        <div className="vc-dms-media">
            {items.length > 0 && (
                <div className="vc-dms-thumbs">
                    {items.slice(0, 4).map(a => a.content_type?.startsWith?.("video/")
                        ? <video key={a.id} className="vc-dms-thumb" src={a.proxy_url} muted preload="metadata" />
                        : <img key={a.id} className="vc-dms-thumb" src={a.proxy_url} alt={a.filename ?? ""} loading="lazy" />
                    )}
                </div>
            )}
            {hit.content && <TextBody content={hit.content} query={query} />}
        </div>
    );
}

function FilesBody({ hit, query }: { hit: MessageHit; query: string; }) {
    const files = (hit.attachments ?? []).filter(f =>
        !f.content_type?.startsWith?.("image/")
        && !f.content_type?.startsWith?.("video/")
        && !f.content_type?.startsWith?.("audio/")
    );
    return (
        <div className="vc-dms-files">
            {files.map(f => (
                <div key={f.id} className="vc-dms-file">
                    <span className="vc-dms-file-name">{f.filename ?? "file"}</span>
                    <span className="vc-dms-file-meta">{`${f.content_type ?? "file"} · ${fmt_bytes(f.size ?? 0)}`}</span>
                </div>
            ))}
            {hit.content && <TextBody content={hit.content} query={query} />}
        </div>
    );
}