/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface NativeStreamConnection {
    context: string;
    userId: string;
    streamUserId?: string;
    conn: {
        setGoLiveDevices?: (options: { audioInputDeviceId: string; }) => void;
        clearGoLiveDevices?: () => void;
        clearDesktopSource?: () => void;
    };
    setSoundshareSource(id: number, active: boolean): void;
}

export interface NativeSource {
    desktopDescription?: { id: string | null; soundshareId: number; useLoopback: boolean; };
    cameraDescription?: unknown;
}

/** Uses the local stream connection, not the engine-wide microphone setter. */
export class NativeStreamAudio {
    private sessions = new Map<NativeStreamConnection, string>();

    prepare<T extends NativeSource>(connection: NativeStreamConnection, source: T, deviceId: string, available: boolean): T {
        if (connection.context !== "stream" || connection.streamUserId !== connection.userId) return source;
        if (!source.desktopDescription?.id || !deviceId) {
            this.release(connection);
            return source;
        }

        // This capability exists in Discord's camera-stream path. Availability
        // is checked explicitly because native modules update independently.
        if (!available || !connection.conn.setGoLiveDevices || !connection.conn.clearGoLiveDevices) {
            this.release(connection);
            connection.setSoundshareSource(0, false);
            connection.conn.clearDesktopSource?.();
            throw new Error(!available ? "The selected Stream Audio device is unavailable." : "This Discord version does not support the required stream audio interface.");
        }
        if (this.sessions.get(connection) !== deviceId) {
            this.release(connection);
            connection.setSoundshareSource(0, false);
            try {
                connection.conn.setGoLiveDevices({ audioInputDeviceId: deviceId });
                this.sessions.set(connection, deviceId);
            } catch (error) {
                connection.conn.clearGoLiveDevices();
                connection.conn.clearDesktopSource?.();
                throw error;
            }
        }
        return {
            ...source,
            desktopDescription: { ...source.desktopDescription, soundshareId: 0, useLoopback: false }
        };
    }

    release(connection: NativeStreamConnection) {
        if (!this.sessions.delete(connection)) return;
        connection.conn.clearGoLiveDevices?.();
    }

    stop() {
        for (const connection of [...this.sessions.keys()]) {
            try { this.release(connection); }
            finally { connection.conn.clearDesktopSource?.(); }
        }
    }

    removeUnavailable(available: Set<string>): boolean {
        let removed = false;
        for (const [connection, device] of this.sessions) {
            if (available.has(device)) continue;
            this.release(connection);
            connection.conn.clearDesktopSource?.();
            removed = true;
        }
        return removed;
    }
}
