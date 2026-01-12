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
    const hideTimeoutRef = useRef<number | null>(null);
    const clearViewHintTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        if (isClearView) {
            setIsClearViewHintVisible(true);
            if (clearViewHintTimeoutRef.current) {
                clearTimeout(clearViewHintTimeoutRef.current);
            }
            clearViewHintTimeoutRef.current = window.setTimeout(() => setIsClearViewHintVisible(false), 3000);
        } else {
            setIsClearViewHintVisible(false);
        }
    }, [isClearView]);

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

    return (
        <>
            <div className={`vc-popout-drag-hint${isDragging ? " vc-popout-visible" : ""}`}>
                Dragging window...
            </div>

            <div className={`vc-popout-drag-hint${isClearViewHintVisible && !isDragging ? " vc-popout-visible" : ""}`}>
                Hold Ctrl button to drag window
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
