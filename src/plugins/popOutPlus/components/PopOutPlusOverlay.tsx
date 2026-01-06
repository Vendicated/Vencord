/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { usePopoutWindow } from "@plugins/popOutPlus/hooks/usePopoutWindow";
import { dispatchContextMenuThroughOverlay, observeWindowInteractions, startWindowDrag } from "@plugins/popOutPlus/utils/windowInteractions";
import { PopoutWindowStore, React, useEffect, useRef, useState } from "@webpack/common";

import { PopOutControls } from "./PopOutControls";

interface PopOutPlusOverlayProps {
    popoutKey: string;
}

export const PopOutPlusOverlay: React.FC<PopOutPlusOverlayProps> = ({ popoutKey }) => {
    const {
        isPinned,
        isFullscreen,
        isClearView,
        togglePin,
        toggleFullscreen,
        toggleClearView,
        autoFitToVideo
    } = usePopoutWindow(popoutKey);

    const [isVisible, setIsVisible] = useState(false);
    const hideTimeoutRef = useRef<number | null>(null);
    const dragLayerRef = useRef<HTMLDivElement>(null);

    const showControls = () => {
        setIsVisible(true);
        if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = window.setTimeout(() => setIsVisible(false), 2000);
    };

    useEffect(() => {
        const win = PopoutWindowStore?.getWindow(popoutKey);
        if (!win) return;

        const cleanup = observeWindowInteractions(win, {
            onActivity: showControls,
            onKeyDown: e => {
                showControls();
                if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA") {
                    return;
                }

                if (e.key === "f" || e.key === "F11") {
                    e.preventDefault();
                    toggleFullscreen();
                } else if (e.key === "p") {
                    e.preventDefault();
                    togglePin();
                } else if (e.key === "c") {
                    e.preventDefault();
                    toggleClearView();
                } else if (e.key === "a") {
                    e.preventDefault();
                    autoFitToVideo();
                }
            },
            onDblClick: e => {
                const target = e.target as HTMLElement;
                if (target.closest("#vc-popout-controls") || target.tagName === "BUTTON") return;
                toggleFullscreen();
            }
        });

        return () => {
            cleanup();
            if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        };
    }, [popoutKey, toggleFullscreen, togglePin, toggleClearView, autoFitToVideo]);

    // Dragging Logic
    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return;
        const win = PopoutWindowStore?.getWindow(popoutKey);
        if (!win || !dragLayerRef.current) return;

        startWindowDrag(
            win,
            { screenX: e.screenX, screenY: e.screenY },
            undefined,
            undefined,
            dragLayerRef.current
        );
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        const win = PopoutWindowStore?.getWindow(popoutKey);
        if (!win || !dragLayerRef.current) return;

        e.preventDefault();

        dispatchContextMenuThroughOverlay(win, dragLayerRef.current, e.clientX, e.clientY, e.screenX, e.screenY);
    };

    return (
        <>
            <div
                ref={dragLayerRef}
                id="vc-popout-drag-layer"
                onMouseDown={handleMouseDown}
                onContextMenu={handleContextMenu}
                style={{
                    position: "fixed",
                    top: isClearView ? "0" : "22px",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 99998,
                    cursor: "grab",
                    background: "transparent",
                    pointerEvents: "auto"
                }}
            />
            <div
                style={{
                    opacity: isVisible ? 1 : 0,
                    pointerEvents: isVisible ? "auto" : "none",
                    transition: "opacity 0.3s ease",
                }}
            >
                <PopOutControls
                    isPinned={isPinned}
                    togglePin={togglePin}
                    isClearView={isClearView}
                    toggleClearView={toggleClearView}
                    isFullscreen={isFullscreen}
                    toggleFullscreen={toggleFullscreen}
                    autoFitToVideo={autoFitToVideo}
                />
            </div>
        </>
    );
};
