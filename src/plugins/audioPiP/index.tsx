/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import type { Message } from "@vencord/discord-types";
import { createRoot, MessageStore, React, SelectedChannelStore, useEffect, useRef, useState } from "@webpack/common";
import type { Root } from "react-dom/client";

// clean cdn urls
function cleanUrl(url: string): string {
    try {
        if (!url) return "";
        const parsed = new URL(url);
        return parsed.origin + parsed.pathname;
    } catch {
        return url || "";
    }
}

const icons = {
    voice: "M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z",
    audio: "M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z",
    close: "M18.41 5.41L17 4L12 9L7 4L5.59 5.41L10.59 10.41L5.59 15.41L7 16.82L12 11.82L17 16.82L18.41 15.41L13.41 10.41L18.41 5.41Z",
    pause: "M6 19h4V5H6v14zm8-14v14h4V5h-4z",
    replay: "M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z",
    play: "M8 5v14l11-7z",
    mute: "M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.21.05-.42.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.03c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73 4.27 3zM12 4L9.91 6.09 12 8.18V4z",
    volumeLow: "M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z",
    volumeHigh: "M3 9v6h4l5 5V4L9 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"
};

const settings = definePluginSettings({
    alwaysShow: {
        description: "Always show the Picture-in-Picture window immediately when an audio file starts playing.",
        type: OptionType.BOOLEAN,
        default: false,
        restartNeeded: false
    }
});

type CornerName = "top-left" | "top-right" | "bottom-left" | "bottom-right";

// grab all 4 corners based on screen size
const getCorners = (w: number, h: number) => {
    const sw = window.innerWidth, sh = window.innerHeight;
    return {
        "top-left": { x: 16, y: 72 },
        "top-right": { x: sw - w - 16, y: 72 },
        "bottom-left": { x: 16, y: sh - h - 16 },
        "bottom-right": { x: sw - w - 16, y: sh - h - 16 }
    };
};

const getCornerCoordinates = (c: CornerName, w: number, h: number) => {
    const corners = getCorners(w, h);
    if (c === "top-left") return corners["top-left"];
    if (c === "top-right") return corners["top-right"];
    if (c === "bottom-left") return corners["bottom-left"];
    return corners["bottom-right"];
};

// figure out which corner is closest when you drop the pip
const getClosestCornerName = (x: number, y: number, w: number, h: number): CornerName => {
    return Object.entries(getCorners(w, h)).reduce((closest, [name, coords]) => {
        const dist = Math.hypot(coords.x - x, coords.y - y);
        return dist < closest.dist ? { name: name as CornerName, dist } : closest;
    }, { name: "bottom-right" as CornerName, dist: Infinity }).name;
};


interface AudioState {
    src: string;
    title: string;
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    volume: number;
    author: string;
    isOpen: boolean;
}

const listeners = new Set<() => void>();
let state: AudioState = {
    src: "",
    title: "",
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1.0,
    author: "",
    isOpen: false
};

const store = {
    getState() { return state; },
    setState(newState: Partial<AudioState>) {
        state = { ...state, ...newState };
        for (const listener of listeners) {
            try {
                listener();
            } catch (e) {
                console.error("Error in store listener:", e);
            }
        }
    },
    subscribe(listener: () => void) {
        listeners.add(listener);
        return () => { listeners.delete(listener); };
    }
};

const pipAudioPlayer = new Audio();
let globalPlayListener: ((e: Event) => void) | null = null;

const metadataCache = new WeakMap<HTMLAudioElement, { title: string; author: string }>();

function findMessageByMediaUrl(src: string) {
    try {
        const clean = cleanUrl(src);
        const currentChannel = SelectedChannelStore.getChannelId();
        const messages = MessageStore.getMessages(currentChannel) as { _array: Message[] } | undefined;
        if (messages && messages._array) {
            for (let i = messages._array.length - 1; i >= 0; i--) {
                const msg = messages._array.at(i);
                if (!msg || !msg.attachments) continue;
                const attachment = msg.attachments.find(
                    a => cleanUrl(a.url) === clean || cleanUrl(a.proxy_url) === clean
                );
                if (attachment) return { msg, attachment };
            }
        }
    } catch (e) {
        console.error("AudioPiP: Error finding message by media URL", e);
    }
    return null;
}

function resolveAudioMetadata(audio: HTMLAudioElement) {
    let title = "Audio File";
    let author = "";

    try {
        const src = audio.src || audio.currentSrc;
        if (src) {
            const match = findMessageByMediaUrl(src);
            if (match) {
                author = match.msg.author?.username || match.msg.author?.globalName || "";
                if (match.attachment.filename) {
                    title = match.attachment.filename;
                }
            } else {
                // fallback to URL parsing
                const parts = new URL(src).pathname.split("/");
                const lastPart = parts.at(-1);
                if (lastPart?.includes(".")) title = decodeURIComponent(lastPart);
            }

            if (src.includes("voice-message") || src.includes(".ogg") || title.toLowerCase().includes("voice-message")) {
                title = "Voice Message";
            }
        }
    } catch (e) {
        console.error("AudioPiP: Error resolving audio metadata", e);
    }

    return { title, author };
}

function isDiscordMediaAudio(src: string) {
    if (!src) return false;
    if (src.includes("/assets/")) return false;
    const urlStr = src.toLowerCase();
    return urlStr.includes("/attachments/") || urlStr.includes("/ephemeral-attachments/");
}

// hijack playing audio and spawn pip
function createPipFromLocal(local: HTMLAudioElement) {
    if (store.getState().isOpen) return;

    const src = local.src || local.currentSrc;
    if (!src || !isDiscordMediaAudio(src)) return;

    let title = "Audio File";
    let author = "";

    const cached = metadataCache.get(local);
    if (cached) {
        title = cached.title;
        author = cached.author;
    } else {
        const resolved = resolveAudioMetadata(local);
        title = resolved.title;
        author = resolved.author;
    }

    // hand off playback to our global player
    pipAudioPlayer.src = src;
    pipAudioPlayer.currentTime = local.currentTime;
    pipAudioPlayer.volume = local.volume || 1.0;

    local.pause(); // hush the original
    pipAudioPlayer.play().catch(() => { }); // let it rip

    store.setState({
        src,
        title,
        author,
        currentTime: pipAudioPlayer.currentTime,
        isPlaying: true,
        isOpen: true,
        volume: Math.pow(pipAudioPlayer.volume, 1 / 3)
    });
}

function handleGlobalPlay(e: Event) {
    const target = e.target as HTMLAudioElement;
    if (!target || target.tagName !== "AUDIO") return;
    if (target === pipAudioPlayer) return;

    const src = target.src || target.currentSrc;
    if (!src || !isDiscordMediaAudio(src)) return;

    // Resolve and cache metadata immediately while in channel context
    try {
        const resolved = resolveAudioMetadata(target);
        metadataCache.set(target, resolved);
    } catch (e) { }

    // close the pip if it's currently open since user is playing audio in chat
    if (store.getState().isOpen) {
        try {
            pipAudioPlayer.pause();
            pipAudioPlayer.src = "";
            store.setState({ isOpen: false, isPlaying: false, src: "", title: "", author: "" });
        } catch (e) { }
    }

    if (settings.store.alwaysShow) {
        createPipFromLocal(target);
    }
}

// blast the volume to all discord volume keys so it saves properly
function persistVolume(volume: number) {
    try {
        const strVol = String(volume);
        ["mediaVolume", "media-player-volume", "video-volume", "audio-volume", "MediaPlayerVolume", "mediaPlayerVolume", "media-volume"]
            .forEach(key => window.localStorage.setItem(key, strVol));
    } catch (e) { }
}

pipAudioPlayer.addEventListener("play", () => store.setState({ isPlaying: true }));
pipAudioPlayer.addEventListener("pause", () => store.setState({ isPlaying: false }));
pipAudioPlayer.addEventListener("timeupdate", () => store.setState({ currentTime: pipAudioPlayer.currentTime || 0 }));
pipAudioPlayer.addEventListener("durationchange", () => store.setState({ duration: pipAudioPlayer.duration || 0 }));
pipAudioPlayer.addEventListener("volumechange", () => {
    const sliderVal = Math.pow(pipAudioPlayer.volume, 1 / 3);
    if (Math.abs(store.getState().volume - sliderVal) > 0.01) {
        store.setState({ volume: sliderVal });
    }
});
pipAudioPlayer.addEventListener("ended", () => store.setState({ isPlaying: false }));

function useAudioState() {
    const [currentState, setCurrentState] = useState(store.getState());
    useEffect(() => {
        return store.subscribe(() => {
            setCurrentState(store.getState());
        });
    }, []);
    return currentState;
}

// player ui
const AudioPiPUI = () => {
    const { src, title, isPlaying, currentTime, duration, author, isOpen, volume } = useAudioState();
    const baseWidth = 280;
    const baseHeight = 84;

    const [scale, setScale] = useState<number>(() => {
        try {
            const saved = localStorage.getItem("vc-audio-pip-scale");
            if (saved) {
                const parsed = parseFloat(saved);
                if (!isNaN(parsed)) return Math.max(1, Math.min(parsed, 1.4));
            }
        } catch { }
        return 1;
    });

    const scaledWidth = baseWidth * scale;
    const scaledHeight = baseHeight * scale;

    const [corner, setCorner] = useState<CornerName>(() => {
        try {
            const saved = localStorage.getItem("vc-audio-pip-corner");
            if (saved && ["top-left", "top-right", "bottom-left", "bottom-right"].includes(saved)) {
                return saved as CornerName;
            }
        } catch { }
        return "bottom-right";
    });

    const windowRef = useRef<HTMLDivElement>(null);

    const [posX, setPosX] = useState<number | null>(null);
    const [posY, setPosY] = useState<number | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isSnapping, setIsSnapping] = useState(false);

    const [resizeTick, setResizeTick] = useState(0);

    const dragRef = useRef({ isDragging: false, startX: 0, startY: 0, initialX: 0, initialY: 0 });
    const resizeRef = useRef({ isResizing: false, startX: 0, startY: 0, initialScale: 1 });

    useEffect(() => {
        if (!isDragging) {
            const coords = getCornerCoordinates(corner, scaledWidth, scaledHeight);
            setPosX(coords.x);
            setPosY(coords.y);
        }
    }, [corner, scale, resizeTick]);

    useEffect(() => {
        const handleResize = () => {
            setResizeTick(t => t + 1);
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const [prevVolume, setPrevVolume] = useState(1.0);


    if (!isOpen || !src) return null;

    const handleMouseDown = (e: React.MouseEvent) => {
        // ignore interactive parts
        if ((e.target as HTMLElement).closest("button, svg, path, input, .vc-audio-pip-resizer")) return;

        const startCoords = getCornerCoordinates(corner, scaledWidth, scaledHeight);
        const initialX = posX ?? startCoords.x;
        const initialY = posY ?? startCoords.y;

        dragRef.current = {
            isDragging: true,
            startX: e.clientX,
            startY: e.clientY,
            initialX,
            initialY
        };
        setIsDragging(true);
        setIsSnapping(false);

        const handleMouseMove = (moveEvent: MouseEvent) => {
            if (!dragRef.current.isDragging) return;
            const dx = moveEvent.clientX - dragRef.current.startX;
            const dy = moveEvent.clientY - dragRef.current.startY;
            let newX = dragRef.current.initialX + dx;
            let newY = dragRef.current.initialY + dy;

            const paddingX = 16;
            const paddingTop = 72;
            const paddingBottom = 16;
            const maxX = document.documentElement.clientWidth - scaledWidth - paddingX;
            const maxY = document.documentElement.clientHeight - scaledHeight - paddingBottom;

            newX = Math.max(paddingX, Math.min(newX, maxX));
            newY = Math.max(paddingTop, Math.min(newY, maxY));

            if (windowRef.current) {
                windowRef.current.style.transform = `translate(${newX}px, ${newY}px)`;
            }
        };

        const handleMouseUp = (upEvent: MouseEvent) => {
            dragRef.current.isDragging = false;
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);

            const dx = upEvent.clientX - dragRef.current.startX;
            const dy = upEvent.clientY - dragRef.current.startY;
            let finalX = dragRef.current.initialX + dx;
            let finalY = dragRef.current.initialY + dy;

            const paddingX = 16;
            const paddingTop = 72;
            const paddingBottom = 48;
            const maxX = window.innerWidth - scaledWidth - paddingX;
            const maxY = window.innerHeight - scaledHeight - paddingBottom;

            finalX = Math.max(paddingX, Math.min(finalX, maxX));
            finalY = Math.max(paddingTop, Math.min(finalY, maxY));

            const nextCorner = getClosestCornerName(finalX, finalY, scaledWidth, scaledHeight);
            const snapCoords = getCornerCoordinates(nextCorner, scaledWidth, scaledHeight);

            if (windowRef.current) {
                windowRef.current.classList.remove("vc-dragging");
                windowRef.current.classList.add("vc-snapping");
                void windowRef.current.offsetWidth;
                windowRef.current.style.transform = `translate(${snapCoords.x}px, ${snapCoords.y}px)`;
            }

            setIsSnapping(true);
            setIsDragging(false);
            setPosX(null);
            setPosY(null);
            setCorner(nextCorner);

            setTimeout(() => {
                if (windowRef.current) windowRef.current.classList.remove("vc-snapping");
                setIsSnapping(false);
            }, 400);

            try {
                localStorage.setItem("vc-audio-pip-corner", nextCorner);
            } catch { }
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
        e.preventDefault();
    };

    const handleResizeMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation(); // prevent drag handler from triggering

        resizeRef.current = {
            isResizing: true,
            startX: e.clientX,
            startY: e.clientY,
            initialScale: scale
        };

        const handleResizeMouseMove = (moveEvent: MouseEvent) => {
            if (!resizeRef.current.isResizing) return;

            const dx = moveEvent.clientX - resizeRef.current.startX;
            const dy = moveEvent.clientY - resizeRef.current.startY;

            let delta = 0;
            // scale based on drag direction
            if (corner === "bottom-right") delta = (-dx - dy) / 2;
            else if (corner === "top-left") delta = (dx + dy) / 2;
            else if (corner === "top-right") delta = (-dx + dy) / 2;
            else if (corner === "bottom-left") delta = (dx - dy) / 2;

            let newScale = resizeRef.current.initialScale + (delta / 150);
            newScale = Math.max(1, Math.min(newScale, 1.4));

            if (windowRef.current) {
                const currentCoords = getCornerCoordinates(corner, baseWidth * newScale, baseHeight * newScale);
                windowRef.current.style.transform = `translate(${currentCoords.x}px, ${currentCoords.y}px)`;
                windowRef.current.style.width = `${baseWidth * newScale}px`;
                windowRef.current.style.height = `${baseHeight * newScale}px`;
                const container = windowRef.current.querySelector(".vc-audio-pip-container") as HTMLElement;
                if (container) {
                    container.style.transform = `scale(${newScale})`;
                }
            }
        };

        const handleResizeMouseUp = (upEvent: MouseEvent) => {
            resizeRef.current.isResizing = false;
            document.removeEventListener("mousemove", handleResizeMouseMove);
            document.removeEventListener("mouseup", handleResizeMouseUp);

            const dx = upEvent.clientX - resizeRef.current.startX;
            const dy = upEvent.clientY - resizeRef.current.startY;

            let delta = 0;
            if (corner === "bottom-right") delta = (-dx - dy) / 2;
            else if (corner === "top-left") delta = (dx + dy) / 2;
            else if (corner === "top-right") delta = (-dx + dy) / 2;
            else if (corner === "bottom-left") delta = (dx - dy) / 2;

            let newScale = resizeRef.current.initialScale + (delta / 150);
            newScale = Math.max(1, Math.min(newScale, 1.4));

            setScale(newScale);

            setPosX(null);
            setPosY(null);

            try {
                localStorage.setItem("vc-audio-pip-scale", newScale.toString());
            } catch { }
        };

        document.addEventListener("mousemove", handleResizeMouseMove);
        document.addEventListener("mouseup", handleResizeMouseUp);
        e.preventDefault();
    };

    const handlePlayPause = () => {
        try {
            const state = store.getState();
            if (state.isPlaying) {
                pipAudioPlayer.pause();
                store.setState({ isPlaying: false });
            } else {
                if (pipAudioPlayer.currentTime >= (pipAudioPlayer.duration || 1) - 0.2) {
                    pipAudioPlayer.currentTime = 0;
                    store.setState({ currentTime: 0 });
                }
                pipAudioPlayer.play().catch(() => { });
                store.setState({ isPlaying: true });
            }
        } catch (e) {
            console.error("Error handling play/pause:", e);
        }
    };

    const handleClose = () => {
        try {
            pipAudioPlayer.pause();
            pipAudioPlayer.src = "";
            store.setState({ isOpen: false, isPlaying: false, src: "", title: "", author: "" });
        } catch (e) {
            console.error("Error handling close:", e);
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        if (isNaN(val)) return;
        try {
            pipAudioPlayer.currentTime = val;
            store.setState({ currentTime: val });
        } catch (err) {
            console.error("Error seeking audio:", err);
        }
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        if (isNaN(val)) return;
        try {
            pipAudioPlayer.volume = Math.pow(val, 3);
            persistVolume(val);
            store.setState({ volume: val });
        } catch (err) {
            console.error("Error changing volume:", err);
        }
    };

    const handleMuteToggle = () => {
        try {
            const newVol = volume > 0 ? 0 : (prevVolume > 0 ? prevVolume : 1.0);
            if (volume > 0) setPrevVolume(volume);
            pipAudioPlayer.volume = Math.pow(newVol, 3);
            persistVolume(newVol);
            store.setState({ volume: newVol });
        } catch (err) {
            console.error("Error toggling mute:", err);
        }
    };

    const formatTime = (time: number) => {
        if (isNaN(time) || !isFinite(time)) return "0:00";
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
    };

    const cx = posX ?? getCornerCoordinates(corner, scaledWidth, scaledHeight).x;
    const cy = posY ?? getCornerCoordinates(corner, scaledWidth, scaledHeight).y;
    const formattedAuthor = author ? (author.startsWith("@") ? author : `@${author}`) : "";
    const timeLabel = `${formatTime(currentTime)} / ${formatTime(duration || 0)}`;
    const isVoiceMessage = title === "Voice Message";

    const classList = [
        "vc-audio-pip-window",
        "vc-style-desktop",
        isDragging ? "vc-dragging" : "",
        isSnapping ? "vc-snapping" : ""
    ].filter(Boolean).join(" ");

    return (
        <div
            ref={windowRef}
            className={classList}
            style={{
                transform: `translate(${cx}px, ${cy}px)`,
                width: `${scaledWidth}px`,
                height: `${scaledHeight}px`,
            }}
            onMouseDown={handleMouseDown}
        >
            <div className="vc-audio-pip-container" style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: `${baseWidth}px`, height: `${baseHeight}px` }}>
                <div className="vc-audio-pip-header">
                    <div className="vc-audio-pip-file-info">
                        {isVoiceMessage ? (
                            <svg className="vc-audio-pip-icon" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                <path d={icons.voice} />
                            </svg>
                        ) : (
                            <svg className="vc-audio-pip-icon" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                <path d={icons.audio} />
                            </svg>
                        )}
                        <div className="vc-audio-pip-meta">
                            <span className="vc-audio-pip-title" title={title}>
                                {title}
                            </span>
                            {formattedAuthor && (
                                <span className="vc-audio-pip-author" title={formattedAuthor}>
                                    by {formattedAuthor}
                                </span>
                            )}
                        </div>
                    </div>
                    <button className="vc-audio-pip-close" onClick={handleClose} aria-label="Close Player">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                            <path d={icons.close} />
                        </svg>
                    </button>
                </div>

                <div className="vc-audio-pip-controls-row">
                    <button className="vc-audio-pip-play-btn" onClick={handlePlayPause}>
                        {isPlaying ? (
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                <path d={icons.pause} />
                            </svg>
                        ) : (currentTime >= (duration || Infinity) - 0.2 && duration > 0) ? (
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                <path d={icons.replay} />
                            </svg>
                        ) : (
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                <path d={icons.play} />
                            </svg>
                        )}
                    </button>

                    <span className="vc-audio-pip-time">{timeLabel}</span>

                    <div className="vc-audio-pip-seek-container">
                        <input
                            type="range"
                            className="vc-audio-pip-seek"
                            min={0}
                            max={duration || 1}
                            step="any"
                            value={currentTime || 0}
                            onChange={handleSeek}
                            style={{ "--seek-progress": `${((currentTime || 0) / (duration || 1)) * 100}%` } as React.CSSProperties}
                        />
                    </div>

                    <div
                        className="vc-audio-pip-volume-group"
                        onMouseLeave={e => {
                            const slider = e.currentTarget.querySelector(".vc-audio-pip-volume-slider") as HTMLInputElement;
                            if (slider) slider.blur();
                        }}
                    >
                        <button className="vc-audio-pip-volume-btn" onClick={handleMuteToggle}>
                            {volume === 0 ? (
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                    <path d={icons.mute} />
                                </svg>
                            ) : volume < 0.5 ? (
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                    <path d={icons.volumeLow} />
                                </svg>
                            ) : (
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                    <path d={icons.volumeHigh} />
                                </svg>
                            )}
                        </button>
                        <input
                            type="range"
                            className="vc-audio-pip-volume-slider"
                            min={0}
                            max={1}
                            step={0.01}
                            value={volume}
                            onChange={handleVolumeChange}
                            onMouseUp={e => e.currentTarget.blur()}
                            onMouseLeave={e => e.currentTarget.blur()}
                            style={{ "--volume-progress": `${volume * 100}%` } as React.CSSProperties}
                        />
                    </div>
                </div>
            </div>
            <div
                className={`vc-audio-pip-resizer ${corner}`}
                onMouseDown={handleResizeMouseDown}
            />
        </div>
    );
};

// register plugin
export default definePlugin({
    name: "AudioPiP",
    description: "Adds a floating Picture-in-Picture window for playing audio and voice messages.",
    tags: ["Media", "Utility"],
    authors: [Devs.OKISO],
    settings,

    element: null as HTMLDivElement | null,
    root: null as Root | null,
    channelSelectHandler: null as (() => void) | null,

    patches: [],

    start() {
        try {
            this.element = document.createElement("div");
            this.element.id = "vc-audio-pip-container";
            document.body.appendChild(this.element);
            this.root = createRoot(this.element);
            this.root.render(<AudioPiPUI />);
        } catch (e) {
            console.error("Error mounting AudioPiPUI root:", e);
        }

        if (!globalPlayListener) {
            globalPlayListener = handleGlobalPlay.bind(this);
            document.addEventListener("play", globalPlayListener, true);
        }

        let lastChannelId = SelectedChannelStore.getChannelId();
        this.channelSelectHandler = () => {
            const currentChannelId = SelectedChannelStore.getChannelId();
            if (currentChannelId === lastChannelId) return; // ignore spurious store updates
            lastChannelId = currentChannelId;

            // tabbed out to another channel so pip it
            const audios = document.querySelectorAll("audio");
            for (const el of audios) {
                if (el && !el.paused && isDiscordMediaAudio(el.src || el.currentSrc) && el !== pipAudioPlayer) {
                    createPipFromLocal(el);
                    break;
                }
            }
        };
        SelectedChannelStore.addChangeListener(this.channelSelectHandler);
    },

    stop() {
        if (this.channelSelectHandler) {
            SelectedChannelStore.removeChangeListener(this.channelSelectHandler);
        }

        if (globalPlayListener) {
            document.removeEventListener("play", globalPlayListener, true);
            globalPlayListener = null;
        }

        try {
            pipAudioPlayer.pause();
            pipAudioPlayer.src = "";
        } catch { }

        try {
            if (this.root) {
                this.root.unmount();
            }
            if (this.element) {
                this.element.remove();
            }
        } catch (e) {
            console.error("Error unmounting root in stop():", e);
        }

        store.setState({
            src: "",
            title: "",
            isPlaying: false,
            currentTime: 0,
            duration: 0,
            volume: 1.0,
            author: "",
            isOpen: false
        });
    }
});
