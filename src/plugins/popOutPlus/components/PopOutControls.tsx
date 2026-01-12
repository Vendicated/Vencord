/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { React } from "@webpack/common";

import { ControlButton } from "./ControlButton";

interface PopOutControlsProps {
    isPinned: boolean;
    togglePin: () => void;
    isClearView: boolean;
    toggleClearView: () => void;
    isFullscreen: boolean;
    toggleFullscreen: () => void;
    autoFitToVideo: () => void;
}

export const PopOutControls: React.FC<PopOutControlsProps> = ({
    isPinned,
    togglePin,
    isClearView,
    toggleClearView,
    isFullscreen,
    toggleFullscreen,
    autoFitToVideo
}) => {
    return (
        <div id="vc-popout-controls">
            <ControlButton
                id="vc-popout-pin-btn"
                icon="📌"
                title={isPinned ? "Unpin Window (P)" : "Pin on Top (P)"}
                onClick={togglePin}
                active={isPinned}
            />
            <ControlButton
                id="vc-popout-clearview-btn"
                icon="👁"
                title={isClearView ? "Show Title Bar (C)" : "Clear View (C)"}
                onClick={toggleClearView}
                active={isClearView}
            />
            <ControlButton
                id="vc-popout-fit-btn"
                icon="🗖"
                title="Auto Fit (A)"
                onClick={autoFitToVideo}
            />
            <ControlButton
                id="vc-popout-fullscreen-btn"
                icon="⛶"
                title={isFullscreen ? "Exit Fullscreen (F)" : "Fullscreen (F)"}
                onClick={toggleFullscreen}
                active={isFullscreen}
            />
        </div>
    );
};
