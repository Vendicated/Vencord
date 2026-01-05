import { Stream, VideoPopInConfig } from "./types";

// CSS class prefix for all PopIn's styles
export const CLASS_PREFIX = "vc-pin";

// Generate window key for a stream popout
export function getStreamKey(stream: Stream): string {
    return `pin_${stream.channelId}_${stream.ownerId}`;
}

// Generate window key for a webcam popout
export function getWebcamKey(userId: string, channelId: string): string {
    return `pin_webcam_${channelId}_${userId}`;
}

// Create config for a stream pop-in
export function createStreamConfig(stream: Stream, sourceDocument: Document = document): VideoPopInConfig {
    return {
        key: getStreamKey(stream),
        ownerId: stream.ownerId,
        loadingText: "Finding stream...",
        sourceDocument,
        fallbackIcon: "⚠️",
        fallbackMessage: "Could not get the video<br><span style=\"font-size: 12px; opacity: 0.7;\">Please click \"Show Participants\" button<br>in Discord and try again.</span>"
    };
}

// Create config for a webcam pop-in
export function createWebcamConfig(userId: string, channelId: string, sourceDocument: Document = document): VideoPopInConfig {
    return {
        key: getWebcamKey(userId, channelId),
        ownerId: userId,
        loadingText: "Finding webcam...",
        sourceDocument,
        fallbackIcon: "📷",
        fallbackMessage: "Webcam video not found."
    };
}
