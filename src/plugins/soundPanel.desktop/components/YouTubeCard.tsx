/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 cegged
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { playLibrarySound, playTrack } from "@plugins/soundPanel.desktop/audio/player";
import { loadYouTubePreview, playPendingSong, type YouTubePreview } from "@plugins/soundPanel.desktop/audio/youtube";
import { downloadLabel, type LibraryItem, type PendingSong } from "@plugins/soundPanel.desktop/data/library";
import { showError } from "@plugins/soundPanel.desktop/utils/logger";
import { useEffect, useState } from "@webpack/common";

import { cl } from "./common";
import { MusicNoteIcon, PlayIcon, SaveIcon } from "./icons";

const PROBLEMS = {
    missing: { title: "This video doesn't exist", detail: "It may have been deleted. Check the link" },
    restricted: { title: "No preview for this video", detail: "It may be private, or its owner keeps it on YouTube only" },
    unreachable: { title: "Couldn't load the preview", detail: "You can still try to download it" }
};

function useThumbnailUrl(thumbnail: Uint8Array<ArrayBuffer> | null | undefined) {
    const [url, setUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!thumbnail) {
            setUrl(null);
            return;
        }

        const objectUrl = URL.createObjectURL(new Blob([thumbnail], { type: "image/jpeg" }));
        setUrl(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [thumbnail]);

    return url;
}

export function YouTubeCard({ videoId, saved, pending, busy, onDownload, onClose }: {
    videoId: string;
    saved?: LibraryItem;
    pending?: PendingSong;
    busy: string | null;
    onDownload(): void;
    onClose(): void;
}) {
    const [preview, setPreview] = useState<YouTubePreview | null>(null);
    const thumbnailUrl = useThumbnailUrl(preview?.thumbnail);

    useEffect(() => {
        let current = true;
        setPreview(null);

        loadYouTubePreview(videoId).then(
            result => current && setPreview(result),
            () => current && setPreview({ videoId, video: { found: false, reason: "unreachable" }, thumbnail: null })
        );

        return () => { current = false; };
    }, [videoId]);

    const video = preview?.video;
    const problem = video && !video.found ? PROBLEMS[video.reason] : null;
    const canDownload = !(video && !video.found && video.reason === "missing");

    const title = !video ? "Looking up the video..." : video.found ? video.title : problem!.title;
    const detail = saved ? (saved.kind === "music" ? "Already in your music" : "Already in My Sounds")
        : pending ? downloadLabel(pending)
            : video?.found ? video.channel : problem?.detail;

    const play = () => {
        if (saved) {
            (saved.kind === "music" ? playTrack(saved.id) : playLibrarySound(saved))
                .catch(err => showError(`Couldn't play "${saved.name}"`, err));
        } else if (pending) {
            playPendingSong(pending.id);
        }
        onClose();
    };

    return (
        <div className={cl("youtube-card")} role="group" aria-label="YouTube link">
            <span className={cl("youtube-thumbnail")}>
                {thumbnailUrl ? <img src={thumbnailUrl} alt="" /> : <MusicNoteIcon size={22} />}
            </span>
            <div className={cl("youtube-info")}>
                <div className={cl("youtube-title", { "youtube-title-quiet": !video?.found })} title={title}>{title}</div>
                {detail && <div className={cl("youtube-detail")}>{detail}</div>}
                <div className={cl("youtube-actions")}>
                    {saved || pending ? (
                        <button type="submit" className={cl("action-button", "primary")} onClick={play}>
                            <PlayIcon size={16} />
                            <span>Play</span>
                        </button>
                    ) : canDownload && (
                        <button type="submit" className={cl("action-button", "primary")} disabled={!!busy} onClick={onDownload}>
                            <SaveIcon size={16} />
                            <span>{busy ?? "Download"}</span>
                        </button>
                    )}
                    <button type="button" className={cl("action-button")} onClick={onClose}>Cancel</button>
                </div>
            </div>
        </div>
    );
}
