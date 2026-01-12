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
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
        }
        hideTimeoutRef.current = window.setTimeout(() => setIsVisible(false), 2000);
    }, []);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        showControls();

        switch (e.code) {
            case "KeyF":
            case "F11":
                e.preventDefault();
                toggleFullscreen();
                break;
            case "KeyP":
                e.preventDefault();
                togglePin();
                break;
            case "KeyC":
                e.preventDefault();
                toggleClearView();
                break;
            case "KeyA":
                e.preventDefault();
                autoFitToVideo();
                break;
        }
    }, [showControls, toggleFullscreen, togglePin, toggleClearView, autoFitToVideo]);

    const handleDblClick = useCallback(() => {
        toggleFullscreen();
    }, [toggleFullscreen]);

    useWindowEvents(popoutKey, {
        onActivity: showControls,
        onKeyDown: handleKeyDown,
        onDblClick: handleDblClick
    });

    const handleContextMenu = (e: React.MouseEvent) => {
        const win = PopoutWindowStore?.getWindow(popoutKey);
        if (!win || !dragLayerRef.current) {
            return;
        }
        e.preventDefault();

        dispatchContextMenuThroughOverlay(win, dragLayerRef.current, e.clientX, e.clientY, e.screenX, e.screenY);
    };

    return (
        <>
            <div
                ref={dragLayerRef}
                id="vc-popout-drag-layer"
                className={isDragging ? "vc-popout-dragging" : ""}
                onMouseDown={handleDragStart}
                onContextMenu={handleContextMenu}
                style={{ top: isClearView ? "0" : "22px" }}
            />

            <div className={`vc-popout-drag-hint${isDragging ? " vc-popout-visible" : ""}`}>
                To move to another monitor, drag by the title bar (disable Clear View to see title bar).
            </div>

            <div className={`vc-popout-controls-wrapper${isVisible ? " vc-popout-visible" : ""}`}>
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
