import { Stream } from "../types";

/**
 * Parse a Discord stream key into a Stream object.
 * Stream keys have formats like:
 * - "guild:guildId:channelId:ownerId"
 * - "call:channelId:ownerId"
 */
export function parseStreamKey(streamKey: string): Stream | null {
    if (!streamKey) return null;

    const parts = streamKey.split(":");

    if (parts[0] === "guild" && parts.length === 4) {
        return {
            streamType: parts[0],
            guildId: parts[1],
            channelId: parts[2],
            ownerId: parts[3]
        };
    } else if (parts[0] === "call" && parts.length === 3) {
        return {
            streamType: parts[0],
            guildId: null,
            channelId: parts[1],
            ownerId: parts[2]
        };
    }

    return null;
}
