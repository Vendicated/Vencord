/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 cegged
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import {
    cycleRepeatMode,
    musicStore,
    playTrack,
    seekMusic,
    skipTrack,
    toggleMusic,
    toggleShuffle
} from "@plugins/soundPanel.desktop/audio/player";
import { playFromYouTube, playPendingSong } from "@plugins/soundPanel.desktop/audio/youtube";
import {
    downloadLabel,
    LibraryItem,
    type PendingSong,
    updateItem,
    useCoverUrl,
    useLibrary,
    useLibrarySong,
    usePendingSongs,
    useYouTubePreparing
} from "@plugins/soundPanel.desktop/data/library";
import { settings } from "@plugins/soundPanel.desktop/settings";
import { showError } from "@plugins/soundPanel.desktop/utils/logger";
import { Native } from "@plugins/soundPanel.desktop/utils/native";
import { useStore } from "@plugins/soundPanel.desktop/utils/store";
import { youTubeVideoId } from "@plugins/soundPanel.desktop/utils/youtube";
import { showToast, useEffect, useState } from "@webpack/common";
import type { CSSProperties } from "react";

import { cl, EmptyState, FileDropZone, formatTime, matchesQuery, RangeSlider, RenameInput, SearchBox, UploadButton } from "./common";
import {
    MusicNoteIcon,
    NextIcon,
    PauseIcon,
    PlayIcon,
    PreviousIcon,
    RepeatIcon,
    RepeatOneIcon,
    ShuffleIcon,
    SpeakerIcon
} from "./icons";
import { openLibraryItemMenu, openPendingSongMenu } from "./LibraryItemMenu";
import { YouTubeCard } from "./YouTubeCard";

function run(action: () => Promise<unknown>) {
    action().catch(err => showError("Couldn't play this track", err));
}

function SeekBar({ fallbackDuration }: { fallbackDuration: number; }) {
    const position = useStore(musicStore, s => s.position);
    const duration = useStore(musicStore, s => s.duration) || fallbackDuration;

    return (
        <div className={cl("seek")}>
            <span className={cl("time")}>{formatTime(position)}</span>
            <RangeSlider label="Seek" value={Math.min(position, duration)} max={duration || 1} step={0.1} onChange={seekMusic} />
            <span className={cl("time")}>{formatTime(duration)}</span>
        </div>
    );
}

function Cover({ track, className, iconSize }: { track: { id: string; cover?: boolean; } | undefined; className: string; iconSize: number; }) {
    const cover = useCoverUrl(track);

    return (
        <span className={className}>
            {cover ? <img className={cl("cover")} src={cover} alt="" /> : <MusicNoteIcon size={iconSize} />}
        </span>
    );
}

function NowPlaying({ tracks }: { tracks: LibraryItem[]; }) {
    const currentId = useStore(musicStore, s => s.currentId);
    const playing = useStore(musicStore, s => s.playing);
    const { repeatMode, shuffle, musicVolume } = settings.use(["repeatMode", "shuffle", "musicVolume"]);
    const track = tracks.find(t => t.id === currentId);

    return (
        <section className={cl("now-playing")}>
            <div className={cl("now-playing-info")}>
                <Cover track={track} className={cl("now-playing-art", { "art-playing": playing })} iconSize={22} />
                <div className={cl("now-playing-text")}>
                    <div className={cl("now-playing-title")}>{track?.name ?? "Nothing playing"}</div>
                    <div className={cl("now-playing-subtitle")}>
                        {track ? [track.artist, `${tracks.indexOf(track) + 1} of ${tracks.length}`].filter(Boolean).join(" · ")
                            : `${tracks.length} track${tracks.length === 1 ? "" : "s"} in your library`}
                    </div>
                </div>
            </div>

            <SeekBar fallbackDuration={track?.duration ?? 0} />

            <div className={cl("controls")}>
                <div className={cl("transport")}>
                    <button
                        type="button"
                        className={cl("icon-button", { "icon-button-active": shuffle })}
                        aria-label="Shuffle"
                        aria-pressed={shuffle}
                        title={shuffle ? "Shuffle on" : "Shuffle off"}
                        onClick={toggleShuffle}
                    >
                        <ShuffleIcon size={18} />
                    </button>
                    <button type="button" className={cl("icon-button")} aria-label="Previous" title="Previous" onClick={() => run(() => skipTrack(-1))}>
                        <PreviousIcon size={18} />
                    </button>
                    <button
                        type="button"
                        className={cl("play-button")}
                        aria-label={playing ? "Pause" : "Play"}
                        disabled={!tracks.length}
                        onClick={() => run(toggleMusic)}
                    >
                        {playing ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
                    </button>
                    <button type="button" className={cl("icon-button")} aria-label="Next" title="Next" onClick={() => run(() => skipTrack(1))}>
                        <NextIcon size={18} />
                    </button>
                    <button
                        type="button"
                        className={cl("icon-button", { "icon-button-active": repeatMode !== "off" })}
                        aria-label="Repeat"
                        title={repeatMode === "one" ? "Repeat one" : repeatMode === "all" ? "Repeat all" : "Repeat off"}
                        onClick={cycleRepeatMode}
                    >
                        {repeatMode === "one" ? <RepeatOneIcon size={18} /> : <RepeatIcon size={18} />}
                    </button>
                </div>

                <label className={cl("inline-volume")} title={`Music volume: ${musicVolume}%`}>
                    <SpeakerIcon size={16} />
                    <RangeSlider label="Music volume" value={musicVolume} onChange={v => settings.store.musicVolume = v} />
                </label>
            </div>
        </section>
    );
}

function TrackRow({ track, active, playing, editing, setEditing }: {
    track: LibraryItem;
    active: boolean;
    playing: boolean;
    editing: boolean;
    setEditing(editing: boolean): void;
}) {
    const onClick = () => {
        if (editing) return;
        run(() => active ? toggleMusic() : playTrack(track.id));
    };

    return (
        <div
            role="button"
            tabIndex={0}
            className={cl("track", { "track-active": active })}
            onClick={onClick}
            onKeyDown={e => (e.key === "Enter" || e.key === " ") && onClick()}
            onContextMenu={e => openLibraryItemMenu(e, track, () => setEditing(true))}
        >
            <Cover track={track} className={cl("track-cover", { "art-playing": active && playing })} iconSize={14} />
            {editing ? (
                <RenameInput
                    initialValue={track.name}
                    onDone={name => {
                        setEditing(false);
                        if (name && name !== track.name) void updateItem(track.id, { name });
                    }}
                />
            ) : (
                <span className={cl("track-text")}>
                    <span className={cl("track-name")}>{track.name}</span>
                    {track.artist && <span className={cl("track-artist")}>{track.artist}</span>}
                </span>
            )}
            <span className={cl("track-duration")}>{formatTime(track.duration)}</span>
        </div>
    );
}

function PendingRow({ song }: { song: PendingSong; }) {
    const onClick = () => playPendingSong(song.id);
    const percent = song.progress === null ? null : Math.round(song.progress * 100);

    return (
        <div
            role="button"
            tabIndex={0}
            className={cl("track", "track-pending")}
            style={{ "--vc-soundpanel-progress": `${percent ?? 0}%`, "--vc-soundpanel-percent": percent ?? 0 } as CSSProperties}
            title={downloadLabel(song)}
            onClick={onClick}
            onKeyDown={e => (e.key === "Enter" || e.key === " ") && onClick()}
            onContextMenu={e => openPendingSongMenu(e, song)}
        >
            <Cover track={song} className={cl("track-cover")} iconSize={14} />
            <span className={cl("track-text")}>
                <span className={cl("track-name")}>{song.name}</span>
                {song.artist && <span className={cl("track-artist")}>{song.artist}</span>}
            </span>
            <span className={cl("track-duration", { "track-percent": percent !== null })}>{percent === null && "..."}</span>
        </div>
    );
}

export function MusicTab() {
    const { loaded, items: tracks } = useLibrary("music");
    const pending = usePendingSongs();
    const preparing = useYouTubePreparing();
    const currentId = useStore(musicStore, s => s.currentId);
    const playing = useStore(musicStore, s => s.playing);
    const [query, setQuery] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [starting, setStarting] = useState(false);

    const videoId = Native ? youTubeVideoId(query) : null;
    const savedSong = useLibrarySong(videoId);
    const visible = videoId ? tracks : tracks.filter(track => matchesQuery(track.name, query));
    const visiblePending = videoId ? pending : pending.filter(song => matchesQuery(song.name, query));

    useEffect(() => {
        if (preparing) showToast({ text: "Getting YouTube links ready. This happens once and downloads about 24 MB" });
    }, [preparing]);

    const startYouTube = (text: string) => {
        setStarting(true);
        playFromYouTube(text.trim())
            .then(
                result => {
                    setQuery(current => current === text ? "" : current);
                    if (!("item" in result)) return;

                    const { item } = result;
                    if (item.kind !== "music") {
                        showToast({ text: `"${item.name}" is already in My Sounds` });
                        return;
                    }

                    showToast({ text: `"${item.name}" is already in your music` });
                    run(() => playTrack(item.id));
                },
                err => showError(`Couldn't add it from YouTube: ${err.message}`, err)
            )
            .finally(() => setStarting(false));
    };

    return (
        <FileDropZone kind="music">
            <div className={cl("tab")}>
                <NowPlaying tracks={tracks} />
                <form className={cl("youtube-form")} onSubmit={e => e.preventDefault()}>
                    <div className={cl("toolbar")}>
                        <SearchBox
                            value={query}
                            onChange={setQuery}
                            placeholder={Native ? "Search or paste a YouTube link" : "Search your music"}
                        />
                        <UploadButton kind="music" label="Add Music" />
                    </div>
                    {videoId && (
                        <YouTubeCard
                            videoId={videoId}
                            saved={savedSong}
                            pending={pending.find(song => song.youtubeId === videoId)}
                            busy={preparing ? "Getting ready..." : starting ? "Starting..." : null}
                            onDownload={() => startYouTube(query)}
                            onClose={() => setQuery("")}
                        />
                    )}
                </form>
                <div className={cl("scroller")}>
                    {!loaded ? (
                        <EmptyState icon={<MusicNoteIcon size={28} />} title="Loading your music..." />
                    ) : tracks.length === 0 && pending.length === 0 ? (
                        <EmptyState icon={<MusicNoteIcon size={28} />} title="Your playlist is empty">
                            Click <b>Add Music</b>, drop audio files here{Native && " or paste a YouTube link above"}. Right-click a track for more options.
                        </EmptyState>
                    ) : visible.length === 0 && visiblePending.length === 0 ? (
                        <EmptyState icon={<MusicNoteIcon size={28} />} title="No tracks match your search" />
                    ) : (
                        <div className={cl("track-list")}>
                            {visiblePending.map(song => (
                                <PendingRow key={song.id} song={song} />
                            ))}
                            {visible.map(track => (
                                <TrackRow
                                    key={track.id}
                                    track={track}
                                    active={track.id === currentId}
                                    playing={playing}
                                    editing={editingId === track.id}
                                    setEditing={editing => setEditingId(editing ? track.id : null)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </FileDropZone>
    );
}
