/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { usePopoutWindow } from "@plugins/popOutPlus/hooks/usePopoutWindow";
import { useWindowDragging } from "@plugins/popOutPlus/hooks/useWindowDragging";
import { useWindowEvents } from "@plugins/popOutPlus/hooks/useWindowEvents";
import { React, useCallback, useEffect, useRef, useState } from "@webpack/common";

import { PopOutControls } from "./PopOutControls";

interface PopOutPlusOverlayProps {
    popoutKey: string;
}

export const PopOutPlusOverlay: React.FC<PopOutPlusOverlayProps> = ({ popoutKey }) => {
    if (!popoutKey.startsWith("DISCORD_CALL_TILE_POPOUT_")) return null;

    const {
        isPinned,
        isFullscreen,
        isClearView,
        togglePin,
        toggleFullscreen,
        toggleClearView,
        autoFitToVideo
    } = usePopoutWindow(popoutKey);

    const { isDragging } = useWindowDragging(popoutKey);

    const [isVisible, setIsVisible] = useState(false);
    const [isClearViewHintVisible, setIsClearViewHintVisible] = useState(false);
    const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const clearViewHintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (isClearView) {
            setIsClearViewHintVisible(true);
            if (clearViewHintTimeoutRef.current) {
                clearTimeout(clearViewHintTimeoutRef.current);
            }
            clearViewHintTimeoutRef.current = setTimeout(() => setIsClearViewHintVisible(false), 3000);
        } else {
            setIsClearViewHintVisible(false);
        }
    }, [isClearView]);

    useEffect(() => {
        if (isDragging) {
            setIsClearViewHintVisible(false);
        }
    }, [isDragging]);

    const showControls = useCallback(() => {
        setIsVisible(true);
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
        }
        hideTimeoutRef.current = setTimeout(() => setIsVisible(false), 2000);
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

    return (
        <>
            <div className={`vc-popoutplus-drag-hint${isDragging ? " vc-popoutplus-visible" : ""}`}>
                Dragging window...
            </div>

            <div className={`vc-popoutplus-drag-hint${isClearViewHintVisible && !isDragging ? " vc-popoutplus-visible" : ""}`}>
                Hold Ctrl button to drag window
            </div>

            <div className={`vc-popoutplus-controls-wrapper${isVisible ? " vc-popoutplus-visible" : ""}`}>
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
