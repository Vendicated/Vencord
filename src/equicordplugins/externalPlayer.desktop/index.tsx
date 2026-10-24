/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { VideoIcon } from "@components/Icons";
import { EquicordDevs } from "@utils/constants";
import { isNonNullish } from "@utils/guards";
import definePlugin, { OptionType } from "@utils/types";
import { Message } from "@vencord/discord-types";
import { Menu, showToast } from "@webpack/common";
import type { ReactNode } from "react";

import { HideWhileOpen, Status } from "./components";
import { Native, play, playerNames, startPolling, stopPolling, useStatusStore } from "./store";
import type { MediaItem } from "./types";
import { canOpen, mediaKey } from "./utils";

const settings = definePluginSettings({
    player: {
        type: OptionType.SELECT,
        description: "Which player to open media in.",
        options: [
            { label: "mpv", value: "mpv", default: true },
            { label: "VLC", value: "vlc" }
        ] as const
    },
    openOnClick: {
        type: OptionType.BOOLEAN,
        description: "Open videos and audio in the player when you press play, instead of playing them in Discord.",
        default: false
    },
    path: {
        type: OptionType.STRING,
        description: "Absolute path to the player executable. Leave empty to use the one on your PATH.",
        default: ""
    },
    args: {
        type: OptionType.STRING,
        description: "Extra arguments passed to the player. Wrap values with spaces in quotes.",
        default: ""
    }
});

const mediaExtensions = /\.(mp4|webm|mov|m4v|mkv|mp3|ogg|oga|wav|flac|m4a|opus)$/i;

function getMedia(message: Message) {
    const media: MediaItem[] = [];

    for (const a of message.attachments)
        if (/^(video|audio)\//.test(a.content_type ?? ""))
            media.push({ url: a.url, name: a.filename, keys: [mediaKey(a.url)] });

    for (const e of message.embeds)
        if (e.video)
            media.push({
                url: e.type === "video" && e.provider ? e.url : e.video.proxyURL ?? e.video.url,
                name: e.rawTitle || e.provider?.name || e.url,
                keys: [e.url, e.video.url, e.video.proxyURL, e.thumbnail?.url, e.thumbnail?.proxyURL].filter(isNonNullish).map(mediaKey)
            });

    return media;
}

function openItem(media: Pick<MediaItem, "url" | "name">[]) {
    return (
        <Menu.MenuItem
            id="vc-external-player"
            label={`Open in ${playerNames[settings.store.player ?? "mpv"]}`}
            icon={VideoIcon}
            leadingAccessory={{ type: "icon", icon: VideoIcon }}
            action={media.length === 1 ? () => play(media[0].url) : undefined}
        >
            {media.length > 1 ? media.map((m, i) => (
                <Menu.MenuItem key={m.url} id={`vc-external-player-${i}`} label={m.name} action={() => play(m.url)} />
            )) : null}
        </Menu.MenuItem>
    );
}

const messageContextMenuPatch: NavContextMenuPatchCallback = (children, { message, mediaItem, itemSrc }) => {
    let media = getMedia(message);
    const src = mediaItem?.url ?? mediaItem?.downloadUrl ?? itemSrc;
    if (src) media = media.filter(m => m.keys.includes(mediaKey(src)));
    if (!media.length) return;

    (findGroupChildrenByChildId("copy-link", children) ?? children).push(openItem(media));
};

const imageContextMenuPatch: NavContextMenuPatchCallback = (children, { src }: { src?: string; }) => {
    if (!src || !canOpen(src) || !mediaExtensions.test(URL.parse(src)?.pathname ?? "")) return;
    children.push(<Menu.MenuGroup>{openItem([{ url: src, name: src }])}</Menu.MenuGroup>);
};

export default definePlugin({
    name: "ExternalPlayer",
    description: "Open videos and audio in an external media player like mpv.",
    tags: ["Media"],
    authors: [EquicordDevs.creations],
    settings,

    patches: [
        {
            find: "renderControls(){",
            group: true,
            replacement: [
                {
                    match: /(?<=handleVideoClick=(\i)=>\{)/,
                    replace: "if($self.interceptPlay(this.props.src))return $1.stopPropagation();"
                },
                {
                    match: /(?<=setPlay=(\i)=>\{)/,
                    replace: "if($1&&$self.interceptPlay(this.props.src))return;"
                },
                {
                    match: /this\.renderControls\(\)/,
                    replace: "$self.renderControls(this.props.src,$&)"
                },
                {
                    match: /(?<=this\.renderPlayPausePop\(\):null,)/,
                    replace: "$self.renderStatus(this.props.src),"
                }
            ]
        }
    ],

    interceptPlay(src: string) {
        if (!settings.store.openOnClick || !Native || !canOpen(src)) return false;
        const status = useStatusStore.getState().statuses[mediaKey(src)];
        if (!status) play(src);
        else if (status.controllable) Native.togglePause(src);
        else showToast({ text: `Already open in ${playerNames[status.player]}.` });
        return true;
    },

    renderStatus(src: string) {
        return <Status src={src} />;
    },

    renderControls(src: string, controls: ReactNode) {
        return <HideWhileOpen src={src}>{controls}</HideWhileOpen>;
    },

    start() {
        if (Native) startPolling();
    },

    stop: stopPolling,

    contextMenus: {
        "message": messageContextMenuPatch,
        "image-context": imageContextMenuPatch
    }
});
