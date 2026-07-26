import { FluxStore } from "..";

export interface WindowSize {
    width: number;
    height: number;
}

export class WindowStore extends FluxStore {
    /** returns focused window ID, or null if no window is focused */
    getFocusedWindowId(): string | null;
    getLastFocusedWindowId(): string;
    /** true if any window is focused (getFocusedWindowId() !== null) */
    isAppFocused(): boolean;
    /** @param windowId defaults to current window */
    isElementFullScreen(windowId?: string): boolean;
    /** @param windowId defaults to current window */
    isFocused(windowId?: string): boolean;
    /** @param windowId defaults to current window */
    isVisible(windowId?: string): boolean;
    /** @param windowId defaults to current window, returns {width: 0, height: 0} for invalid ID */
    windowSize(windowId?: string): WindowSize;
}
