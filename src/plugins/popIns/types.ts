// Stream data from Discord
export interface Stream {
    streamType: string;
    guildId: string | null;
    channelId: string;
    ownerId: string;
}

// Voice state change event from Flux
export interface VoiceStateChangeEvent {
    userId: string;
    channelId?: string;
    oldChannelId?: string;
}

// Discord's ApplicationStreamingStore interface
export interface ApplicationStreamingStore {
    getAllActiveStreamsForChannel: (channelId: string) => Stream[];
    getAnyStreamForUser: (userId: string) => Stream | null;
}

// Discord's ApplicationStreamPreviewStore interface
export interface ApplicationStreamPreviewStore {
    getPreviewURL: (guildId: string | null, channelId: string, ownerId: string) => Promise<string | null>;
}

// Discord's WindowStore extended interface
export interface ExtendedWindowStore {
    addChangeListener: (handler: () => void) => void;
    removeChangeListener: (handler: () => void) => void;
    getWindowKeys: () => string[];
    getWindow: (key: string) => Window | null;
}

// Context menu props for stream context
export interface StreamContextProps {
    stream: Stream;
}

// Context menu props for user context
export interface UserContextProps {
    user: { id: string; };
}

// Video pop-in configuration
export interface VideoPopInConfig {
    /** Unique key for the window */
    key: string;
    /** User/owner ID */
    ownerId: string;
    /** Loading text shown while finding video */
    loadingText: string;
    /** Document to search for video in */
    sourceDocument: Document;
    /** Icon to show if video not found */
    fallbackIcon: string;
    /** Message to show if video not found */
    fallbackMessage: string;
}

// Video copy configuration (subset used by CanvasCopy)
export interface VideoCopyConfig {
    /** User/owner ID for finding the video */
    ownerId: string;
    /** Document to search for video in */
    sourceDocument: Document;
    /** Icon to show if video not found */
    fallbackIcon: string;
    /** Message to show if video not found */
    fallbackMessage: string;
}
