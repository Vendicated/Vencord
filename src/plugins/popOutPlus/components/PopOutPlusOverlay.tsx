/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { usePopoutWindow } from "@plugins/popOutPlus/hooks/usePopoutWindow";
import { useWindowDragging } from "@plugins/popOutPlus/hooks/useWindowDragging";
import { useWindowEvents } from "@plugins/popOutPlus/hooks/useWindowEvents";
import { dispatchContextMenuThroughOverlay } from "@plugins/popOutPlus/utils/windowInteractions";
import { PopoutWindowStore, React, useCallback, useRef, useState } from "@webpack/common";

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

    const { onMouseDown: handleDragStart, isDragging } = useWindowDragging(popoutKey);

    const [isVisible, setIsVisible] = useState(false);
    const hideTimeoutRef = useRef<number | null>(null);
    const dragLayerRef = useRef<HTMLDivElement>(null);

    const showControls = useCallback(() => {
        setIsVisible(true);
        if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = window.setTimeout(() => setIsVisible(false), 2000);
    }, []);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        showControls();
        if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA") {
            return;
        }

        if (e.code === "KeyF" || e.code === "F11") {
            e.preventDefault();
            toggleFullscreen();
        } else if (e.code === "KeyP") {
            e.preventDefault();
            togglePin();
        } else if (e.code === "KeyC") {
            e.preventDefault();
            toggleClearView();
        } else if (e.code === "KeyA") {
            e.preventDefault();
            autoFitToVideo();
        }
    }, [showControls, toggleFullscreen, togglePin, toggleClearView, autoFitToVideo]);

    const handleDblClick = useCallback((e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest("#vc-popout-controls") || target.tagName === "BUTTON") return;
        toggleFullscreen();
    }, [toggleFullscreen]);

    useWindowEvents(popoutKey, {
        onActivity: showControls,
        onKeyDown: handleKeyDown,
        onDblClick: handleDblClick
    });

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
                onMouseDown={handleDragStart}
                onContextMenu={handleContextMenu}
                style={{
                    position: "fixed",
                    top: isClearView ? "0" : "22px",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 10,
                    cursor: isDragging ? "grabbing" : "grab",
                    background: "transparent",
                    pointerEvents: "auto"
                }}
            />
            <div
                style={{
                    opacity: isVisible ? 1 : 0,
                    pointerEvents: isVisible ? "auto" : "none",
                    transition: "opacity 0.1s ease",
                    position: "relative",
                    zIndex: 100,
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
