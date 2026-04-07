import { FluxStore } from "..";

/**
 * Known popout window key constants.
 * Used as the key parameter for PopoutWindowStore and PopoutActions methods.
 */
export type PopoutWindowKey =
    | "DISCORD_CHANNEL_CALL_POPOUT"
    | "DISCORD_CALL_TILE_POPOUT"
    | "DISCORD_SOUNDBOARD"
    | "DISCORD_RTC_DEBUG_POPOUT"
    | "DISCORD_CHANNEL_POPOUT"
    | "DISCORD_ACTIVITY_POPOUT"
    | "DISCORD_OVERLAY_POPOUT"
    | "DISCORD_DEVTOOLS_POPOUT";

/**
 * Popout window lifecycle event types.
 * Sent via postMessage from popout to parent window.
 */
export type PopoutWindowEventType = "loaded" | "unloaded";

/**
 * Persisted window position and size state.
 * Saved to localStorage and restored when reopening popouts.
 */
export interface PopoutWindowState {
    /** window x position on screen in pixels. */
    x: number;
    /** window y position on screen in pixels. */
    y: number;
    /** window inner width in pixels. */
    width: number;
    /** window inner height in pixels. */
    height: number;
    /** whether window stays above other windows, only on desktop app. */
    alwaysOnTop?: boolean;
}

/**
 * Features passed to window.open() for popout configuration.
 * Merged with default features (menubar, toolbar, location, directories = false).
 */
export interface BrowserWindowFeatures {
    /** whether to show browser toolbar. */
    toolbar?: boolean;
    /** whether to show menu bar. */
    menubar?: boolean;
    /** whether to show location/address bar. */
    location?: boolean;
    /** whether to show directory buttons. */
    directories?: boolean;
    /** window width in pixels. */
    width?: number;
    /** window height in pixels. */
    height?: number;
    /** default width if no persisted state exists. */
    defaultWidth?: number;
    /** default height if no persisted state exists. */
    defaultHeight?: number;
    /** window left position in pixels. */
    left?: number;
    /** window top position in pixels. */
    top?: number;
    /** default always-on-top state, defaults to false. */
    defaultAlwaysOnTop?: boolean;
    /** whether window can be moved by user. */
    movable?: boolean;
    /** whether window can be resized by user. */
    resizable?: boolean;
    /** whether window has a frame/border. */
    frame?: boolean;
    /** whether window stays above other windows. */
    alwaysOnTop?: boolean;
    /** whether window has a shadow (macOS). */
    hasShadow?: boolean;
    /** whether window background is transparent. */
    transparent?: boolean;
    /** whether to hide window from taskbar. */
    skipTaskbar?: boolean;
    /** title bar style, null for default. */
    titleBarStyle?: string | null;
    /** window background color as hex string. */
    backgroundColor?: string;
    /** whether this is an out-of-process overlay window. */
    outOfProcessOverlay?: boolean;
}

/**
 * Manages Discord's popout windows (voice calls, activities, etc.).
 * Extends PersistedStore to save window positions across sessions.
 *
 * Handles Flux actions:
 * - POPOUT_WINDOW_OPEN: opens a new popout window
 * - POPOUT_WINDOW_CLOSE: closes a popout window
 * - POPOUT_WINDOW_SET_ALWAYS_ON_TOP: toggles always-on-top (desktop only)
 * - POPOUT_WINDOW_ADD_STYLESHEET: injects stylesheet into all open popouts
 * - LOGOUT: closes all popout windows
 */
export class PopoutWindowStore extends FluxStore {
    /**
     * Gets the Window object for a popout.
     * @param key unique identifier for the popout window
     * @returns Window reference or undefined if not open
     */
    getWindow(key: string): Window | undefined;

    /**
     * Gets persisted position/size state for a window.
     * State is saved when window closes and restored when reopened.
     * @param key unique identifier for the popout window
     * @returns saved state or undefined if never opened
     */
    getWindowState(key: string): PopoutWindowState | undefined;

    /**
     * Gets all currently open popout window keys.
     * @returns array of window key identifiers
     */
    getWindowKeys(): string[];

    /**
     * Checks if a popout window is currently open.
     * @param key unique identifier for the popout window
     * @returns true if window exists and is not closed
     */
    getWindowOpen(key: string): boolean;

    /**
     * Checks if a popout window has always-on-top enabled.
     * Only functional on desktop app (isPlatformEmbedded).
     * @param key unique identifier for the popout window
     * @returns true if always-on-top is enabled
     */
    getIsAlwaysOnTop(key: string): boolean;

    /**
     * Checks if a popout window's document has focus.
     * @param key unique identifier for the popout window
     * @returns true if window document has focus
     */
    getWindowFocused(key: string): boolean;

    /**
     * Checks if a popout window is visible (not minimized/hidden).
     * Uses document.visibilityState === "visible".
     * @param key unique identifier for the popout window
     * @returns true if window is visible
     */
    getWindowVisible(key: string): boolean;

    /**
     * Gets all persisted window states.
     * Keyed by window identifier, contains position/size data.
     * @returns record of window key to persisted state
     */
    getState(): Record<string, PopoutWindowState>;

    /**
     * Checks if a window is fully initialized and ready for rendering.
     * A window is fully initialized when it has:
     * - Window object created
     * - React root mounted
     * - Render function stored
     * @param key unique identifier for the popout window
     * @returns true if window is fully initialized
     */
    isWindowFullyInitialized(key: string): boolean;

    /**
     * Checks if a popout window is in fullscreen mode.
     * Checks if document.fullscreenElement.id === "app-mount".
     * @param key unique identifier for the popout window
     * @returns true if window is fullscreen
     */
    isWindowFullScreen(key: string): boolean;

    /**
     * Unmounts and closes a popout window.
     * Saves current position/size before closing.
     * Logs warning if window was not fully initialized.
     * @param key unique identifier for the popout window
     */
    unmountWindow(key: string): void;
}

/**
 * Actions for managing popout windows.
 * Dispatches Flux actions to PopoutWindowStore.
 */
export interface PopoutActions {
    /**
     * Opens a new popout window.
     * If window with key already exists and is not out-of-process:
     * - On desktop: focuses the existing window via native module
     * - On web: calls window.focus()
     * @param key unique identifier for the popout window
     * @param render function that returns React element to render, receives key as arg
     * @param features window features (size, position, etc.)
     */
    open(key: string, render: (key: string) => React.ReactNode, features?: BrowserWindowFeatures): void;

    /**
     * Closes a popout window.
     * Saves position/size state before closing unless preventPopoutClose setting is true.
     * @param key unique identifier for the popout window
     */
    close(key: string): void;

    /**
     * Sets always-on-top state for a popout window.
     * Only functional on desktop app (isPlatformEmbedded).
     * @param key unique identifier for the popout window
     * @param alwaysOnTop whether window should stay above others
     */
    setAlwaysOnTop(key: string, alwaysOnTop: boolean): void;

    /**
     * Note: Not actually in the Webpack Common. You have to add it yourself if you want to use it
     *
     * Injects a stylesheet into all open popout windows.
     * Validates origin matches current host or webpack public path.
     * @param url stylesheet URL to inject
     * @param integrity optional SRI integrity hash
     */
    addStylesheet?(url: string, integrity?: string): void;

    /**
     * Note: Not actually in the Webpack Common. You have to add it yourself if you want to use it
     *
     * Opens a channel call popout for voice/video calls.
     * Dispatches CHANNEL_CALL_POPOUT_WINDOW_OPEN action.
     * @param channel channel object to open call popout for
     */
    openChannelCallPopout?(channel: { id: string; }): void;

    /**
     * Note: Not actually in the Webpack Common. You have to add it yourself if you want to use it
     *
     * Opens a call tile popout for a specific participant.
     * Dispatches CALL_TILE_POPOUT_WINDOW_OPEN action.
     * @param channelId channel ID of the call
     * @param participantId user ID of the participant
     */
    openCallTilePopout?(channelId: string, participantId: string): void;
}
