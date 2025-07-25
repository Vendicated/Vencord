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

        // The optimistic media controller - handles all optimistic updates
        private optimisticController: OptimisticMediaController;

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
                console.error("[WinampControls] Failed to get current state:", error);
                return null;
            }
        }

        // Get complete playlist
        public async getPlaylist(): Promise<Track[]> {
            try {
                return await this.client.getPlaylist();
            } catch (error) {
                console.error("[WinampControls] Failed to get playlist:", error);
                return [];
            }
        }

        // Start polling for player state updates
        public startStatePolling() {
            if (this.pollingInterval) {
                clearInterval(this.pollingInterval);
            }

            console.log("[WinampControls] Starting state polling");
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
                        // Apply polling update with timestamp-based conflict resolution
                        const pollingState = {
                            track: state.track,
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
                        console.error(`[WinampControls] Stopping polling due to consecutive failures: ${error.message}`);
                        this.lastConsecutiveFailure = error;
                        this.isPollingEnabled = false;

                        // Apply disconnected state with timestamp-based conflict resolution
                        const disconnectedState = {
                            track: null,
                            volume: 0,
                            isPlaying: false,
                            repeat: "off" as RepeatMode,
                            shuffle: false,
                            position: 0
                        };

                        const disconnectedPollTime = Date.now();
                        const filteredDisconnectedUpdate = this.optimisticController.getFilteredPollingUpdate(disconnectedState, disconnectedPollTime);

                        this.applyPollingUpdate(disconnectedState, disconnectedPollTime);

                        // Dispatch ONLY the filtered disconnected state to Flux
                        (FluxDispatcher as any).dispatch({
                            type: "WINAMP_PLAYER_STATE",
                            track: filteredDisconnectedUpdate.track ?? this.track,
                            volume: filteredDisconnectedUpdate.volume ?? this.volume,
                            isPlaying: filteredDisconnectedUpdate.isPlaying ?? this.isPlaying,
                            repeat: filteredDisconnectedUpdate.repeat ?? this.repeat,
                            shuffle: filteredDisconnectedUpdate.shuffle ?? this.shuffle,
                            position: filteredDisconnectedUpdate.position ?? this.position,
                            isConnected: false
                        });
                    } else {
                        console.error("[WinampControls] Polling error:", error);
                    }
                }
            }, 1000) as unknown as number; // Poll every second
        }

        // Stop polling for player state updates
        public stopStatePolling() {
            if (this.pollingInterval) {
                clearInterval(this.pollingInterval);
                this.pollingInterval = null;
                console.log("[WinampControls] Stopped state polling");
            }
            this.isPollingEnabled = false;
        }

        // Attempt to reconnect after consecutive failures
        public async attemptReconnection(): Promise<boolean> {
            try {
                console.log("[WinampControls] Attempting to reconnect...");

                // Reset the failure count on the client
                this.client.resetFailureCount();

                // Test the connection
                const isConnected = await this.client.isConnected();

                if (isConnected) {
                    console.log("[WinampControls] Reconnection successful, resuming polling");
                    this.isPollingEnabled = true;
                    this.lastConsecutiveFailure = null;
                    return true;
                } else {
                    console.log("[WinampControls] Reconnection failed");
                    return false;
                }
            } catch (error) {
                console.error("[WinampControls] Reconnection attempt failed:", error);
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
            console.log(`[WinampControls] Configured httpQ: ${this.config.host}:${this.config.port}`);
        }

        // Test httpQ connection
        public async testConnection(): Promise<boolean> {
            try {
                return await this.client.isConnected();
            } catch (error) {
                console.error("[WinampControls] httpQ connection failed:", error);
                return false;
            }
        }

        // Test httpQ connection with specific configuration
        public async testConfig(config: HTTPQConfig): Promise<boolean> {
            try {
                return await WinampClient.testConfig(config);
            } catch (error) {
                console.error("[WinampControls] httpQ configuration test failed:", error);
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
                console.error("[WinampStore] Static connection test failed:", error);
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
        }
    } as any);

    // Start polling when store is created
    store.startStatePolling();

    return store;
});

// Re-export types for convenience
export type { StoreState } from "./OptimisticMediaController";
export type { ConsecutiveFailuresError, HTTPQConfig, PlayerState, RepeatMode, Track } from "./WinampClient";
