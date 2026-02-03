/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { proxyLazyWebpack } from "@webpack";
import { Flux, FluxDispatcher } from "@webpack/common";

import { fetchAlbumArt } from "./AlbumArtService";
import { debugError, debugLog } from "./debugLog";
import { OptimisticMediaController, type StoreState, type WinampMediaAction } from "./OptimisticMediaController";
import { ConsecutiveFailuresError, type HTTPQConfig, type PlayerState, type RepeatMode, type Track, WinampClient } from "./WinampClient";

// Winamp-specific media action registry
const WINAMP_MEDIA_ACTIONS: Record<string, WinampMediaAction> = {
    prev: {
        clientMethod: (client: WinampClient) => client.prev(),
        optimisticUpdate: () => ({}), // No immediate state change needed
    },
    next: {
        clientMethod: (client: WinampClient) => client.next(),
        optimisticUpdate: () => ({}), // No immediate state change needed
    },
    setVolume: {
        clientMethod: (client: WinampClient, volume: number) => client.setVolume(volume),
        optimisticUpdate: (volume: number) => ({ volume }),
    },
    setPlaying: {
        clientMethod: (client: WinampClient, playing: boolean) => client[playing ? "play" : "pause"](),
        optimisticUpdate: (playing: boolean) => ({
            isPlaying: playing
        }),
        errorHandler: (error: unknown, playing: boolean) => ({
            isPlaying: !playing // Revert on error
        })
    },
    setRepeat: {
        clientMethod: (client: WinampClient, state: RepeatMode) => client.setRepeat(state),
        optimisticUpdate: (state: RepeatMode) => ({ repeat: state }),
    },
    setShuffle: {
        clientMethod: (client: WinampClient, state: boolean) => client.setShuffle(state),
        optimisticUpdate: (state: boolean) => ({ shuffle: state }),
    },
    seek: {
        clientMethod: (client: WinampClient, ms: number) => client.seekTo(ms),
        optimisticUpdate: (ms: number) => ({
            position: ms
        }),
    },
} as const;

// Don't wanna run before Flux and Dispatcher are ready!
export const WinampStore = proxyLazyWebpack(() => {
    // For some reason ts hates extends Flux.Store
    const { Store } = Flux;

    class WinampStore extends Store {
        // Store state now matches the UI-friendly types from winampClient
        public track: Track | null = null;
        public isPlaying = false;
        public repeat: RepeatMode = "off";
        public shuffle = false;
        public volume = 0;
        public position = 0;

        public isPollingEnabled = true; // Track if polling should be active
        public lastConsecutiveFailure: ConsecutiveFailuresError | null = null;

        private config: HTTPQConfig = {
            host: "127.0.0.1",
            port: 4800,
            password: "pass"
        };

        private client: WinampClient;
        private pollingInterval: number | null = null;
        private reconnectionInterval: number | null = null;
        private readonly POLLING_INTERVAL_MS = 1000; // Fast polling when connected
        private readonly RECONNECTION_INTERVAL_MS = 60000; // Slow check when disconnected (1 minute)

        // The optimistic media controller - handles all optimistic updates
        private optimisticController: OptimisticMediaController;

        // Track the last track ID to detect track changes for album art fetching
        private lastTrackId: string | null = null;

        constructor(dispatcher: any, actionHandlers: any) {
            super(dispatcher, actionHandlers);
            this.client = new WinampClient(this.config);

            // Initialize optimistic controller
            this.optimisticController = new OptimisticMediaController(
                this.client,
                WINAMP_MEDIA_ACTIONS,
                (update, isOptimistic) => this.applyStateUpdate(update, isOptimistic),
                () => this.getCurrentStoreState()
            );
        }

        // Get current store state for optimistic controller
        private getCurrentStoreState(): StoreState {
            return {
                track: this.track,
                isPlaying: this.isPlaying,
                repeat: this.repeat,
                shuffle: this.shuffle,
                volume: this.volume,
                position: this.position
            };
        }

        // Execute media action - now delegates to optimistic controller
        public async executeMediaAction(endpoint: string, args: any): Promise<any> {
            return this.optimisticController.executeMediaAction(endpoint, args);
        }

        // Helper to apply state updates and emit changes
        private applyStateUpdate(stateUpdate: Partial<StoreState>, isOptimistic = false) {
            Object.assign(this, stateUpdate);
            this.emitChange();
        }

        // Apply polling updates with optimistic controller's conflict resolution
        private applyPollingUpdate(pollingState: Partial<StoreState>, pollInitiatedAt: number) {
            const filteredUpdate = this.optimisticController.applyPollingUpdate(pollingState, pollInitiatedAt);

            if (Object.keys(filteredUpdate).length > 0) {
                Object.assign(this, filteredUpdate);
                this.emitChange();
            }
        }

        // Get current player state - now much simpler since client provides UI-ready data
        public async getCurrentState(): Promise<PlayerState | null> {
            try {
                return await this.client.getPlayerState();
            } catch (error) {
                // Re-throw ConsecutiveFailuresError so polling can handle it properly
                if (error instanceof ConsecutiveFailuresError) {
                    throw error;
                }
                debugError("WinampStore", "Failed to get current state:", error);
                return null;
            }
        }

        // Get complete playlist
        public async getPlaylist(): Promise<Track[]> {
            try {
                return await this.client.getPlaylist();
            } catch (error) {
                debugError("WinampStore", "Failed to get playlist:", error);
                return [];
            }
        }

        // Fetch album art for a track and update the store
        private async fetchAlbumArtForTrack(track: Track): Promise<void> {
            debugLog("WinampStore:AlbumArt", `Initiating fetch for track: "${track.artist}" - "${track.name}" (id=${track.id})`);

            try {
                const result = await fetchAlbumArt(track.artist, track.name, track.album);

                if (result) {
                    // Check if track is still current (might have changed during fetch)
                    if (this.track && this.track.id === track.id) {
                        debugLog("WinampStore:AlbumArt", `✓ Applying album art to store (source=${result.source})`);

                        // Update the track with album art
                        this.track = { ...this.track, albumArt: result.url };
                        this.emitChange();

                        // Also dispatch to Flux so components re-render
                        (FluxDispatcher as any).dispatch({
                            type: "WINAMP_ALBUM_ART_UPDATE",
                            trackId: track.id,
                            albumArt: result.url
                        });

                        debugLog("WinampStore:AlbumArt", "✓ Store updated and Flux dispatched");
                    } else {
                        debugLog("WinampStore:AlbumArt", `⚠ Track changed during fetch, discarding result (was=${track.id}, now=${this.track?.id ?? "null"})`);
                    }
                } else {
                    debugLog("WinampStore:AlbumArt", `✗ No album art found for "${track.artist}" - "${track.name}"`);
                }
            } catch (error) {
                debugError("WinampStore:AlbumArt", "✗ Fetch error:", error);
            }
        }

        // Start polling for player state updates
        public startStatePolling() {
            this.stopAllPolling();

            debugLog("WinampStore", "Starting state polling");
            this.isPollingEnabled = true;
            this.lastConsecutiveFailure = null;

            this.pollingInterval = window.setInterval(async () => {
                if (!this.isPollingEnabled) {
                    return;
                }

                const pollInitiatedAt = Date.now();

                // Clean up expired optimistic timestamps
                this.optimisticController.clearExpiredOptimisticTimestamps();

                try {
                    const state = await this.getCurrentState();
                    if (state) {
                        // Check if track changed and fetch album art if needed
                        const currentTrackId = state.track?.id ?? null;
                        if (currentTrackId !== this.lastTrackId) {
                            debugLog("WinampStore", `Track changed: "${this.lastTrackId}" → "${currentTrackId}"`);
                            this.lastTrackId = currentTrackId;

                            if (state.track) {
                                debugLog("WinampStore", `New track detected: "${state.track.artist}" - "${state.track.name}"`);
                                // Fetch album art asynchronously (don't block polling)
                                this.fetchAlbumArtForTrack(state.track);
                            }
                        }

                        // Preserve albumArt if track ID hasn't changed
                        let trackWithAlbumArt = state.track;
                        if (state.track && this.track && state.track.id === this.track.id && this.track.albumArt) {
                            trackWithAlbumArt = { ...state.track, albumArt: this.track.albumArt };
                        }

                        // Apply polling update with timestamp-based conflict resolution
                        const pollingState = {
                            track: trackWithAlbumArt,
                            volume: state.volume,
                            isPlaying: state.isPlaying,
                            repeat: state.repeat,
                            shuffle: state.shuffle,
                            position: state.position
                        };

                        // Get the filtered update that respects optimistic timestamps
                        const filteredFluxUpdate = this.optimisticController.getFilteredPollingUpdate(pollingState, pollInitiatedAt);

                        // Apply the filtered update to the store
                        this.applyPollingUpdate(pollingState, pollInitiatedAt);

                        // Dispatch ONLY the filtered data to Flux to prevent overriding optimistic updates
                        (FluxDispatcher as any).dispatch({
                            type: "WINAMP_PLAYER_STATE",
                            track: filteredFluxUpdate.track ?? this.track,
                            volume: filteredFluxUpdate.volume ?? this.volume,
                            isPlaying: filteredFluxUpdate.isPlaying ?? this.isPlaying,
                            repeat: filteredFluxUpdate.repeat ?? this.repeat,
                            shuffle: filteredFluxUpdate.shuffle ?? this.shuffle,
                            position: filteredFluxUpdate.position ?? this.position,
                            isConnected: state.isConnected
                        });
                    }
                } catch (error) {
                    if (error instanceof ConsecutiveFailuresError) {
                        debugLog("WinampStore", `Connection lost, switching to slow reconnection mode (checking every ${this.RECONNECTION_INTERVAL_MS / 1000}s)`);
                        this.lastConsecutiveFailure = error;
                        this.isPollingEnabled = false;

                        // Apply disconnected state
                        const disconnectedState = {
                            track: null,
                            volume: 0,
                            isPlaying: false,
                            repeat: "off" as RepeatMode,
                            shuffle: false,
                            position: 0
                        };

                        const disconnectedPollTime = Date.now();
                        this.applyPollingUpdate(disconnectedState, disconnectedPollTime);

                        // Dispatch disconnected state to Flux
                        (FluxDispatcher as any).dispatch({
                            type: "WINAMP_PLAYER_STATE",
                            track: null,
                            volume: 0,
                            isPlaying: false,
                            repeat: "off",
                            shuffle: false,
                            position: 0,
                            isConnected: false
                        });

                        // Stop fast polling and start slow reconnection checking
                        this.stopStatePolling();
                        this.startReconnectionPolling();
                    } else {
                        debugError("WinampStore", "Polling error:", error);
                    }
                }
            }, this.POLLING_INTERVAL_MS) as unknown as number;
        }

        // Start slow reconnection polling (checks once per minute when disconnected)
        private startReconnectionPolling() {
            if (this.reconnectionInterval) {
                clearInterval(this.reconnectionInterval);
            }

            debugLog("WinampStore", "Starting reconnection polling");

            this.reconnectionInterval = window.setInterval(async () => {
                const reconnected = await this.attemptReconnection();
                if (reconnected) {
                    debugLog("WinampStore", "Reconnected to Winamp, resuming normal polling");
                    this.stopReconnectionPolling();
                    this.startStatePolling();
                }
            }, this.RECONNECTION_INTERVAL_MS) as unknown as number;
        }

        // Stop reconnection polling
        private stopReconnectionPolling() {
            if (this.reconnectionInterval) {
                clearInterval(this.reconnectionInterval);
                this.reconnectionInterval = null;
                debugLog("WinampStore", "Stopped reconnection polling");
            }
        }

        // Stop all polling intervals
        private stopAllPolling() {
            if (this.pollingInterval) {
                clearInterval(this.pollingInterval);
                this.pollingInterval = null;
            }
            if (this.reconnectionInterval) {
                clearInterval(this.reconnectionInterval);
                this.reconnectionInterval = null;
            }
        }

        // Stop polling for player state updates
        public stopStatePolling() {
            if (this.pollingInterval) {
                clearInterval(this.pollingInterval);
                this.pollingInterval = null;
                debugLog("WinampStore", "Stopped state polling");
            }
        }

        // Stop all polling (both state and reconnection)
        public stopAllStatePolling() {
            this.stopStatePolling();
            this.stopReconnectionPolling();
            this.isPollingEnabled = false;
        }

        // Attempt to reconnect after consecutive failures
        public async attemptReconnection(): Promise<boolean> {
            try {
                // Reset the failure count silently before attempting
                this.client.resetFailureCount(true);

                // Test the connection - this is quiet, no logging unless successful
                const isConnected = await this.client.isConnected();

                if (isConnected) {
                    debugLog("WinampStore", "Reconnected to Winamp successfully");
                    this.isPollingEnabled = true;
                    this.lastConsecutiveFailure = null;
                    return true;
                }
                // Silent failure - we don't want to spam logs every minute
                return false;
            } catch {
                // Silent failure during reconnection attempts
                return false;
            }
        }

        // Get status of polling and last failure
        public getPollingStatus(): { isEnabled: boolean; lastFailure: ConsecutiveFailuresError | null; consecutiveFailures: number; } {
            return {
                isEnabled: this.isPollingEnabled,
                lastFailure: this.lastConsecutiveFailure,
                consecutiveFailures: this.client.getConsecutiveFailures()
            };
        }

        // Get current optimistic update state (for debugging) - delegates to controller
        public getOptimisticUpdateState(): Record<string, { timestamp: number; age: number; expectedValue: any; }> {
            return this.optimisticController.getOptimisticUpdateState();
        }

        // Configure httpQ connection
        public configure(config: Partial<HTTPQConfig>) {
            this.config = { ...this.config, ...config };

            // Recreate the client with new configuration
            this.client = new WinampClient(this.config);

            // Recreate optimistic controller with new client
            this.optimisticController = new OptimisticMediaController(
                this.client,
                WINAMP_MEDIA_ACTIONS,
                (update, isOptimistic) => this.applyStateUpdate(update, isOptimistic),
                () => this.getCurrentStoreState()
            );

            // Reset polling state when configuration changes
            this.isPollingEnabled = true;
            this.lastConsecutiveFailure = null;

            this.startStatePolling();
            debugLog("WinampStore", `Configured httpQ: ${this.config.host}:${this.config.port}`);
        }

        // Test httpQ connection
        public async testConnection(): Promise<boolean> {
            try {
                return await this.client.isConnected();
            } catch (error) {
                debugError("WinampStore", "httpQ connection failed:", error);
                return false;
            }
        }

        // Test httpQ connection with specific configuration
        public async testConfig(config: HTTPQConfig): Promise<boolean> {
            try {
                return await WinampClient.testConfig(config);
            } catch (error) {
                debugError("WinampStore", "httpQ configuration test failed:", error);
                return false;
            }
        }

        // Get connection state
        public getConnectionState(): boolean {
            return this.client.getConnectionState();
        }

        // Get current configuration
        public getConfig(): HTTPQConfig {
            return this.client.getConfig();
        }

        // Static method to test connection with given config
        static async testConnection(config: HTTPQConfig): Promise<boolean> {
            try {
                return await WinampClient.testConfig(config);
            } catch (error) {
                debugError("WinampStore", "Static connection test failed:", error);
                return false;
            }
        }
    }

    const store = new WinampStore(FluxDispatcher, {
        WINAMP_PLAYER_STATE(e: { track: Track | null; volume: number; isPlaying: boolean; repeat: RepeatMode; shuffle: boolean; position: number; isConnected: boolean; }) {
            store.track = e.track;
            store.isPlaying = e.isPlaying ?? false;
            store.volume = e.volume ?? 0;
            store.repeat = e.repeat || "off";
            store.shuffle = e.shuffle ?? false;
            store.position = e.position ?? 0;
            store.emitChange();
        },
        WINAMP_ALBUM_ART_UPDATE(e: { trackId: string; albumArt: string; }) {
            // Update album art on the current track if it matches
            if (store.track && store.track.id === e.trackId) {
                store.track = { ...store.track, albumArt: e.albumArt };
                store.emitChange();
            }
        }
    } as any);

    // Start polling when store is created
    store.startStatePolling();

    return store;
});

// Re-export types for convenience
export type { StoreState } from "./OptimisticMediaController";
export type { ConsecutiveFailuresError, HTTPQConfig, PlayerState, RepeatMode, Track } from "./WinampClient";
