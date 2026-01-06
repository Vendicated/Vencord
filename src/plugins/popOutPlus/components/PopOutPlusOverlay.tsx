/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { PopoutWindowStore, React, useEffect, useRef, useState } from "@webpack/common";

import { usePopoutWindow } from "../hooks/usePopoutWindow";
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
        hideTimeoutRef.current = window.setTimeout(() => setIsVisible(false), 3000);
    };

    useEffect(() => {
        const win = PopoutWindowStore?.getWindow(popoutKey);
        if (!win) return;

        const doc = win.document;

        const handleMouseMove = () => showControls();
        const handleKeyDown = (e: KeyboardEvent) => {
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
        };

        const handleDblClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target.closest("#vc-popout-controls") || target.tagName === "BUTTON") return;
            toggleFullscreen();
        };

        doc.addEventListener("mousemove", handleMouseMove);
        doc.addEventListener("mouseenter", handleMouseMove);
        doc.addEventListener("keydown", handleKeyDown);
        doc.addEventListener("dblclick", handleDblClick);

        return () => {
            doc.removeEventListener("mousemove", handleMouseMove);
            doc.removeEventListener("mouseenter", handleMouseMove);
            doc.removeEventListener("keydown", handleKeyDown);
            doc.removeEventListener("dblclick", handleDblClick);
            if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        };
    }, [popoutKey, toggleFullscreen, togglePin, toggleClearView, autoFitToVideo]);

    // Dragging Logic
    const isDraggingRef = useRef(false);
    const dragStartRef = useRef({ x: 0, y: 0, winX: 0, winY: 0 });

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return;
        const win = PopoutWindowStore?.getWindow(popoutKey);
        if (!win) return;

        isDraggingRef.current = true;
        dragStartRef.current = {
            x: e.screenX,
            y: e.screenY,
            winX: win.screenX,
            winY: win.screenY
        };

        if (dragLayerRef.current) dragLayerRef.current.style.cursor = "grabbing";

        const handleMouseMove = (me: MouseEvent) => {
            if (!isDraggingRef.current) return;
            const deltaX = me.screenX - dragStartRef.current.x;
            const deltaY = me.screenY - dragStartRef.current.y;
            win.moveTo(dragStartRef.current.winX + deltaX, dragStartRef.current.winY + deltaY);
        };

        const handleMouseUp = () => {
            isDraggingRef.current = false;
            if (dragLayerRef.current) dragLayerRef.current.style.cursor = "grab";
            win.removeEventListener("mousemove", handleMouseMove);
            win.removeEventListener("mouseup", handleMouseUp);
        };

        win.addEventListener("mousemove", handleMouseMove);
        win.addEventListener("mouseup", handleMouseUp);
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        const win = PopoutWindowStore?.getWindow(popoutKey);
        if (!win || !dragLayerRef.current) return;

        dragLayerRef.current.style.pointerEvents = "none";
        const elementBelow = win.document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
        if (elementBelow) {
            const newEvent = new MouseEvent("contextmenu", {
                bubbles: true,
                cancelable: true,
                view: win,
                clientX: e.clientX,
                clientY: e.clientY,
                screenX: e.screenX,
                screenY: e.screenY,
                button: 2
            });
            elementBelow.dispatchEvent(newEvent);
        }
        setTimeout(() => {
            if (dragLayerRef.current) dragLayerRef.current.style.pointerEvents = "auto";
        }, 100);
        e.preventDefault();
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
