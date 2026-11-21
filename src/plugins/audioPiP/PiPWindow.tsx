/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@utils/css";
import { useForceUpdater } from "@utils/react";
import { ChannelStore, NavigationRouter, React, useEffect, useRef, useState } from "@webpack/common";

import { isAtEnd } from "./media";
import { closeTrack, playerStore, seek, setVolume, toggleMute, togglePlayback } from "./player";
import { Corner, Corners, settings } from "./settings";

export const cl = classNameFactory("vc-audio-pip-");

const BASE_SIZE = 120;
const MIN_SCALE = 1;
const MAX_SCALE = 1.4;
const SCALE_STEP = 0.1;
const EDGE_GAP = 16;
const TOP_GAP = 72;
const DRAG_THRESHOLD = 4;
const RESIZE_SENSITIVITY = 150;
const MARQUEE_GAP = 24;
const MARQUEE_SPEED = 30;

const icons = {
    close: "M18.41 5.41L17 4L12 9L7 4L5.59 5.41L10.59 10.41L5.59 15.41L7 16.82L12 11.82L17 16.82L18.41 15.41L13.41 10.41L18.41 5.41Z",
    pause: "M6 19h4V5H6v14zm8-14v14h4V5h-4z",
    replay: "M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z",
    play: "M8 5v14l11-7z",
    mute: "M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.21.05-.42.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.03c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73 4.27 3zM12 4L9.91 6.09 12 8.18V4z",
    volumeLow: "M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z",
    volumeHigh: "M3 9v6h4l5 5V4L9 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"
};

function Icon({ path, size = 16 }: { path: string; size?: number; }) {
    return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
            <path d={path} />
        </svg>
    );
}

function MarqueeText({ text }: { text: string; }) {
    const viewportRef = useRef<HTMLSpanElement>(null);
    const copyRef = useRef<HTMLSpanElement>(null);
    const [distance, setDistance] = useState(0);

    useEffect(() => {
        const viewport = viewportRef.current;
        const copy = copyRef.current;
        if (!viewport || !copy) return;

        const observer = new ResizeObserver(() => {
            const textWidth = copy.offsetWidth;
            setDistance(textWidth > viewport.clientWidth + 1 ? textWidth + MARQUEE_GAP : 0);
        });
        observer.observe(viewport);
        observer.observe(copy);
        return () => observer.disconnect();
    }, [text]);

    return (
        <span
            ref={viewportRef}
            className={cl("marquee", { "marquee-scrolling": distance > 0 })}
            style={distance > 0 ? {
                "--vc-audio-pip-marquee-distance": `${distance}px`,
                "--vc-audio-pip-marquee-duration": `${distance / MARQUEE_SPEED}s`
            } as React.CSSProperties : undefined}
        >
            <span className={cl("marquee-track")}>
                <span ref={copyRef} className={cl("marquee-copy")}>{text}</span>
                {distance > 0 && <span className={cl("marquee-copy")} aria-hidden="true">{text}</span>}
            </span>
        </span>
    );
}

interface Point {
    x: number;
    y: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const clampScale = (scale: unknown) =>
    typeof scale === "number" && Number.isFinite(scale) ? clamp(scale, MIN_SCALE, MAX_SCALE) : MIN_SCALE;
const isCorner = (corner: unknown): corner is Corner => Corners.includes(corner as Corner);

function clampPosition({ x, y }: Point, width: number, height: number): Point {
    const maxX = window.innerWidth - width - EDGE_GAP;
    const maxY = window.innerHeight - height - EDGE_GAP;
    return {
        x: Math.max(EDGE_GAP, Math.min(x, maxX)),
        y: Math.max(TOP_GAP, Math.min(y, maxY))
    };
}

function getCornerPosition(corner: Corner, width: number, height: number): Point {
    const x = corner.endsWith("left") ? EDGE_GAP : window.innerWidth - width - EDGE_GAP;
    const y = corner.startsWith("top") ? TOP_GAP : window.innerHeight - height - EDGE_GAP;
    return clampPosition({ x, y }, width, height);
}

function getClosestCorner(point: Point, width: number, height: number) {
    let closest: Corner = "bottom-right";
    let closestDistance = Infinity;

    for (const corner of Corners) {
        const { x, y } = getCornerPosition(corner, width, height);
        const distance = Math.hypot(x - point.x, y - point.y);
        if (distance < closestDistance) {
            closest = corner;
            closestDistance = distance;
        }
    }

    return closest;
}

function formatTime(time: number) {
    if (!Number.isFinite(time) || time < 0) time = 0;

    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = String(Math.floor(time % 60)).padStart(2, "0");

    return hours > 0
        ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}`
        : `${minutes}:${seconds}`;
}

interface Gesture {
    kind: "drag" | "resize";
    pointerId: number;
    startX: number;
    startY: number;
    origin: Point;
    startScale: number;
    active: boolean;
}

export function PiPWindow() {
    const { track, isDetached, isPlaying, currentTime, duration, volume, muted, error, isBuffering } = React.useSyncExternalStore(playerStore.subscribe, playerStore.getState);
    const { alwaysShow } = settings.use(["alwaysShow"]);

    const [corner, setCorner] = useState<Corner>(() => isCorner(settings.store.corner) ? settings.store.corner : "bottom-right");
    const [scale, setScale] = useState(() => clampScale(settings.store.scale));
    const [dragPosition, setDragPosition] = useState<Point | null>(null);
    const [isSnapping, setIsSnapping] = useState(false);
    const gesture = useRef<Gesture | null>(null);

    const onWindowResize = useForceUpdater();
    useEffect(() => {
        window.addEventListener("resize", onWindowResize);
        return () => window.removeEventListener("resize", onWindowResize);
    }, []);

    // a failed handback can leave isDetached false; the error still needs a visible retry
    if (!track || !(isDetached || alwaysShow || error)) return null;

    const width = BASE_SIZE * scale;
    const height = BASE_SIZE * scale;
    const position = dragPosition ?? getCornerPosition(corner, width, height);

    const isDragging = dragPosition != null;
    const hasEnded = !isPlaying && isAtEnd(currentTime, duration);
    const status = error || (isBuffering ? "Loading…" : "");
    const { channelId, messageId } = track;
    const shownVolume = muted ? 0 : volume;
    const progress = duration ? Math.min(currentTime / duration, 1) * 100 : 0;

    function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
        // pointerup can happen outside the window
        if (e.button !== 0 || gesture.current?.active) return;

        const target = e.target as HTMLElement;
        const isResize = target.classList.contains(cl("resizer"));
        if (!isResize && target.closest("button, input, .vc-audio-pip-drawer")) return;

        gesture.current = {
            kind: isResize ? "resize" : "drag",
            pointerId: e.pointerId,
            startX: e.clientX,
            startY: e.clientY,
            origin: position,
            startScale: scale,
            active: isResize
        };

        if (isResize) {
            e.currentTarget.setPointerCapture(e.pointerId);
            e.preventDefault();
        }
    }

    function applyGesture(g: Gesture, e: React.PointerEvent) {
        const dx = e.clientX - g.startX;
        const dy = e.clientY - g.startY;

        if (g.kind === "drag") {
            const next = clampPosition({ x: g.origin.x + dx, y: g.origin.y + dy }, width, height);
            setDragPosition(next);
            return next;
        }

        const sx = corner.endsWith("right") ? -1 : 1;
        const sy = corner.startsWith("bottom") ? -1 : 1;
        const next = clampScale(g.startScale + (sx * dx + sy * dy) / 2 / RESIZE_SENSITIVITY);
        setScale(next);
        return next;
    }

    function activateGesture(g: Gesture, e: React.PointerEvent<HTMLDivElement>) {
        g.active = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        setIsSnapping(false);
        applyGesture(g, e);
    }

    function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
        const g = gesture.current;
        if (!g || g.pointerId !== e.pointerId) return;

        if (g.active) applyGesture(g, e);
        else if (Math.hypot(e.clientX - g.startX, e.clientY - g.startY) >= DRAG_THRESHOLD) activateGesture(g, e);
    }

    function onPointerLeave(e: React.PointerEvent<HTMLDivElement>) {
        const g = gesture.current;
        if (!g || g.active || g.pointerId !== e.pointerId) return;

        // fast drags can skip pointermove
        if (e.buttons & 1) activateGesture(g, e);
        else gesture.current = null;
    }

    function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
        const g = gesture.current;
        if (!g || g.pointerId !== e.pointerId) return;
        gesture.current = null;

        if (!g.active) return;
        if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);

        const result = applyGesture(g, e);
        if (typeof result === "number") resizeTo(result);
        else snapTo(getClosestCorner(result, width, height));
    }

    function snapTo(next: Corner) {
        setIsSnapping(true);
        setDragPosition(null);
        setCorner(next);
        settings.store.corner = next;
    }

    function resizeTo(next: number) {
        next = clampScale(next);
        setScale(next);
        settings.store.scale = next;
    }

    function onHandleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
        if (e.altKey || e.ctrlKey || e.metaKey) return;
        const [vertical, horizontal] = corner.split("-") as ["top" | "bottom", "left" | "right"];
        switch (e.key) {
            case "ArrowUp": snapTo(`top-${horizontal}`); break;
            case "ArrowDown": snapTo(`bottom-${horizontal}`); break;
            case "ArrowLeft": snapTo(`${vertical}-left`); break;
            case "ArrowRight": snapTo(`${vertical}-right`); break;
            case "+": case "=": resizeTo(scale + SCALE_STEP); break;
            case "-": case "_": resizeTo(scale - SCALE_STEP); break;
            default: return;
        }
        e.preventDefault();
    }

    function jumpToMessage() {
        const guildId = ChannelStore.getChannel(channelId)?.guild_id ?? "@me";
        NavigationRouter.transitionTo(`/channels/${guildId}/${channelId}/${messageId}`);
    }

    return (
        <div
            role="region"
            aria-label="Audio player"
            className={cl("window", {
                dragging: isDragging,
                snapping: isSnapping,
                error: !!error,
                top: corner.startsWith("top"),
                left: corner.endsWith("left")
            })}
            style={{
                transform: `translate(${position.x}px, ${position.y}px)`,
                width,
                height
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerLeave={onPointerLeave}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onTransitionEnd={e => e.target === e.currentTarget && setIsSnapping(false)}
        >
            <div className={cl("container")} style={{ transform: `scale(${scale})` }}>
                <button
                    className={cl("title", "title-link")}
                    onClick={jumpToMessage}
                    aria-label={`${track.title}, jump to message`}
                    title={`${track.title} (click to jump to message)`}
                >
                    <MarqueeText text={track.title} />
                </button>
                <span role="status" className={cl("status")} title={status || undefined}>
                    {status && <MarqueeText text={status} />}
                </span>
                {track.author && !status && (
                    <span className={cl("author")} title={`@${track.author}`}>
                        @{track.author}
                    </span>
                )}

                <button
                    className={cl("play")}
                    onClick={togglePlayback}
                    aria-label={error ? "Retry" : isPlaying ? "Pause" : hasEnded ? "Replay" : "Play"}
                >
                    <svg className={cl("ring")} viewBox="0 0 48 48" aria-hidden="true">
                        <circle className={cl("ring-track")} cx="24" cy="24" r="22.5" />
                        <circle
                            className={cl("ring-fill")}
                            cx="24"
                            cy="24"
                            r="22.5"
                            pathLength={100}
                            strokeDasharray={progress >= 100 ? "none" : `${progress} 100`}
                        />
                    </svg>
                    <span className={cl("disc")}>
                        <Icon size={18} path={error || hasEnded ? icons.replay : isPlaying ? icons.pause : icons.play} />
                    </span>
                </button>

                <div className={cl("drawer")}>
                    <div className={cl("drawer-panel")}>
                        <input
                            type="range"
                            className={cl("seek")}
                            aria-label="Seek"
                            aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
                            min={0}
                            max={duration || 1}
                            step="any"
                            value={Math.min(currentTime, duration || 1)}
                            disabled={!duration}
                            onChange={e => seek(e.currentTarget.valueAsNumber)}
                            style={{ "--vc-audio-pip-progress": `${progress}%` } as React.CSSProperties}
                        />
                        <div className={cl("drawer-row")}>
                            <span className={cl("time")}>
                                {formatTime(currentTime)} / {formatTime(duration)}
                            </span>
                            <div className={cl("volume")}>
                                <button className={cl("volume-button")} onClick={toggleMute} aria-label={shownVolume === 0 ? "Unmute" : "Mute"}>
                                    <Icon path={shownVolume === 0 ? icons.mute : volume < 0.5 ? icons.volumeLow : icons.volumeHigh} />
                                </button>
                                <input
                                    type="range"
                                    className={cl("volume-slider")}
                                    aria-label="Volume"
                                    aria-valuetext={`${Math.round(shownVolume * 100)}%`}
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={shownVolume}
                                    onChange={e => setVolume(e.currentTarget.valueAsNumber)}
                                    style={{ "--vc-audio-pip-progress": `${shownVolume * 100}%` } as React.CSSProperties}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <button className={cl("close")} onClick={closeTrack} aria-label="Close player">
                <Icon size={12} path={icons.close} />
            </button>
            <button
                className={cl("resizer", `resizer-${corner}`)}
                onKeyDown={onHandleKeyDown}
                aria-label="Move or resize player"
                title="Arrow keys move, + and - resize"
            />
        </div>
    );
}
