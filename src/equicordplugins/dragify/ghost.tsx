/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { classNameFactory } from "@utils/css";
import { classes } from "@utils/misc";
import { createRoot, React, useEffect, useState, useStateFromStores, VoiceStateStore } from "@webpack/common";

export type GhostState = {
    visible: boolean;
    x: number;
    y: number;
    kind: "user" | "channel" | "guild";
    title: string;
    subtitle?: string;
    iconUrl?: string;
    symbol?: string;
    badge?: string;
    entityId?: string;
    exiting: boolean;
};

const cl = classNameFactory("vc-dragify-");

let ghostRoot: ReturnType<typeof createRoot> | null = null;
let ghostMountNode: HTMLDivElement | null = null;
let ghostRaf: number | null = null;
let ghostPendingPos: { x: number; y: number; } | null = null;
let ghostHideTimer: number | null = null;

let ghostState: GhostState = {
    visible: false,
    x: 0,
    y: 0,
    kind: "channel",
    title: "",
    exiting: false
};

const ghostListeners = new Set<() => void>();

function notifyGhost() {
    ghostListeners.forEach(listener => listener());
}

function setGhostState(next: Partial<GhostState>) {
    ghostState = { ...ghostState, ...next };
    notifyGhost();
}

export function isGhostVisible(): boolean {
    return ghostState.visible;
}

export function scheduleGhostPosition(x: number, y: number) {
    ghostPendingPos = { x, y };
    if (ghostRaf !== null) return;
    setGhostState({ x, y });
    ghostRaf = requestAnimationFrame(() => {
        if (ghostPendingPos) setGhostState({ x: ghostPendingPos.x, y: ghostPendingPos.y });
        ghostPendingPos = null;
        ghostRaf = null;
    });
}

export function hideGhost() {
    if (!ghostState.visible) return;
    if (ghostHideTimer !== null) {
        clearTimeout(ghostHideTimer);
        ghostHideTimer = null;
    }
    setGhostState({ exiting: true });
    ghostHideTimer = window.setTimeout(() => {
        ghostHideTimer = null;
        setGhostState({ visible: false, exiting: false });
    }, 200);
}

export function showGhost(next: Omit<GhostState, "visible" | "x" | "y">, position?: { x: number; y: number; }) {
    if (ghostHideTimer !== null) {
        clearTimeout(ghostHideTimer);
        ghostHideTimer = null;
    }
    if (position) scheduleGhostPosition(position.x, position.y);
    setGhostState({ ...next, visible: true, exiting: false });
}

export function mountGhost() {
    if (typeof document === "undefined") return;
    const { body } = document;
    if (!body) return;

    if (ghostRoot) {
        if (ghostMountNode && !ghostMountNode.isConnected) body.appendChild(ghostMountNode);
        return;
    }

    if (!ghostMountNode) ghostMountNode = document.createElement("div");
    if (!ghostMountNode.isConnected) body.appendChild(ghostMountNode);

    ghostRoot = createRoot(ghostMountNode);
    ghostRoot.render(
        <div className={cl("ghost-container")}>
            <ErrorBoundary noop>
                <DragGhost />
            </ErrorBoundary>
        </div>
    );
}

export function unmountGhost() {
    ghostRoot?.unmount();
    ghostRoot = null;

    ghostMountNode?.remove();
    ghostMountNode = null;

    if (ghostRaf !== null) {
        cancelAnimationFrame(ghostRaf);
        ghostRaf = null;
    }
    ghostPendingPos = null;

    if (ghostHideTimer !== null) {
        clearTimeout(ghostHideTimer);
        ghostHideTimer = null;
    }
    setGhostState({ visible: false, exiting: false });
}

const DragGhost = () => {
    const [state, setState] = useState(ghostState);
    useEffect(() => {
        const listener = () => setState({ ...ghostState });
        ghostListeners.add(listener);
        return () => {
            ghostListeners.delete(listener);
        };
    }, []);

    const voiceState = useStateFromStores(
        [VoiceStateStore],
        () => (state.kind === "user" && state.entityId
            ? VoiceStateStore.getVoiceStateForUser(state.entityId)
            : null)
    );
    const inVoice = voiceState?.channelId;
    const isMuted = voiceState && (voiceState.selfMute || voiceState.mute || voiceState.selfDeaf || voiceState.deaf);
    const isStreaming = voiceState?.selfStream;

    if (!state.visible) return null;

    return (
        <div
            className={classes(cl("ghost"), state.exiting ? cl("ghost-exit") : "")}
            style={{ transform: `translate3d(${state.x}px, ${state.y}px, 0)` }}
        >
            <div className={cl("card")}>
                <div className={cl("icon")}>
                    {state.iconUrl
                        ? <img className={cl("icon-image")} src={state.iconUrl} alt="" />
                        : <span className={cl("icon-text")}>{state.symbol ?? "#"}</span>
                    }
                </div>
                <div className={cl("body")}>
                    <div className={cl("title-row")}>
                        <div className={cl("title")}>{state.title}</div>
                        {state.kind === "user" && inVoice
                            ? (isMuted
                                ? <VoiceMutedIcon className={classes(cl("voice-icon"), cl("voice-icon-muted"))} />
                                : <VoiceStateIcon className={cl("voice-icon")} />)
                            : null}
                        {state.kind === "user" && inVoice && isStreaming
                            ? <StreamIcon className={classes(cl("voice-icon"), cl("voice-icon-stream"))} />
                            : null}
                    </div>
                    {state.subtitle && <div className={cl("subtitle")}>{state.subtitle}</div>}
                </div>
                <div className={cl("badge")}>{state.badge ?? state.kind}</div>
            </div>
        </div>
    );
};

function VoiceStateIcon({ className, size = 14 }: { className?: string; size?: number; }) {
    return (
        <svg
            className={className}
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            fill="none"
            viewBox="0 0 24 24"
        >
            <path
                fill="currentColor"
                d="M7 2a1 1 0 0 0-1 1v18a1 1 0 1 0 2 0V3a1 1 0 0 0-1-1ZM11 6a1 1 0 1 1 2 0v12a1 1 0 1 1-2 0V6ZM1 8a1 1 0 0 1 2 0v8a1 1 0 1 1-2 0V8ZM16 5a1 1 0 1 1 2 0v14a1 1 0 1 1-2 0V5ZM22 8a1 1 0 0 0-1 1v6a1 1 0 1 0 2 0V9a1 1 0 0 0-1-1Z"
            />
        </svg>
    );
}

function StreamIcon({ className, size = 14 }: { className?: string; size?: number; }) {
    return (
        <svg
            className={className}
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            fill="none"
            viewBox="0 0 24 24"
        >
            <path
                fill="currentColor"
                d="M4 5a3 3 0 0 0-3 3v7a3 3 0 0 0 3 3h4.59l-1.3 2.3a1 1 0 1 0 1.74.98L10.84 18h2.32l1.81 3.28a1 1 0 1 0 1.74-.98L15.41 18H20a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3H4Zm0 2h16a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Zm6 2.57c0-.8.89-1.27 1.54-.82l3.22 2.23a1 1 0 0 1 0 1.64l-3.22 2.23A1 1 0 0 1 10 14.03V9.57Z"
            />
        </svg>
    );
}

function VoiceMutedIcon({ className, size = 14 }: { className?: string; size?: number; }) {
    return (
        <svg
            className={className}
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            fill="none"
            viewBox="0 0 24 24"
        >
            <path
                fill="currentColor"
                d="M22.7 2.7a1 1 0 0 0-1.4-1.4l-20 20a1 1 0 1 0 1.4 1.4l20-20ZM6.85 13.15a.5.5 0 0 1-.85-.36V3a1 1 0 0 1 2 0v8.8a.5.5 0 0 1-.15.35l-1 1ZM11 17.2v.8a1 1 0 1 0 2 0v-1.8a.5.5 0 0 0-.85-.35l-1 1a.5.5 0 0 0-.15.36ZM11 7.8V6a1 1 0 1 1 2 0v.8a.5.5 0 0 1-.15.35l-1 1a.5.5 0 0 1-.85-.36ZM17.15 10.85a.5.5 0 0 1 .85.36V19a1 1 0 1 1-2 0v-6.8a.5.5 0 0 1 .15-.35l1-1ZM2 7a1 1 0 0 0-1 1v8a1 1 0 1 0 2 0V8a1 1 0 0 0-1-1ZM21 9a1 1 0 1 1 2 0v6a1 1 0 1 1-2 0V9Z"
            />
        </svg>
    );
}
