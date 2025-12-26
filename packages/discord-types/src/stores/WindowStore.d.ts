import { FluxStore } from "..";

export interface WindowSize {
    width: number;
    height: number;
}

export class WindowStore extends FluxStore {
    getFocusedWindowId(): string | null;
    getLastFocusedWindowId(): string;
    isAppFocused(): boolean;
    isElementFullScreen(): boolean;
    isFocused(): boolean;
    isVisible(): boolean;
    windowSize(): WindowSize;
}
