import { UserStore } from "@webpack/common";

import { CLASS_PREFIX } from "../constants";
import { VideoPopInConfig } from "../types";
import { getTitleBarHeight } from "../utils/discordUI";
import { clearAllVideoMappings, clearVideoMapping } from "../utils/videoFinder";
import { startVideoCopy } from "./CanvasCopy";

// Module state
export const openWindows = new Map<string, HTMLDivElement>();
export let windowOffset = 0;
export let currentChannelId: string | null = null;
let topZIndex = 10000;

/**
 * Bring a window to front by giving it the highest z-index.
 */
function bringToFront(element: HTMLDivElement): void {
    topZIndex++;
    element.style.zIndex = String(topZIndex);
}

/**
 * Set the current channel ID (called by flux handlers).
 */
export function setCurrentChannelId(channelId: string | null): void {
    currentChannelId = channelId;
}

/**
 * Create a video pop-in window.
 */
export function createVideoPopIn(config: VideoPopInConfig): void {
    if (openWindows.has(config.key)) {
        return;
    }

    const container = createWindowElement(config.key);

    container.innerHTML = createWindowHTML(config.loadingText);

    document.body.appendChild(container);
    openWindows.set(config.key, container);

    makeDraggable(container);
    makeResizable(container);
    setupWindowControls(container, () => closeVideoPopIn(config.key, config.ownerId));

    startVideoCopy(container, {
        ownerId: config.ownerId,
        sourceDocument: config.sourceDocument,
        fallbackIcon: config.fallbackIcon,
        fallbackMessage: config.fallbackMessage
    });
}

/**
 * Close a video pop-in window by key.
 */
export function closeVideoPopIn(key: string, ownerId: string): void {
    const container = openWindows.get(key);
    if (!container) return;

    if ((container as any)._stopCopying) {
        (container as any)._stopCopying();
    }

    if ((container as any)._escKeyHandler) {
        document.removeEventListener("keydown", (container as any)._escKeyHandler);
    }

    clearVideoMapping(ownerId);
    container.remove();
    openWindows.delete(key);
}

/**
 * Close all open windows.
 */
export function closeAllWindows(): void {
    for (const [, container] of openWindows) {
        if ((container as any)._stopCopying) {
            (container as any)._stopCopying();
        }
        if ((container as any)._escKeyHandler) {
            document.removeEventListener("keydown", (container as any)._escKeyHandler);
        }
        container.remove();
    }

    openWindows.clear();
    clearAllVideoMappings();
    windowOffset = 0;
    topZIndex = 10000;
}

/**
 * Create the base window element.
 */
function createWindowElement(key: string): HTMLDivElement {
    const container = document.createElement("div");
    container.id = key;
    container.className = `${CLASS_PREFIX}-window`;
    container.style.top = `${100 + windowOffset * 30}px`;
    container.style.left = `${100 + windowOffset * 30}px`;
    windowOffset = (windowOffset + 1) % 10;
    return container;
}

/**
 * Create the inner HTML for a window.
 */
function createWindowHTML(loadingText: string): string {
    return `
        <div class="${CLASS_PREFIX}-content">
            <div class="${CLASS_PREFIX}-loading">${loadingText}</div>
        </div>
        <div class="${CLASS_PREFIX}-resize-handle ${CLASS_PREFIX}-resize-n"></div>
        <div class="${CLASS_PREFIX}-resize-handle ${CLASS_PREFIX}-resize-e"></div>
        <div class="${CLASS_PREFIX}-resize-handle ${CLASS_PREFIX}-resize-s"></div>
        <div class="${CLASS_PREFIX}-resize-handle ${CLASS_PREFIX}-resize-w"></div>
        <div class="${CLASS_PREFIX}-resize-handle ${CLASS_PREFIX}-resize-ne"></div>
        <div class="${CLASS_PREFIX}-resize-handle ${CLASS_PREFIX}-resize-se"></div>
        <div class="${CLASS_PREFIX}-resize-handle ${CLASS_PREFIX}-resize-sw"></div>
        <div class="${CLASS_PREFIX}-resize-handle ${CLASS_PREFIX}-resize-nw"></div>
        <div class="${CLASS_PREFIX}-controls">
            <button class="${CLASS_PREFIX}-btn ${CLASS_PREFIX}-maximize-btn">□</button>
            <button class="${CLASS_PREFIX}-btn ${CLASS_PREFIX}-close-btn">✕</button>
        </div>
    `;
}

/**
 * Setup window controls (maximize, close, ESC handler).
 */
function setupWindowControls(container: HTMLDivElement, onClose: () => void): void {
    let isFullscreen = false;

    const toggleMaximize = () => {
        isFullscreen = !isFullscreen;
        container.classList.toggle(`${CLASS_PREFIX}-maximized`);

        try {
            (DiscordNative as any).window.fullscreen();
        } catch (err) {
            // Failed to toggle OS fullscreen
        }
    };

    const exitFullscreen = () => {
        if (!isFullscreen) return;
        isFullscreen = false;
        container.classList.remove(`${CLASS_PREFIX}-maximized`);

        try {
            (DiscordNative as any).window.fullscreen();
        } catch (err) {
            // Failed to exit OS fullscreen
        }
    };

    const escKeyHandler = (e: KeyboardEvent) => {
        if (e.key === "Escape" && isFullscreen) {
            e.preventDefault();
            e.stopPropagation();
            exitFullscreen();
        }
    };

    document.addEventListener("keydown", escKeyHandler);
    (container as any)._escKeyHandler = escKeyHandler;

    container.addEventListener("dblclick", (e) => {
        if ((e.target as HTMLElement).closest(`.${CLASS_PREFIX}-controls`)) return;
        toggleMaximize();
    });

    const maxBtn = container.querySelector(`.${CLASS_PREFIX}-maximize-btn`) as HTMLButtonElement;
    maxBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleMaximize();
    });

    const closeBtn = container.querySelector(`.${CLASS_PREFIX}-close-btn`) as HTMLButtonElement;
    closeBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        onClose();
    });
}

/**
 * Make entire window draggable.
 */
function makeDraggable(element: HTMLDivElement): void {
    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;

    element.addEventListener("mousedown", (e) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains(`${CLASS_PREFIX}-close-btn`) ||
            target.classList.contains(`${CLASS_PREFIX}-resize-handle`)) {
            return;
        }

        bringToFront(element);

        isDragging = true;
        offsetX = e.clientX - element.offsetLeft;
        offsetY = e.clientY - element.offsetTop;
        element.style.cursor = "grabbing";
    });

    document.addEventListener("mousemove", (e) => {
        if (!isDragging) return;
        const titleBarHeight = getTitleBarHeight();
        element.style.left = `${Math.max(0, e.clientX - offsetX)}px`;
        element.style.top = `${Math.max(titleBarHeight, e.clientY - offsetY)}px`;
    });

    document.addEventListener("mouseup", () => {
        if (isDragging) {
            isDragging = false;
            element.style.cursor = "grab";
        }
    });
}

/**
 * Make window resizable from all edges.
 */
function makeResizable(element: HTMLDivElement): void {
    const handles = element.querySelectorAll(`.${CLASS_PREFIX}-resize-handle`);

    handles.forEach(handle => {
        let isResizing = false;
        let startX = 0;
        let startY = 0;
        let startWidth = 0;
        let startHeight = 0;
        let startLeft = 0;
        let startTop = 0;

        const direction = Array.from(handle.classList)
            .find(c => c.startsWith(`${CLASS_PREFIX}-resize-`) && c !== `${CLASS_PREFIX}-resize-handle`)
            ?.replace(`${CLASS_PREFIX}-resize-`, "") || "";

        handle.addEventListener("mousedown", ((e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();

            isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            startWidth = element.offsetWidth;
            startHeight = element.offsetHeight;
            startLeft = element.offsetLeft;
            startTop = element.offsetTop;

            const onMouseMove = (e: MouseEvent) => {
                if (!isResizing) return;

                const dx = e.clientX - startX;
                const dy = e.clientY - startY;

                if (direction.includes("e")) {
                    element.style.width = `${Math.max(200, startWidth + dx)}px`;
                }
                if (direction.includes("w")) {
                    const newWidth = Math.max(200, startWidth - dx);
                    element.style.width = `${newWidth}px`;
                    element.style.left = `${startLeft + (startWidth - newWidth)}px`;
                }
                if (direction.includes("s")) {
                    element.style.height = `${Math.max(150, startHeight + dy)}px`;
                }
                if (direction.includes("n")) {
                    const newHeight = Math.max(150, startHeight - dy);
                    element.style.height = `${newHeight}px`;
                    element.style.top = `${startTop + (startHeight - newHeight)}px`;
                }
            };

            const onMouseUp = () => {
                isResizing = false;
                document.removeEventListener("mousemove", onMouseMove);
                document.removeEventListener("mouseup", onMouseUp);
            };

            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
        }) as EventListener);
    });
}
