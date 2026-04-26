/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { React } from "@webpack/common";

import { ControlButton } from "./ControlButton";
import { EyeIcon, EyeOffIcon, FitIcon, FullscreenIcon, PinIcon } from "./Icons";

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
        <div id="vc-popoutplus-controls">
            <ControlButton
                id="vc-popoutplus-pin-btn"
                icon={<PinIcon />}
                title={isPinned ? "Unpin Window (P)" : "Pin on Top (P)"}
                onClick={togglePin}
                active={isPinned}
            />
            <ControlButton
                id="vc-popoutplus-clearview-btn"
                icon={isClearView ? <EyeOffIcon /> : <EyeIcon />}
                title={isClearView ? "Show Title Bar (C)" : "Clear View (C)"}
                onClick={toggleClearView}
                active={isClearView}
            />
            <ControlButton
                id="vc-popoutplus-fit-btn"
                icon={<FitIcon />}
                title="Auto Fit (A)"
                onClick={autoFitToVideo}
            />
            <ControlButton
                id="vc-popoutplus-fullscreen-btn"
                icon={<FullscreenIcon />}
                title={isFullscreen ? "Exit Fullscreen (F)" : "Fullscreen (F)"}
                onClick={toggleFullscreen}
                active={isFullscreen}
            />
        </div>
    );
};

